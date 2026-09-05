from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PostSerializer, CommentSerializer
from .models import Post, Like, Comment
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from django.core.cache import cache
from apps.cache import (
    CACHE_TIMEOUT,
    invalidate_comment_list_cache,
    invalidate_post_caches,
    post_detail_cache_key,
)
from apps.users.permissions import can_view_user_content
from apps.users.models import Notification
from .querysets import with_post_request_state

from rest_framework.exceptions import ValidationError as DRFValidationError
from apps.common.image_optimizer import optimize_post_image

User = get_user_model()



class PostListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    @extend_schema(request=PostSerializer)
    def post(self, request):  # create post
        raw_image = request.FILES.get("image")
        if not raw_image and hasattr(request.data, "get"):
            candidate = request.data.get("image")
            if hasattr(candidate, "read"):
                raw_image = candidate

        optimized_image = None
        thumbnail_image = None

        if raw_image:
            try:
                optimized_image, thumbnail_image = optimize_post_image(raw_image)
            except DRFValidationError as e:
                return Response({"image": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response(
                    {"image": [f"Failed to process image: {str(e)}"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = PostSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            save_kwargs = {"user": request.user}
            if optimized_image:
                save_kwargs["image"] = optimized_image
            if thumbnail_image:
                save_kwargs["thumbnail"] = thumbnail_image

            post = serializer.save(**save_kwargs)
            invalidate_post_caches(post.id, post.user_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="page", description="Page number", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="username", description="Filter posts by author username", required=False, type=OpenApiTypes.STR),
            OpenApiParameter(name="user_id", description="Filter posts by author user ID", required=False, type=OpenApiTypes.INT),
        ]
    )
    def get(self, request):
        page = request.query_params.get("page", 1)
        username = request.query_params.get("username")
        user_id = request.query_params.get("user_id")

        if username:
            target_user = get_object_or_404(User, username=username)
        elif user_id:
            target_user = get_object_or_404(User, id=user_id)
        else:
            target_user = None

        if target_user:
            if not can_view_user_content(request.user, target_user):
                return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)
            if target_user == request.user:
                cache_key = f"post_list_{target_user.id}_page_{page}"
            else:
                cache_key = f"post_list_{target_user.id}_viewer_{request.user.id}_page_{page}"
            queryset = Post.objects.filter(user=target_user).order_by("-created_at")
        else:
            cache_key = f"post_list_all_viewer_{request.user.id}_page_{page}"
            if request.user.is_authenticated:
                queryset = Post.objects.filter(
                    Q(user__profile__is_private=False)
                    | Q(user=request.user)
                    | Q(user__followers__follower=request.user)
                ).distinct().order_by("-created_at")
            else:
                queryset = Post.objects.filter(user__profile__is_private=False).order_by("-created_at")

        cached_postList = cache.get(cache_key)
        if cached_postList is not None:
            return Response(cached_postList)

        posts = with_post_request_state(queryset, request.user)

        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10
        result_page = paginator.paginate_queryset(queryset=posts, request=request)
        serializer = PostSerializer(instance=result_page, many=True, context={"request": request})
        
        response = paginator.get_paginated_response(serializer.data)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

        return response


class PostDetailUpdateDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):

        cache_key = post_detail_cache_key(post_id, request.user.id)
        cached_detail = cache.get(cache_key)

        if cached_detail is not None: 
            return Response(cached_detail)

        post = get_object_or_404(
            with_post_request_state(Post.objects.all(), request.user), id=post_id
        )

        if not can_view_user_content(request.user, post.user):
            return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostSerializer(post, context={"request": request})

        response = Response(serializer.data)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

        return response

    @extend_schema(request=PostSerializer)
 
    def patch(self, request, post_id):

        post = get_object_or_404(Post, id=post_id)
        
        if post.user != request.user:  # Ensure user modifies only their own post
            return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)

        raw_image = request.FILES.get("image")
        if not raw_image and hasattr(request.data, "get"):
            candidate = request.data.get("image")
            if hasattr(candidate, "read"):
                raw_image = candidate

        optimized_image = None
        thumbnail_image = None

        if raw_image:
            try:
                optimized_image, thumbnail_image = optimize_post_image(raw_image)
            except DRFValidationError as e:
                return Response({"image": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response(
                    {"image": [f"Failed to process image: {str(e)}"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = PostSerializer(instance = post, data = request.data, partial = True, context = {"request": request}) # partial ---> update only provided fields

        if serializer.is_valid():
            save_kwargs = {}
            if optimized_image:
                save_kwargs["image"] = optimized_image
            if thumbnail_image:
                save_kwargs["thumbnail"] = thumbnail_image

            serializer.save(**save_kwargs)
            invalidate_post_caches(post.id, post.user_id)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, post_id):
        
        post = get_object_or_404(Post, id=post_id)
        
        if post.user != request.user:  # this insure that user updating his own profile only
            return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)
        
        invalidate_post_caches(post.id, post.user_id)
        post.delete()
        
        return Response({"message":"Post deleted"}, status= status.HTTP_204_NO_CONTENT)


# ------Like Toggle ------

@api_view(['POST'])
@permission_classes([IsAuthenticated])

def toggle_like(request, post_id):

    post = get_object_or_404(Post, id=post_id)
    if not can_view_user_content(request.user, post.user):
        return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)

    like = Like.objects.filter(user=request.user, post=post).first() 
    
    if like is not None:
        like.delete()
        Notification.objects.filter(
            recipient=post.user,
            sender=request.user,
            notification_type="like",
            post=post
        ).delete()
        invalidate_post_caches(post.id, post.user_id)
        return Response({"message":"Post disliked"}, status=status.HTTP_200_OK)
    else:
        Like.objects.create(user=request.user, post=post)
        if request.user != post.user:
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                notification_type="like",
                post=post
            )
        invalidate_post_caches(post.id, post.user_id)
        return Response({"message":"Post liked"}, status=status.HTTP_201_CREATED)
    
# ------Comment Section------

class CommentListCreateView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(request=CommentSerializer) 
    def post(self, request, post_id):
    
        post = get_object_or_404(Post, id=post_id)
        if not can_view_user_content(request.user, post.user):
            return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CommentSerializer(data=request.data)
        
        if serializer.is_valid():
            comment = serializer.save(user=request.user, post=post)
            if request.user != post.user:
                Notification.objects.create(
                    recipient=post.user,
                    sender=request.user,
                    notification_type="comment",
                    post=post,
                    comment=comment
                )
            invalidate_comment_list_cache(post_id)
            invalidate_post_caches(post.id, post.user_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def get(self, request, post_id):
        
        post = get_object_or_404(Post, id=post_id)
        if not can_view_user_content(request.user, post.user):
            return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)

        page = request.query_params.get("page", 1)

        cache_key = f"comment_list_{post_id}_page_{page}"

        cached_comments = cache.get(cache_key)
        if cached_comments is not None:
            return Response(cached_comments)
        
        comments = post.comments.select_related("user__profile").order_by("-created_at")
        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10

        result_page = paginator.paginate_queryset(queryset=comments, request=request)
        serializer = CommentSerializer(result_page, many=True, context={"request": request})
        response = paginator.get_paginated_response(serializer.data)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)
       
        return response
    
