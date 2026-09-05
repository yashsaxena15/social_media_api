from django.db import models
from django.contrib.auth.models import AbstractUser  
from django.conf import settings
# Create your models here.

# Backend Flow -->
# Model → Serializer → View → URL

class User(AbstractUser):  # it is use for creating custom user giving us more fields like username,email,password,first_name etc.
    pass                   # if we use django's defualt user -->
                           # 1.) You cannot modify it later easily
                           # 2.) Adding custom fields becomes painful
                           # 3.) Can break project
                           

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE,related_name="profile")
    full_name = models.CharField(max_length=100)
    bio = models.CharField(blank=True, max_length=200)
    profile_image = models.ImageField(upload_to="profiles/",blank=True,null=True)
    is_private = models.BooleanField(default=False)

    def __str__(self):
        return self.full_name 
    
class Follow(models.Model):
    
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.CASCADE, related_name="following")
    # this creates a follower column in table for saving followers' user_id, and related name to get 
    following = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.CASCADE, related_name="followers")
    # this creates a following column in table for saving following' list of the users that are being followed
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name = "unique_follow_relationship")

        ]


class FollowRequest(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_follow_requests",
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_follow_requests",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "target"],
                condition=models.Q(status="pending"),
                name="unique_pending_follow_request",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.requester.username} -> {self.target.username} ({self.status})"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("follow_request", "Follow Request"),
        ("follow_accepted", "Follow Accepted"),
        ("follow", "Follow"),
        ("like", "Like"),
        ("comment", "Comment"),
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="follow_request",
    )
    follow_request = models.ForeignKey(
        FollowRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    post = models.ForeignKey(
        "posts.Post",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    comment = models.ForeignKey(
        "posts.Comment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.notification_type} from {self.sender.username}"

    