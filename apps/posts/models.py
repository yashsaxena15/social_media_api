from django.db import models
from django.conf import settings
# Create your models here.

class Post(models.Model):
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.CASCADE, related_name= "posts") 
    # AUTH_USER_MODEL for importing user model, we can't use from apps.users.models import User because of cicular import this can cause issue

    caption = models.TextField(blank=True, max_length=200) # blank = True ---> means this field can be blank in JSON 
    image = models.ImageField(upload_to= "media/posts/",blank=True, null= True) # null = True --> means column can store null in database
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]  # it orders posts in created_at decending (newest first)
    
    def __str__(self):
        return f"{self.user.username} - Post {self.id}"
    