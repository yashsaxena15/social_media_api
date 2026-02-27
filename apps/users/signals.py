from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Profile


# User Created → Profile Created
# Signals - Run code automatically after something happens.

@receiver(post_save, sender=User)  # post_save - Runs after User model saved.
def create_profile(sender, instance, created, **kwargs):
    
    if created:                    # Only when NEW user created Not on update.
        Profile.objects.create(user=instance)  # instance - newly created user 