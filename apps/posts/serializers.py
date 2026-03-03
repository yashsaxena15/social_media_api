from .models import Post
from rest_framework import serializers

class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source = "user.username",read_only=True) # this source is finding user.username inside post model
    class Meta:
        model = Post
        fields = ['username','caption','image','created_at','updated_at']