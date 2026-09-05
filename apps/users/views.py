from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Profile, User, Follow, FollowRequest, Notification
from .serializers import (ProfileSerializer, RegisterSerializer, UserUpdateSerializer, 
                          FollowingSerializer, FollowerSerializer,
                          UserSerializer, FollowRequestSerializer, NotificationSerializer)
from .permissions import can_view_user_content
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.pagination import PageNumberPagination
from apps.posts.models import Post
from apps.posts.serializers import PostSerializer
from django.db.models import Q

# for adding query parameter documentation
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.views import APIView

from django.core.cache import cache
from apps.cache import (
    CACHE_TIMEOUT,
    invalidate_follow_caches,
    invalidate_privacy_caches,
    profile_detail_cache_key,
)
from apps.posts.querysets import with_post_request_state
from rest_framework.exceptions import ValidationError as DRFValidationError
from apps.common.image_optimizer import optimize_avatar_image

# -------- GET ALL PROFILES --------

class ProfileListView(APIView):
    
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get("username")
        
        if username:
            # Direct lookup by exact username — used by frontend profile pages
            profile = Profile.objects.filter(user__username=username).select_related("user").first()
            if not profile:
                return Response({"detail": "Profile not found."}, status=404)
            serializer = ProfileSerializer(instance=profile, context={"request": request})
            return Response(serializer.data)

        profiles = Profile.objects.all().select_related("user")
        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10
        result_page = paginator.paginate_queryset(profiles, request)
        serializer = ProfileSerializer(instance=result_page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


# -------- Detail, Update profile --------

class ProfileDetailUpdateView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    # Get the current user profile
    def get(self, request):

        cache_key = profile_detail_cache_key(request.user.id)
        cached_detail = cache.get(cache_key)
        if cached_detail:
            return Response(cached_detail)

        profile = request.user.profile
        serializer = ProfileSerializer(profile, context={"request": request})

        response = Response(serializer.data)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

        return response
    
    @extend_schema(request=ProfileSerializer) 
    def patch(self, request):

        profile = request.user.profile      # Get the current user profile
        old_is_private = profile.is_private

        raw_avatar = request.FILES.get("profile_image")
        if not raw_avatar and hasattr(request.data, "get"):
            candidate = request.data.get("profile_image")
            if hasattr(candidate, "read"):
                raw_avatar = candidate

        optimized_avatar = None
        if raw_avatar:
            try:
                optimized_avatar = optimize_avatar_image(raw_avatar)
            except DRFValidationError as e:
                return Response({"profile_image": e.detail}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response(
                    {"profile_image": [f"Failed to process image: {str(e)}"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = ProfileSerializer(profile, data=request.data, partial=True, context={"request": request})

        if serializer.is_valid():
            save_kwargs = {}
            if optimized_avatar:
                save_kwargs["profile_image"] = optimized_avatar

            updated_profile = serializer.save(**save_kwargs)
            new_is_private = updated_profile.is_private

            # If switching from private to public, auto-accept all pending requests
            if old_is_private and not new_is_private:
                pending_requests = FollowRequest.objects.filter(target=request.user, status="pending")
                for req in pending_requests:
                    Follow.objects.get_or_create(follower=req.requester, following=request.user)
                    req.status = "accepted"
                    req.save()
                    invalidate_follow_caches(req.requester_id, request.user.id)
                Notification.objects.filter(recipient=request.user, notification_type="follow_request").update(is_read=True)

            invalidate_privacy_caches(request.user.id)
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


# -------- Detail, Create, Update, Delete User --------

class UserDetailCreateUpdateDeleteView(APIView):
    
    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get(self, request):

        cache_key = f"user_detail_{request.user.id}"
        cached_detail = cache.get(cache_key)

        if cached_detail:
            return Response(cached_detail)

        profile_img = None
        if hasattr(request.user, "profile") and request.user.profile.profile_image:
            profile_img = request.build_absolute_uri(request.user.profile.profile_image.url)

        response = Response({
            "id": request.user.id,
            "user": str(request.user),
            "username": str(request.user.username),
            "email": str(request.user.email),
            "profile_image": profile_img,
        })

        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

        return response

    @extend_schema(request=RegisterSerializer) 
    def post(self, request):
        
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    @extend_schema(request=UserUpdateSerializer) 
    def patch(self, request):
        
        user = request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            cache.delete(f"user_detail_{request.user.id}")  # it will delete old cache when user update their profile 
            return Response(serializer.data)
        
        return Response(serializer.errors, status=400)
    
    def delete(self, request):
        
        user = request.user # currently logged-in user
        user_id = user.id
        
        user.delete()
        cache.delete(f"user_detail_{user_id}")
        return Response({'message': "User deleted successfully"}, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_user(request):
    
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response({"message": "Logged out successfully"})
    except Exception:
        return Response({"error":"Invalid Token"}, status=400)
    

# ----- Toggle Follow/ Unfollow / Follow Request ------ 

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_follow(request, user_id):
    user_to_follow = get_object_or_404(User, id=user_id)

    if request.user == user_to_follow:
        return Response({"errors": "You can't follow yourself!"}, status=status.HTTP_400_BAD_REQUEST)
    
    # 1. If already actively following -> Unfollow
    follow = Follow.objects.filter(follower=request.user, following=user_to_follow).first()
    if follow:
        follow.delete()
        Notification.objects.filter(
            recipient=user_to_follow,
            sender=request.user,
            notification_type="follow"
        ).delete()
        invalidate_follow_caches(request.user.id, user_to_follow.id)
        return Response({"message": "Unfollowed", "status": "none"}, status=status.HTTP_200_OK)
    
    # 2. Check if target account is private
    target_profile = getattr(user_to_follow, "profile", None)
    is_private = bool(target_profile and target_profile.is_private)

    if is_private:
        # Check if pending request exists -> Cancel request
        pending_req = FollowRequest.objects.filter(
            requester=request.user, target=user_to_follow, status="pending"
        ).first()
        if pending_req:
            Notification.objects.filter(follow_request=pending_req).delete()
            pending_req.delete()
            return Response({"message": "Follow request cancelled", "status": "none"}, status=status.HTTP_200_OK)
        
        # Create pending follow request
        follow_req, _ = FollowRequest.objects.update_or_create(
            requester=request.user,
            target=user_to_follow,
            defaults={"status": "pending"}
        )
        Notification.objects.create(
            recipient=user_to_follow,
            sender=request.user,
            notification_type="follow_request",
            follow_request=follow_req
        )
        return Response({"message": "Follow request sent", "status": "requested"}, status=status.HTTP_200_OK)

    # 3. Target is public -> Follow immediately
    _, created = Follow.objects.get_or_create(follower=request.user, following=user_to_follow)
    if created:
        Notification.objects.create(
            recipient=user_to_follow,
            sender=request.user,
            notification_type="follow"
        )
    invalidate_follow_caches(request.user.id, user_to_follow.id)

    return Response({"message": "Followed", "status": "following"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_follower(request, user_id=None):
    target_user_id = user_id or request.data.get("user_id")
    target_username = request.data.get("username")

    if target_user_id:
        follower_user = get_object_or_404(User, id=target_user_id)
    elif target_username:
        follower_user = get_object_or_404(User, username=target_username)
    else:
        return Response({"error": "User ID or username is required."}, status=status.HTTP_400_BAD_REQUEST)

    if request.user == follower_user:
        return Response({"error": "You cannot remove yourself as a follower."}, status=status.HTTP_400_BAD_REQUEST)

    follow = Follow.objects.filter(follower=follower_user, following=request.user).first()
    if not follow:
        return Response({"error": "This user is not following you."}, status=status.HTTP_400_BAD_REQUEST)

    follow.delete()

    Notification.objects.filter(
        recipient=request.user,
        sender=follower_user,
        notification_type__in=["follow", "follow_request"]
    ).delete()
    Notification.objects.filter(
        recipient=follower_user,
        sender=request.user,
        notification_type="follow_accepted"
    ).delete()
    FollowRequest.objects.filter(requester=follower_user, target=request.user).delete()

    invalidate_follow_caches(follower_user.id, request.user.id)

    return Response(
        {
            "message": f"Successfully removed {follower_user.username} from your followers.",
            "user_id": follower_user.id,
            "username": follower_user.username,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_follow_request(request, request_id):
    follow_req = get_object_or_404(FollowRequest, id=request_id)

    if request.user != follow_req.target:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    if follow_req.status != "pending":
        return Response({"error": "Request already handled"}, status=status.HTTP_400_BAD_REQUEST)

    Follow.objects.get_or_create(follower=follow_req.requester, following=request.user)
    follow_req.status = "accepted"
    follow_req.save()
    invalidate_follow_caches(follow_req.requester_id, request.user.id)

    # Mark the follow request notification as read
    Notification.objects.filter(follow_request=follow_req).update(is_read=True)

    # Send notification to requester that their request was accepted
    Notification.objects.create(
        recipient=follow_req.requester,
        sender=request.user,
        notification_type="follow_accepted"
    )

    return Response({"message": "Follow request accepted", "status": "accepted"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_follow_request(request, request_id):
    follow_req = get_object_or_404(FollowRequest, id=request_id)

    if request.user != follow_req.target:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    if follow_req.status != "pending":
        return Response({"error": "Request already handled"}, status=status.HTTP_400_BAD_REQUEST)

    follow_req.status = "rejected"
    follow_req.save()

    # Mark the follow request notification as read
    Notification.objects.filter(follow_request=follow_req).update(is_read=True)

    return Response({"message": "Follow request rejected", "status": "rejected"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_follow_request(request, request_id):
    follow_req = get_object_or_404(FollowRequest, id=request_id)

    if request.user != follow_req.requester:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    Notification.objects.filter(follow_request=follow_req).delete()
    follow_req.delete()

    return Response({"message": "Follow request cancelled", "status": "none"}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    filter_param = request.query_params.get("filter", "all").lower()

    if filter_param in ["pending_requests", "pending", "requests_sent"]:
        pending_requests = (
            FollowRequest.objects.filter(requester=request.user, status="pending")
            .select_related("target__profile")
            .order_by("-created_at")
        )
        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginator.max_page_size = 50
        result_page = paginator.paginate_queryset(pending_requests, request)

        serialized_items = []
        for req in result_page:
            target_profile = getattr(req.target, "profile", None)
            target_image = None
            if target_profile and target_profile.profile_image:
                target_image = request.build_absolute_uri(target_profile.profile_image.url)

            serialized_items.append({
                "id": req.id,
                "recipient_id": req.target_id,
                "sender_id": req.target_id,
                "sender_username": req.target.username,
                "sender_full_name": target_profile.full_name if target_profile else "",
                "sender_profile_image": target_image,
                "sender_is_following": False,
                "notification_type": "pending_request_sent",
                "follow_request_id": req.id,
                "follow_request_status": "pending",
                "post_id": None,
                "post_image": None,
                "post_caption": None,
                "comment_text": None,
                "grouped_senders": [],
                "total_like_count": 0,
                "notification_ids": [],
                "is_read": True,
                "created_at": req.created_at.isoformat(),
            })

        response = paginator.get_paginated_response(serialized_items)
        response.data["unread_count"] = 0
        return response

    base_qs = (
        Notification.objects.filter(recipient=request.user)
        .select_related("sender__profile", "follow_request", "post", "comment")
        .order_by("-created_at")
    )
    unread_count = base_qs.filter(is_read=False).count()

    if filter_param == "comments":
        base_qs = base_qs.filter(notification_type="comment")
    elif filter_param == "follows":
        base_qs = base_qs.filter(notification_type__in=["follow", "follow_request", "follow_accepted"])
    elif filter_param == "likes":
        base_qs = base_qs.filter(notification_type="like")

    raw_notifications = list(base_qs[:100])

    # Group like notifications on the same post
    grouped_list = []
    seen_like_posts = {}

    for notif in raw_notifications:
        if notif.notification_type == "like" and notif.post_id:
            post_id = notif.post_id
            if post_id in seen_like_posts:
                target_idx = seen_like_posts[post_id]
                target_notif = grouped_list[target_idx]
                target_notif.notification_ids.append(notif.id)
                target_notif.total_like_count += 1
                if notif.sender.username not in target_notif.grouped_senders:
                    target_notif.grouped_senders.append(notif.sender.username)
                if not notif.is_read:
                    target_notif.is_read = False
            else:
                notif.notification_ids = [notif.id]
                notif.total_like_count = 1
                notif.grouped_senders = [notif.sender.username]
                seen_like_posts[post_id] = len(grouped_list)
                grouped_list.append(notif)
        else:
            notif.notification_ids = [notif.id]
            notif.total_like_count = 0
            notif.grouped_senders = []
            grouped_list.append(notif)

    user_following_ids = set(
        Follow.objects.filter(follower=request.user).values_list("following_id", flat=True)
    )

    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginator.max_page_size = 50
    result_page = paginator.paginate_queryset(grouped_list, request)

    serializer = NotificationSerializer(
        result_page,
        many=True,
        context={"request": request, "user_following_ids": user_following_ids}
    )
    response = paginator.get_paginated_response(serializer.data)
    response.data["unread_count"] = unread_count
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    notification_ids = request.data.get("notification_ids")
    notification_id = request.data.get("notification_id")
    if notification_ids and isinstance(notification_ids, list):
        Notification.objects.filter(id__in=notification_ids, recipient=request.user).update(is_read=True)
    elif notification_id:
        Notification.objects.filter(id=notification_id, recipient=request.user).update(is_read=True)
    else:
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"message": "Notifications marked as read"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def following_list(request, user_id):
    user = get_object_or_404(User, id=user_id)

    if not can_view_user_content(request.user, user):
        return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)
    
    page = request.query_params.get("page", 1)
    viewer_id = request.user.id if request.user.is_authenticated else "anon"
    cache_key = f"user_following_{user_id}_viewer_{viewer_id}_page_{page}"
    cached_following = cache.get(cache_key)

    if cached_following is not None:
        return Response(cached_following)

    following = Follow.objects.filter(follower=user).select_related("following__profile").order_by("-created_at")
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10
    result_page = paginator.paginate_queryset(following, request)

    serializer = FollowingSerializer(result_page, many=True, context={"request": request})
    response = paginator.get_paginated_response(serializer.data)
    cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

    return response

    
@api_view(["GET"])
def follower_list(request, user_id):
    user = get_object_or_404(User, id=user_id)

    if not can_view_user_content(request.user, user):
        return Response({"detail": "This account is private."}, status=status.HTTP_403_FORBIDDEN)
    
    page = request.query_params.get("page", 1)
    viewer_id = request.user.id if request.user.is_authenticated else "anon"
    cache_key = f"user_follower_{user_id}_viewer_{viewer_id}_page_{page}"
    
    cached_follower = cache.get(cache_key)
    if cached_follower is not None:
        return Response(cached_follower)

    follower = Follow.objects.filter(following=user).select_related("follower__profile").order_by("-created_at")
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10 
    result_page = paginator.paginate_queryset(follower, request)
    serializer = FollowerSerializer(result_page, many=True, context={"request": request})
    
    response = paginator.get_paginated_response(serializer.data)
    cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

    return response


#-----Global Search----

@extend_schema(   # for displaying param fields in swagger ui
    parameters=[
        OpenApiParameter(
            name = "q",
            description="Search query",
            required=True, # query param is required 
            type=OpenApiTypes.STR,
        ),
        OpenApiParameter(
            name = "type",
            description="Filter results (users or posts)",
            required=False,  # applying filter is not mandatory
            type=OpenApiTypes.STR,
            enum=["users", "posts"],  # Swagger will show a dropdown selector instead of a free text field.
        ),
    ]
)


@api_view(['GET'])
def global_search(request):
    query = request.query_params.get("q")
    search_type = request.query_params.get("type")
    if search_type:
        search_type = search_type.lower()

    if not query:
        return Response({"error":"Search query required"}, status=status.HTTP_400_BAD_REQUEST)

    if search_type not in {None, "users", "posts"}:
        return Response({"errors": "Invalid search type"}, status= status.HTTP_400_BAD_REQUEST)

    users = User.objects.filter(
        Q(username__icontains=query)
        | Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
    ).distinct().select_related("profile").order_by("username")

    if request.user.is_authenticated:
        allowed_posts = Post.objects.filter(
            Q(user__profile__is_private=False)
            | Q(user=request.user)
            | Q(user__followers__follower=request.user)
        ).distinct()
    else:
        allowed_posts = Post.objects.filter(user__profile__is_private=False)

    posts = with_post_request_state(
        allowed_posts.filter(caption__icontains=query).order_by("-created_at"), request.user
    )

    def paginated_data(queryset, serializer_class, context=None):
        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10
        page = paginator.paginate_queryset(queryset, request)
        serializer = serializer_class(page, many=True, context=context or {})
        return paginator.get_paginated_response(serializer.data).data

    if search_type == "users":
        return Response(paginated_data(users, UserSerializer, context={"request": request}))

    if search_type == "posts":
        return Response(
            paginated_data(posts, PostSerializer, context={"request": request})
        )

    return Response(
        {
            "users": paginated_data(users, UserSerializer, context={"request": request}),
            "posts": paginated_data(posts, PostSerializer, context={"request": request}),
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])

def feed(request):
    
    # cache_key = f"user_feed_{request.user.id}"
    page = request.query_params.get("page", 1)
    cache_key = f"user_feed_{request.user.id}_page_{page}"
    
    cached_feed = cache.get(cache_key)

    # If cache exists, return cached response
    if cached_feed is not None:
        return Response(cached_feed)
    
    following_users = Follow.objects.filter(follower = request.user)
    following_users_list = following_users.values_list("following", flat=True) # values_list → returns only ids and flat = True means simple integer [2, 5, 9]

    posts = with_post_request_state(
        Post.objects.filter(user__in=following_users_list).order_by("-created_at"),
        request.user,
    )
    # it is getting posts of conataing user id from [2,5,9]
    # and order by newest first
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10
    result_page = paginator.paginate_queryset(posts, request)

    serializer = PostSerializer(result_page, many = True, context = {"request": request})

    response = paginator.get_paginated_response(serializer.data)
    
    # Store in Redis cache for 60 seconds
    cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)
    
    return response
