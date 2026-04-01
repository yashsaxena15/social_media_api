from django.urls import path
from .views import (logout_user,
                    toggle_follow, following_list, follower_list,
                    global_search, feed, ProfileDetailUpdateView,
                    ProfileListView, UserDetailCreateUpdateDeleteView)


urlpatterns = [
    # Profile Section --> 

    path("profiles/", ProfileListView.as_view()), 
    path("profile/me/", ProfileDetailUpdateView.as_view()),  # update, detail 
    
    # User Section -->
    
    path("users/me/", UserDetailCreateUpdateDeleteView.as_view()), # detail, create, update, delete user
    path("logout-user/", logout_user),
    
    # Follow system --> 
    
    path("users/<int:user_id>/follow/", toggle_follow),
    path("users/<int:user_id>/following/", following_list),
    path("users/<int:user_id>/follower/", follower_list),
    
    # Global search ---->
    
    path("search/", global_search),
    
    # Feed ---->
    
    path("feed/", feed),
]
