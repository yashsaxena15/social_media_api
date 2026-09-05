from apps.users.models import Follow


def can_view_user_content(viewer, target_user):
    """
    Determines if `viewer` is allowed to see `target_user`'s protected content
    (posts, follower list, following list).

    Rules:
    - The target user can always view their own content.
    - If target user's account is public (is_private=False), anyone can view.
    - If target user's account is private (is_private=True), only authenticated approved followers can view.
    """
    if not target_user:
        return False

    if viewer and viewer.is_authenticated and viewer.id == target_user.id:
        return True

    profile = getattr(target_user, "profile", None)
    if profile is None or not profile.is_private:
        return True

    if not viewer or not viewer.is_authenticated:
        return False

    return Follow.objects.filter(follower=viewer, following=target_user).exists()
