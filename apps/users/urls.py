from django.urls import path
from .views import (logout_user,
                    toggle_follow, following_list, follower_list,
                    global_search, feed, ProfileDetailUpdateView,
                    ProfileListView, UserDetailCreateUpdateDeleteView,
                    accept_follow_request, reject_follow_request,
                    cancel_follow_request, notifications_list,
                    mark_notifications_read)


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
    path("follow-requests/<int:request_id>/accept/", accept_follow_request),
    path("follow-requests/<int:request_id>/reject/", reject_follow_request),
    path("follow-requests/<int:request_id>/cancel/", cancel_follow_request),

    # Notifications -->
    path("notifications/", notifications_list),
    path("notifications/mark-read/", mark_notifications_read),
    
    # Global search ---->
    
    path("search/", global_search),
    
    # Feed ---->
    
    path("feed/", feed),
]

