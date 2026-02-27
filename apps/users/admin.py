from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Profile,User

admin.site.register(Profile)  # to do add Profile models in admin panel
# admin.site.register(User)  # we can't do it like that 

@admin.register(User)   
class CustomUserAdmin(UserAdmin): # this for custom user 
    pass

