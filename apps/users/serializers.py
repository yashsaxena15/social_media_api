from rest_framework import serializers
from .models import Profile, Follow
from django.contrib.auth import get_user_model  # Returns the active User model of your project.

# serializer works for reading and deserializer works for writing
class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username",read_only = True)  # for adding username field in my profile view
    email = serializers.CharField(source = "user.email",read_only = True)
    
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        # fields = "__all__"
        fields = ["username","email","full_name", "bio", "profile_image","followers_count","following_count"]

    def get_followers_count(self, obj):
        return obj.user.followers.count()
    
    def get_following_count(self, obj):
        return obj.user.following.count()


User = get_user_model() # → returns YOUR custom User, Give me whichever User model this project uses.

class RegisterSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = User
        fields = ["username","password"]
        extra_kwargs = {
            "password":{"write_only":True} # ✔ client can SEND password
                                           #❌ password will NEVER appear in response
        }
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)  #create_user used for hashes password, sets defaults, safe authentication
                                                        
        return user
    
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username","first_name","last_name","email"]

class FollowSerializer(serializers.ModelSerializer):

    class Meta:
        model = Follow
        fields = ["id", "follower","following","created_at"]

class FollowingSerializer(serializers.ModelSerializer): # we have created two serializer for displaying following and follower users
    
    following = serializers.CharField(source = "following.username", read_only = True) # this following.username comes from models following field that has relationship with user model that has username field

    class Meta:
        model = Follow
        fields = ["id", "following", "created_at"]

class FollowerSerializer(serializers.ModelSerializer):
    
    follower = serializers.CharField(source = "follower.username", read_only = True)

    class Meta:
        model = Follow
        fields = ["id", "follower", "created_at"]
        