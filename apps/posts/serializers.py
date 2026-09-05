from .models import Post, Like, Comment
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

class CommentSerializer(serializers.ModelSerializer):
    
    username = serializers.CharField(source = "user.username", read_only = True)
    profile_image = serializers.ImageField(source = "user.profile.profile_image", read_only = True)
    class Meta:
        model = Comment
        fields = ['id','username','profile_image','text','created_at']


class LikeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Like
        fields = ['id','user','post','created_at']
        read_only_fields = ['user']   # Prevent client from editing model field
        # We don't want the client to send: "user":4
        

class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source = "user.username",read_only=True) # this source is finding user.username inside post model
    profile_image = serializers.ImageField(source = "user.profile.profile_image", read_only = True)
    thumbnail = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    post_type = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField() # "This field does not come directly from the model. Instead, call a method to compute its value."
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    # comments = CommentSerializer(many=True, read_only=True) # for displaying comments inside post serializer
    class Meta:
        model = Post
        fields = ['id','username','profile_image','caption','image','thumbnail','images','post_type','like_count','is_liked','is_saved','comment_count','created_at','updated_at']
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_thumbnail(self, obj):
        target = obj.thumbnail or obj.image
        if not target:
            return None
        request = self.context.get("request")
        try:
            url = target.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_images(self, obj):
        request = self.context.get("request")
        post_images = list(obj.images.all())
        if post_images:
            result = []
            for pi in post_images:
                try:
                    img_url = request.build_absolute_uri(pi.image.url) if request else pi.image.url
                except Exception:
                    continue
                thumb_target = pi.thumbnail or pi.image
                try:
                    thumb_url = request.build_absolute_uri(thumb_target.url) if (request and thumb_target) else (thumb_target.url if thumb_target else None)
                except Exception:
                    thumb_url = img_url
                result.append({
                    "id": pi.id,
                    "image": img_url,
                    "thumbnail": thumb_url,
                })
            if result:
                return result

        if obj.image:
            try:
                img_url = request.build_absolute_uri(obj.image.url) if request else obj.image.url
            except Exception:
                return []
            thumb_target = obj.thumbnail or obj.image
            try:
                thumb_url = request.build_absolute_uri(thumb_target.url) if (request and thumb_target) else (thumb_target.url if thumb_target else None)
            except Exception:
                thumb_url = img_url
            return [
                {
                    "id": obj.id,
                    "image": img_url,
                    "thumbnail": thumb_url,
                }
            ]
        return []

    @extend_schema_field(serializers.CharField())
    def get_post_type(self, obj):
        has_image = bool(obj.image) or (hasattr(obj, "images") and obj.images.exists())
        return "post" if has_image else "tweet"

    @extend_schema_field(serializers.IntegerField())
    def get_like_count(self, obj): # So DRF will look for a function named: get_<field_name>
        return obj.likes.count()  # obj is simply the current Post object.
    
    @extend_schema_field(serializers.BooleanField())
    def get_is_liked(self, obj):
        request_user_liked = getattr(obj, "request_user_liked", None)
        if request_user_liked is not None:
            return request_user_liked

        request = self.context.get("request")
        if request is not None and request.user.is_authenticated: # request.user.is_authenticated is boolean property gives True or False
            return obj.likes.filter(user=request.user).exists()  # checking this user exists in like table with this post or not
        return False

    @extend_schema_field(serializers.BooleanField())
    def get_is_saved(self, obj):
        request_user_saved = getattr(obj, "request_user_saved", None)
        if request_user_saved is not None:
            return request_user_saved

        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            return obj.saved_by.filter(user=request.user).exists()
        return False
    
    @extend_schema_field(serializers.IntegerField())
    def get_comment_count(self, obj):
        return obj.comments.count()
