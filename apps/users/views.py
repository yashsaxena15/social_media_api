from django.shortcuts import render,get_object_or_404
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Profile, User, Follow
from .serializers import (ProfileSerializer,RegisterSerializer,UserUpdateSerializer, 
                          FollowSerializer, FollowingSerializer, FollowerSerializer,
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

# Create your views here.

# -------- GET ALL PROFILES --------

@api_view(["GET"]) # that means client sending GET request
@permission_classes([AllowAny]) # Anyone can access 
def profile_list(request): # request is an object representing the incoming request from the client.
    
    profiles = Profile.objects.all().select_related("user") # fetching all the objects/ profiles from the model Profile 
    # select_relted used if relation is onetoone or onetomany 
    # for many to many prefetch_related()
    paginator = PageNumberPagination() # we have write it manually in FBV to paginate views by creating queryset
    paginator.page_size = 5
    paginator.max_page_size = 10
    result_page = paginator.paginate_queryset(profiles, request)
    serializer = ProfileSerializer(instance = result_page,many = True) # many is used to send multiple objects to serializer
    
    return paginator.get_paginated_response(serializer.data)

# -------- CREATE PROFILE --------

# @api_view(["POST"])   # No longer use because we are using Auto Profile creation when user created
# @permission_classes([IsAuthenticated])
# def profile_create(request):
    
#     serializer = ProfileSerializer(data = request.data) # Data coming from client, it converts JSON data to python objects, DeSerialization
#     # it has ProfileSerializer(instance=None, data=None) ---> instance for reading and data for sending/ writing
    
#     if serializer.is_valid(): # Checks: required fields, correct types, model constraints
#         serializer.save() # Creates database record.
#         return Response(serializer.data, status=status.HTTP_201_CREATED)
    
#     else:
#         return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

# -------- GET PROFILE --------

# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def profile_detail(request, user_id):
    
#     # profile = get_object_or_404(Profile,user=user_id) # Automatic 
#     try:                                                # Manual way 
#         profile = Profile.objects.get(user=user_id)
#     except Profile.DoesNotExist:
#         return Response({"error": "Profile not found"}, status=404)
    

#     serializer = ProfileSerializer(profile)

#     return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])   # Get the current user profile
def my_profile(request):

    profile = request.user.profile
    serializer = ProfileSerializer(profile)

    return Response(serializer.data)

# -------- UPDATE PROFILE --------

# @api_view(["PATCH"])
# @permission_classes([IsAuthenticated])
# def profile_update(request, user_id):
    
#     profile = get_object_or_404(Profile,user=user_id)

#     serializer = ProfileSerializer(profile,data = request.data, partial = True) # partial = True --> means only update these fields that provided

#     if serializer.is_valid():
#         serializer.save()
#         return Response(serializer.data)
#     return Response(serializer.errors,status=400)

@extend_schema(request=ProfileSerializer) 
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])

def profile_update(request):

    profile = request.user.profile      # Get the current user profile

    serializer = ProfileSerializer(
        profile,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)


# -------- DELETE PROFILE --------

# @api_view(["DELETE"])                 # We are not implementing this because of using this profile delete but user remains, user delete then profile auto delete 
# @permission_classes([IsAuthenticated])
# def profile_delete(request, user_id):
    
#     try:
#         profile = Profile.objects.get(user=user_id)
#     except Profile.DoesNotExist:
#         return Response({"error":"User not found"},status=404)

#     profile.delete()

#     return Response({"message":"Profile deleted successfully"}, status=204)

# -------- Register User --------

@extend_schema(request=RegisterSerializer) 
@api_view(["POST"])
def register_user(request):
    
    serializer = RegisterSerializer(data = request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=201)
    return Response(serializer.errors, status=400)


# -------- Update User --------
    
@extend_schema(request=RegisterSerializer) 
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_user(request):
    
    user = request.user
    serializer = UserUpdateSerializer(user,data = request.data,partial = True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status = 400)

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

