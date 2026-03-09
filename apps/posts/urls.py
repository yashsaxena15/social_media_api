from django.urls import path
from .views import (create_post, update_post, delete_post, 
                    post_detail, post_list, toggle_like,
                    create_comment, get_comments, update_comment,
                    delete_comment)



urlpatterns = [
    path("posts/create-post/",create_post),
    path("posts/post-list/",post_list),
    path("posts/post-detail/<int:post_id>/",post_detail),
    path("posts/delete-post/<int:post_id>/",delete_post),
    path("posts/update-post/<int:post_id>/",update_post),
    
    path("posts/<int:post_id>/like/", toggle_like),
    
    path("posts/<int:post_id>/create-comment/", create_comment),
    path("posts/<int:post_id>/list-comments/", get_comments),
    path("comments/<int:comment_id>/update-comment/", update_comment),
    path("comments/<int:comment_id>/delete-comment/", delete_comment),
    
]