class CommentUpdateDeleteView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(request=CommentSerializer) 
    def patch(self, request, post_id=None, comment_id=None):
        if comment_id is None:
            comment_id = post_id
            comment = get_object_or_404(Comment, id=comment_id)
        else:
            comment = get_object_or_404(Comment, id=comment_id, post_id=post_id)
        
        target_post_id = comment.post_id
        if comment.user != request.user:
            return Response({"error":"You can't update this comment"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CommentSerializer(comment, data=request.data, partial=True, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            invalidate_comment_list_cache(target_post_id)
            invalidate_post_caches(comment.post_id, comment.post.user_id)
            return Response(serializer.data) # Django by default sends 200 ok status on this
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, post_id=None, comment_id=None):
        if comment_id is None:
            comment_id = post_id
            comment = get_object_or_404(Comment, id=comment_id)
        else:
            comment = get_object_or_404(Comment, id=comment_id, post_id=post_id)
            
        target_post_id = comment.post_id
        if comment.user != request.user:
            return Response({"error":"You can't delete this comment"}, status=status.HTTP_403_FORBIDDEN)

        invalidate_comment_list_cache(target_post_id)
        invalidate_post_caches(comment.post_id, comment.post.user_id)
        Notification.objects.filter(comment=comment).delete()
        comment.delete()
        return Response({"message":"Comment deleted"}, status=status.HTTP_204_NO_CONTENT)
