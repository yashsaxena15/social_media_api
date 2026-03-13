from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PostSerializer, CommentSerializer
from .models import Post, Like, Comment
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema
# Create your views here.

@extend_schema(request=PostSerializer)  # for swagger to use Body - JSON 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_post(request):
    
    serializer = PostSerializer(data = request.data)

    if serializer.is_valid():
        serializer.save(user=request.user)  # it will bind the created post with logged in user and save in db
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_list(request):
    
    post = Post.objects.filter(user=request.user).select_related("user").prefetch_related("likes","comments") # get all the posts of currently logged in user

    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10
    # paginator.page_size_query_param = "limit" # by default drf uses page we can set manually also
    result_page = paginator.paginate_queryset(queryset=post, request=request)
    serializer = PostSerializer(instance = result_page, many = True, context = {"request": request}) # for sending request to serializer
    
    return paginator.get_paginated_response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_detail(request,post_id):
    
    try:
        post = Post.objects.get(id = post_id)
        
    except Post.DoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)

    serializer = PostSerializer(instance = post, context = {"request": request})
    
    return Response(serializer.data)

@extend_schema(request=PostSerializer) 
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_post(request, post_id):

    try :
        post = Post.objects.get(id = post_id)
        
    except Post.DoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    if post.user != request.user:  # this insure that user updating his own profile only
        return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)

    serializer = PostSerializer(instance = post, data = request.data, partial = True) # partial ---> update only provided fields

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_post(request, post_id):
    
    try :
        post = Post.objects.get(id = post_id)
    
    except Post.DoesNotExist:
        return Response({"error":"Post does not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if post.user != request.user:  # this insure that user updating his own profile only
        return Response({"error":"You cannot edit this post!"}, status= status.HTTP_403_FORBIDDEN)
    
    post.delete()

    return Response({"message":"Post deleted"}, status= status.HTTP_204_NO_CONTENT)

# ------Like Toggle ------

@api_view(['POST'])
@permission_classes([IsAuthenticated])

def toggle_like(request, post_id):

    post = get_object_or_404(Post, id = post_id) # give that post object or 404 error
    like = Like.objects.filter(user=request.user, post=post).first() # it will give us the first object of queryset and we check whether queryset is empty (None) or has an object

    # like = Like.objects.filter(user_id = request.user.id, post_id = post.id).first()  # we can also use this we are checking using user id and post id, user_id and post_id are auto created by django when any model has foreinkey relation with other.
    
    if like is not None:
        like.delete()
        return Response({"message":"Post disliked"}, status=status.HTTP_200_OK)
    else:
        Like.objects.create(user=request.user, post=post)
        return Response({"message":"Post liked"}, status=status.HTTP_201_CREATED)
    
# ------Comment Section------

@extend_schema(request=CommentSerializer) 
@api_view(['POST'])
@permission_classes([IsAuthenticated])

def create_comment(request, post_id):
    
    post = get_object_or_404(Post, id = post_id)
    
    serializer = CommentSerializer(data= request.data)
    
    if serializer.is_valid():
        serializer.save(user = request.user, post = post)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])

def get_comments(request, post_id):
    
    post = get_object_or_404(Post,id = post_id)
    comments = post.comments.all().order_by("-created_at")
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10

    result_page = paginator.paginate_queryset(queryset=comments, request=request)
    
    serializer = CommentSerializer(result_page, many = True)

    return paginator.get_paginated_response(serializer.data)

@extend_schema(request=CommentSerializer) 
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])

def update_comment(request, comment_id):
    
    comment = get_object_or_404(Comment, id = comment_id)

    if comment.user != request.user:
        return Response({"error":"You can't update this comment"}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = CommentSerializer(comment, data = request.data, partial = True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data) # Django by default sends 201 ok status on this
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])

def delete_comment(request, comment_id):
    
    comment = get_object_or_404(Comment, id = comment_id )

    if comment.user != request.user:
        return Response({"error":"You can't delete this comment"}, status=status.HTTP_403_FORBIDDEN)
    
    comment.delete()
    return Response({"message":"Comment deleted"}, status=status.HTTP_200_OK)

