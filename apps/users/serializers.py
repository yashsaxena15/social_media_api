from rest_framework import serializers
from .models import Profile
from django.contrib.auth import get_user_model  # Returns the active User model of your project.

# serializer works for reading and deserializer works for writing
class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username",read_only = True)  # for adding username field in my profile view
    email = serializers.CharField(source = "user.email",read_only = True)
    
    class Meta:
        model = Profile
        # fields = "__all__"
        fields = ["username","email","full_name", "bio", "profile_image"]

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
        