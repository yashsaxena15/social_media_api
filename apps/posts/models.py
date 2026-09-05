from django.db import models
from django.conf import settings
# Create your models here.

class Post(models.Model):
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.CASCADE, related_name= "posts") 
    # AUTH_USER_MODEL for importing user model, we can't use from apps.users.models import User because of cicular import this can cause issue

    caption = models.CharField(blank=True, max_length=300) # blank = True ---> means this field can be blank in JSON 
    image = models.ImageField(upload_to= "posts/",blank=True, null= True) # null = True --> means column can store null in database
    thumbnail = models.ImageField(upload_to="posts/thumbnails/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]  # it orders posts in created_at decending (newest first)
    
    def __str__(self):
        return f"{self.user.username} - Post {self.id}"


class PostImage(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="posts/")
    thumbnail = models.ImageField(upload_to="posts/thumbnails/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"Post {self.post_id} Image {self.id}"

class Like(models.Model):
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post = models.ForeignKey("posts.Post", on_delete=models.CASCADE, related_name='likes') # this posts.Post comes from django look for app name and model, it actually importing post model
    # we can access path or model using apps also like posts.Post accessing post model
    # this works only for models posts --> app label Post ---> model inside that app
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user","post"], name="unique_user_post_like")
            # One user can like a post only once
            # means in the database table same pair of user id and post id can't be present in db more than one time.
             
        ]
    
    
class Comment(models.Model):
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.CASCADE)
    post = models.ForeignKey("posts.Post", on_delete=models.CASCADE, related_name="comments")
    text = models.CharField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment {self.id}"


class SavedPost(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_posts")
    post = models.ForeignKey("posts.Post", on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "post"], name="unique_user_post_save")
        ]

    def __str__(self):
        return f"{self.user.username} saved post {self.post_id}"

