from django.db import models
from django.contrib.auth.models import AbstractUser  

# Create your models here.

# Backend Flow -->
# Model → Serializer → View → URL

class User(AbstractUser):  # it is use for creating custom user giving us more fields like username,email,password,first_name etc.
    pass                   # if we use django's defualt user -->
                           # 1.) You cannot modify it later easily
                           # 2.) Adding custom fields becomes painful
                           # 3.) Can break project
                           

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE,related_name="profile")
    full_name = models.CharField(max_length=100)
    bio = models.CharField(blank=True, max_length=200)
    profile_image = models.ImageField(upload_to="profiles/",blank=True,null=True)


    def __str__(self):
        return self.full_name
    