# -------- Delete User --------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_user(request):
    
    user = request.user # currently logged-in user
    user.delete()

    return Response({'message':"User deleted successfully"},status=200)
    
# -------- Check Who logged in --------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def test_user(request):

    print(request.user)

    return Response({"user": str(request.user), "username": str(request.user.username), "email": str(request.user.email)})


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
        return Response({"message":"Unfollowed"}, status=status.HTTP_200_OK)
    
    Follow.objects.create(follower = request.user, following = user_to_follow)

    return Response({"message":"Followed"}, status=status.HTTP_201_CREATED)

@api_view(["GET"])
def following_list(request, user_id):
    
    user = get_object_or_404(User, id = user_id)

    following = Follow.objects.filter(follower = user).select_related("follower")
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10 # user can change ?limit=10 in url it prevent this.
    result_page = paginator.paginate_queryset(following, request)

    serializer = FollowingSerializer(result_page, many = True)
    
    return paginator.get_paginated_response(serializer.data)

    
@api_view(["GET"])
def follower_list(request, user_id):
    
    user = get_object_or_404(User, id = user_id)

    follower = Follow.objects.filter(following = user).select_related("following") 
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10 
    result_page = paginator.paginate_queryset(follower) # it paginates the queryset
    serializer = FollowerSerializer(result_page, many = True)
    
    return paginator.get_paginated_response(serializer.data)


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
    
    query = request.query_params.get("q")  # coming query from query param 'q
    search_type = request.query_params.get("type")   # coming query form query param 'type'
    if search_type:
        search_type = search_type.lower() # Also work for type=POSTS, type=Posts, type=posts
        
    # if query is None or query == "":  # detailed version
    if not query:
        return Response({"error":"Search query required"}, status=status.HTTP_400_BAD_REQUEST)
    
    users = (User.objects.filter(Q(username__icontains = query) | Q(first_name__icontains = query) | Q(last_name__icontains = query) ).distinct().only("id", "username", "first_name", "last_name")[0:5]) # distinct() → avoids duplicate, rowsonly() → loads only necessary columns, [:5] → limits results early
    # Q operator used to use OR, AND, NOT logical things to filter queries
    
    posts = Post.objects.filter(caption__icontains = query).select_related("user").prefetch_related("likes", "comments").order_by("-created_at")  # filtering posts according to query

    # select_related("user") → join user table
    # prefetch_related("likes", "comments") → fetch related objects efficiently
    # order_by("-created_at") → newest posts first
    # This avoids N+1 queries when serializers access:
    
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10
    paginated_posts = paginator.paginate_queryset(posts, request)
    
    users_serializer = UserSerializer(instance = users, many=True)
    posts_serializer = PostSerializer(instance = paginated_posts, many = True)

    if not search_type:
        return paginator.get_paginated_response({  # it will send paginated response
            "users": users_serializer.data,
            "posts": posts_serializer.data
        })
        
    elif search_type == "posts":
        return paginator.get_paginated_response({"posts": posts_serializer.data})
    
    elif search_type == "users":
        return paginator.get_paginated_response({"users": users_serializer.data})
    
    elif search_type != "posts" and search_type != "users": # or just else 
        return Response({"errors": "Invalid search type"}, status= status.HTTP_400_BAD_REQUEST)


#-----Feed system-----


@api_view(['GET'])
@permission_classes([IsAuthenticated])

def feed(request):
    
    following_users = Follow.objects.filter(follower = request.user)
    following_users_list = following_users.values_list("following", flat=True) # values_list → returns only ids and flat = True means simple integer [2, 5, 9]

    posts = Post.objects.filter(user__in = following_users_list).order_by('-created_at')
    # it is getting posts of conataing user id from [2,5,9]
    # and order by newest first
    paginator = PageNumberPagination()
    paginator.page_size = 5
    paginator.max_page_size = 10
    result_page = paginator.paginate_queryset(posts, request)

    serializer = PostSerializer(result_page, many = True)

    return paginator.get_paginated_response(serializer.data)
