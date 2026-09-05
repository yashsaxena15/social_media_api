from rest_framework import serializers
from .models import Profile, Follow
from django.contrib.auth import get_user_model  # Returns the active User model of your project.

from drf_spectacular.utils import extend_schema_field

# serializer works for reading and deserializer works for writing
class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)  # needed by frontend for follow API calls
    
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = ["user_id", "username", "email", "full_name", "bio", "profile_image", "followers_count", "following_count", "posts_count"]

    @extend_schema_field(serializers.IntegerField())
    def get_followers_count(self, obj):
        return obj.user.followers.count()
    
    @extend_schema_field(serializers.IntegerField())
    def get_following_count(self, obj):
        return obj.user.following.count()

    @extend_schema_field(serializers.IntegerField())
    def get_posts_count(self, obj):
        return obj.user.posts.count()


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

class FollowingSerializer(serializers.ModelSerializer):
    following = serializers.CharField(source="following.username", read_only=True)
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = ["id", "following", "profile_image", "created_at"]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_profile_image(self, obj):
        profile = getattr(obj.following, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None

class FollowerSerializer(serializers.ModelSerializer):
    follower = serializers.CharField(source="follower.username", read_only=True)
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = ["id", "follower", "profile_image", "created_at"]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_profile_image(self, obj):
        profile = getattr(obj.follower, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None
        
class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "profile_image"]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_profile_image(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None