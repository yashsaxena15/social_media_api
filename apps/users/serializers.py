from rest_framework import serializers
from .models import Profile, Follow, FollowRequest, Notification
from .permissions import can_view_user_content
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
    is_following = serializers.SerializerMethodField()
    is_requested = serializers.SerializerMethodField()
    can_view_content = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            "user_id", "username", "email", "full_name", "bio", "profile_image",
            "is_private", "dob", "gender", "followers_count", "following_count", "posts_count",
            "is_following", "is_requested", "can_view_content"
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_followers_count(self, obj):
        return obj.user.followers.count()
    
    @extend_schema_field(serializers.IntegerField())
    def get_following_count(self, obj):
        return obj.user.following.count()

    @extend_schema_field(serializers.IntegerField())
    def get_posts_count(self, obj):
        return obj.user.posts.count()

    @extend_schema_field(serializers.BooleanField())
    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(follower=request.user, following=obj.user).exists()

    @extend_schema_field(serializers.BooleanField())
    def get_is_requested(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return False
        return FollowRequest.objects.filter(
            requester=request.user, target=obj.user, status="pending"
        ).exists()

    @extend_schema_field(serializers.BooleanField())
    def get_can_view_content(self, obj):
        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request else None
        return can_view_user_content(viewer, obj.user)


User = get_user_model() # → returns YOUR custom User, Give me whichever User model this project uses.

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    full_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=200, required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Profile.GENDER_CHOICES, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "full_name", "bio", "dob", "gender"]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "")
        bio = validated_data.pop("bio", "")
        dob = validated_data.pop("dob", None)
        gender = validated_data.pop("gender", None)

        user = User.objects.create_user(**validated_data)

        # Profile is created via post_save signal; update it with profile details
        profile, _ = Profile.objects.get_or_create(user=user)
        updated = False
        if full_name:
            profile.full_name = full_name
            updated = True
        if bio:
            profile.bio = bio
            updated = True
        if dob:
            profile.dob = dob
            updated = True
        if gender:
            profile.gender = gender
            updated = True
        if updated:
            profile.save()

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
    is_private = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "profile_image", "is_private"]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_profile_image(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None

    @extend_schema_field(serializers.BooleanField())
    def get_is_private(self, obj):
        profile = getattr(obj, "profile", None)
        return bool(profile and profile.is_private)


class FollowRequestSerializer(serializers.ModelSerializer):
    requester_id = serializers.IntegerField(source="requester.id", read_only=True)
    requester_username = serializers.CharField(source="requester.username", read_only=True)
    requester_full_name = serializers.CharField(source="requester.profile.full_name", read_only=True)
    requester_profile_image = serializers.SerializerMethodField()
    target_username = serializers.CharField(source="target.username", read_only=True)

    class Meta:
        model = FollowRequest
        fields = [
            "id", "requester_id", "requester_username", "requester_full_name",
            "requester_profile_image", "target_username", "status", "created_at"
        ]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_requester_profile_image(self, obj):
        profile = getattr(obj.requester, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None


class NotificationSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_full_name = serializers.CharField(source="sender.profile.full_name", read_only=True)
    sender_profile_image = serializers.SerializerMethodField()
    sender_is_following = serializers.SerializerMethodField()
    follow_request_id = serializers.IntegerField(source="follow_request.id", read_only=True, allow_null=True)
    follow_request_status = serializers.CharField(source="follow_request.status", read_only=True, allow_null=True)
    post_id = serializers.IntegerField(source="post.id", read_only=True, allow_null=True)
    post_image = serializers.SerializerMethodField()
    post_caption = serializers.CharField(source="post.caption", read_only=True, allow_null=True)
    comment_text = serializers.CharField(source="comment.text", read_only=True, allow_null=True)
    grouped_senders = serializers.SerializerMethodField()
    total_like_count = serializers.SerializerMethodField()
    notification_ids = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "recipient_id", "sender_id", "sender_username", "sender_full_name",
            "sender_profile_image", "sender_is_following", "notification_type",
            "follow_request_id", "follow_request_status", "post_id", "post_image",
            "post_caption", "comment_text", "grouped_senders", "total_like_count",
            "notification_ids", "is_read", "created_at"
        ]

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_sender_profile_image(self, obj):
        profile = getattr(obj.sender, "profile", None)
        if profile and profile.profile_image:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(profile.profile_image.url)
            return profile.profile_image.url
        return None

    @extend_schema_field(serializers.BooleanField())
    def get_sender_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        cached_follows = self.context.get("user_following_ids")
        if cached_follows is not None:
            return obj.sender_id in cached_follows
        return Follow.objects.filter(follower=request.user, following=obj.sender).exists()

    @extend_schema_field(serializers.ImageField(allow_null=True))
    def get_post_image(self, obj):
        post = getattr(obj, "post", None)
        if post:
            target = post.thumbnail or post.image
            if target:
                request = self.context.get("request")
                if request is not None:
                    return request.build_absolute_uri(target.url)
                return target.url
        return None

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_grouped_senders(self, obj):
        return getattr(obj, "grouped_senders", [])

    @extend_schema_field(serializers.IntegerField())
    def get_total_like_count(self, obj):
        return getattr(obj, "total_like_count", 1 if obj.notification_type == "like" else 0)

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_notification_ids(self, obj):
        return getattr(obj, "notification_ids", [obj.id])