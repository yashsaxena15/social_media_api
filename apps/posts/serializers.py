from .models import Post, Like, Comment
from rest_framework import serializers

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
    like_count = serializers.SerializerMethodField() # "This field does not come directly from the model. Instead, call a method to compute its value."
    is_liked = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    # comments = CommentSerializer(many=True, read_only=True) # for displaying comments inside post serializer
    class Meta:
        model = Post
        fields = ['id','username','caption','image','like_count','is_liked','comment_count','created_at','updated_at']
    
    def get_like_count(self, obj): # So DRF will look for a function named: get_<field_name>
        return obj.likes.count()  # obj is simply the current Post object.
    
    def get_is_liked(self, obj):
        
        request = self.context.get("request") # getting request 
        if request is not None and request.user.is_authenticated: # request.user.is_authenticated is boolean property gives True or False
            return obj.likes.filter(user=request.user).exists()  # checking this user exists in like table with this post or not
        return False
    
    def get_comment_count(self, obj):
        return obj.comments.count()