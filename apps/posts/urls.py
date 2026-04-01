from django.urls import path
from .views import (toggle_like,
                    PostListCreateView, PostDetailUpdateDeleteView, 
                    CommentListCreateView, CommentUpdateDeleteView)



urlpatterns = [

    path("posts/", PostListCreateView.as_view(), name="post-list-create"),
    path("posts/<int:post_id>/", PostDetailUpdateDeleteView.as_view(), name="post-detail"),
    
    path("posts/<int:post_id>/like/", toggle_like, name="post-like"),
    
    path("posts/<int:post_id>/comments/", CommentListCreateView.as_view(), name="comment-list-create"),
    path("posts/<int:post_id>/comments/<int:comment_id>/", CommentUpdateDeleteView.as_view(), name="comment-detail"),
    
]
