from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Profile, User, Follow
from .serializers import (ProfileSerializer,RegisterSerializer,UserUpdateSerializer, 
                          FollowingSerializer, FollowerSerializer,
                          UserSerializer)
from rest_framework.permissions import IsAuthenticated,AllowAny
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
    profile_detail_cache_key,
)
from apps.posts.querysets import with_post_request_state

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
            serializer = ProfileSerializer(instance=profile)
            return Response(serializer.data)

        profiles = Profile.objects.all().select_related("user")
        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10
        result_page = paginator.paginate_queryset(profiles, request)
        serializer = ProfileSerializer(instance=result_page, many=True)
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
        serializer = ProfileSerializer(profile)

        response = Response(serializer.data)
        cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

        return response
    
    @extend_schema(request=ProfileSerializer) 
    def patch(self, request):

        profile = request.user.profile      # Get the current user profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            cache.delete(profile_detail_cache_key(request.user.id))
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

        response = Response({
            "id": request.user.id,
            "user": str(request.user),
            "username": str(request.user.username),
            "email": str(request.user.email)
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
    

# ----- Toggle Follow/ Unfollow (Follow → Unfollow → Follow) ------ 

@api_view(["POST"])
@permission_classes([IsAuthenticated])

def toggle_follow(request, user_id):
    
    user_to_follow = get_object_or_404(User, id = user_id)

    if request.user == user_to_follow :
        return Response({"errors":"You can't follow yourself!"}, status=status.HTTP_400_BAD_REQUEST    )
    
    follow = Follow.objects.filter(follower = request.user, following = user_to_follow).first()
    # this return a queryset for follower = request.user, following = user_to_follow <QuerySet [Follow object]> With .first(): it will give ----> Follow object

    if follow:
        follow.delete()
        invalidate_follow_caches(request.user.id, user_to_follow.id)
        return Response({"message":"Unfollowed"}, status=status.HTTP_200_OK)
    
    Follow.objects.create(follower = request.user, following = user_to_follow)
    invalidate_follow_caches(request.user.id, user_to_follow.id)

    return Response({"message":"Followed"}, status=status.HTTP_200_OK)

@api_view(["GET"])
def following_list(request, user_id):
    
    page = request.query_params.get("page", 1) # query_param is a parameter that is page and 1 is defualt page

    cache_key = f"user_following_{user_id}_page_{page}"
    cached_following = cache.get(cache_key)

    if cached_following is not None:
        return Response(cached_following)

    user = get_object_or_404(User, id = user_id)

    following = Follow.objects.filter(follower = user).select_related("following")
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10 # user can change ?limit=10 in url it prevent this.
    result_page = paginator.paginate_queryset(following, request)

    serializer = FollowingSerializer(result_page, many = True)
    
    response = paginator.get_paginated_response(serializer.data)

    cache.set(cache_key, response.data, timeout=CACHE_TIMEOUT)

    return response

    
@api_view(["GET"])
def follower_list(request, user_id):
    
    # redis caching applied
    page = request.query_params.get("page", 1)
    cache_key = f"user_follower_{user_id}_page_{page}"
    
    cached_follower = cache.get(cache_key)
    if cached_follower is not None:
        return Response(cached_follower)
    
    user = get_object_or_404(User, id = user_id)

    follower = Follow.objects.filter(following = user).select_related("follower") 
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10 
    result_page = paginator.paginate_queryset(follower, request) # it paginates the queryset
    serializer = FollowerSerializer(result_page, many = True)
    
    response = paginator.get_paginated_response(serializer.data)
    # Save only response.data (Important)
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
    ).distinct().only("id", "username", "first_name", "last_name", "email").order_by("username")

    posts = with_post_request_state(
        Post.objects.filter(caption__icontains=query).order_by("-created_at"), request.user
    )

    def paginated_data(queryset, serializer_class, context=None):
        paginator = PageNumberPagination()
        paginator.page_size = 5
        paginator.max_page_size = 10
        page = paginator.paginate_queryset(queryset, request)
        serializer = serializer_class(page, many=True, context=context or {})
        return paginator.get_paginated_response(serializer.data).data

    if search_type == "users":
        return Response(paginated_data(users, UserSerializer))

    if search_type == "posts":
        return Response(
            paginated_data(posts, PostSerializer, context={"request": request})
        )

    return Response(
        {
            "users": paginated_data(users, UserSerializer),
            "posts": paginated_data(posts, PostSerializer, context={"request": request}),
        }
    )


#-----Feed system-----


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
