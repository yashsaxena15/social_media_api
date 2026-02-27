from django.urls import path
from .views import (profile_list,profile_detail,
                    profile_update,profile_delete,register_user,
                    test_user,delete_user,update_user)


urlpatterns = [
    # Profile Section --> 
    
    path("profile-list/",profile_list),
    
    # path("profile-create/",profile_create), # No longer use because we are using Auto Profile creation when user created

    path("profile/<int:user_id>/",profile_detail),
    path("profile-update/<int:user_id>/",profile_update),
    path("profile-delete/<int:user_id>/",profile_delete),

    # User Section -->
    
    path("register/", register_user),  # Register user url
    path("delete-user/", delete_user),
    path("update-user/", update_user),
    
    path("me/", test_user),
]
