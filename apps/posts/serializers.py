from .models import Post, Like
from rest_framework import serializers


class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source = "user.username",read_only=True) # this source is finding user.username inside post model
    like_count = serializers.SerializerMethodField() # "This field does not come directly from the model. Instead, call a method to compute its value."
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ['username','caption','image','like_count','is_liked','created_at','updated_at']
    
    def get_like_count(self, obj): # So DRF will look for a function named: get_<field_name>
        return obj.likes.count()  # obj is simply the current Post object.
    
    def get_is_liked(self, obj):
        
        request = self.context.get("request") # getting request 
        if request is not None and request.user.is_authenticated: # request.user.is_authenticated is boolean property gives True or False
            return obj.likes.filter(user=request.user).exists()  # checking this user exists in like table with this post or not
        return False
    
class LikeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Like
        fields = ['id','user','post','created_at']
        read_only_fields = ['user']   # Prevent client from editing model field
        # We don't want the client to send: "user":4