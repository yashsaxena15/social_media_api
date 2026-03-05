from django.urls import path
from .views import create_post, update_post, delete_post, post_detail, post_list



urlpatterns = [
    path("create-post/",create_post),
    path("post-list/",post_list),
    path("post-detail/<int:post_id>/",post_detail),
    path("delete-post/<int:post_id>/",delete_post),
    path("update-post/<int:post_id>/",update_post),
    
]
