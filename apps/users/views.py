from django.shortcuts import render,get_object_or_404
from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Profile
from .serializers import ProfileSerializer,RegisterSerializer,UserUpdateSerializer
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework_simplejwt.tokens import RefreshToken


# Create your views here.

# -------- GET ALL PROFILES --------

@api_view(["GET"]) # that means client sending GET request
@permission_classes([AllowAny]) # Anyone can access 
def profile_list(request): # request is an object representing the incoming request from the client.
    
    profiles = Profile.objects.all() # fetching all the objects/ profiles from the model Profile 
    serializer = ProfileSerializer(instance = profiles,many = True) # many is used to send multiple objects to serializer
    
    return Response(serializer.data)

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

@api_view(["POST"])
def register_user(request):
    
    serializer = RegisterSerializer(data = request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,status=201)
    return Response(serializer.errors, status=400)

# -------- Update User --------
    
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

