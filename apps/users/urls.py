from django.urls import path
from .views import (profile_list,
                    profile_update,my_profile,register_user,
                    test_user,delete_user,update_user,logout_user,
                    toggle_follow, following_list, follower_list)


urlpatterns = [
    # Profile Section --> 
    
    path("profile-list/",profile_list),
    
    # path("profile-create/",profile_create), # No longer use because we are using Auto Profile creation when user created

    # path("profile/me/",profile_detail),
    path("profile/",my_profile),
    # path("profile-update/<int:user_id>/",profile_update),
    path("profile-update/",profile_update),
    # path("profile-delete/<int:user_id>/",profile_delete),  # We are not implementing this because of using this profile delete but user remains, user delete then profile auto delete 

    # User Section -->
    
    path("register/", register_user),  # Register user url
    path("update-user/", update_user),
    path("logout-user/", logout_user),
    path("delete-user/", delete_user),
    
    # For checking who logged in!
    
    path("me/", test_user), 
    
    # Follow system --> 
    
    path("follow/<int:user_id>/", toggle_follow),
    path("following-list/<int:user_id>/", following_list),
    path("follower-list/<int:user_id>/", follower_list),
    
]
