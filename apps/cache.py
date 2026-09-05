from django.core.cache import cache


CACHE_TIMEOUT = 60


def post_detail_cache_key(post_id, user_id):
    return f"post_detail_{post_id}_user_{user_id}"


def profile_detail_cache_key(user_id):
    return f"profile_detail_user_{user_id}"


def invalidate_comment_list_cache(post_id):
    cache.delete_pattern(f"comment_list_{post_id}_*")


def invalidate_post_caches(post_id, author_id):
    """Remove every cached response that exposes a post's mutable state."""
    cache.delete_pattern(f"post_detail_{post_id}_user_*")
    cache.delete_pattern(f"post_list_{author_id}_*")
    cache.delete_pattern("post_list_all_*")
    cache.delete(profile_detail_cache_key(author_id))

    # Every follower's feed can contain this post and its counters/liked state.
    from apps.users.models import Follow

    follower_ids = Follow.objects.filter(following_id=author_id).values_list(
        "follower_id", flat=True
    )
    for follower_id in follower_ids:
        cache.delete_pattern(f"user_feed_{follower_id}_*")


def invalidate_follow_caches(follower_id, following_id):
    """Remove cached follower lists, profile counts, and the changed user's feed."""
    cache.delete_pattern(f"user_following_{follower_id}_*")
    cache.delete_pattern(f"user_follower_{following_id}_*")
    cache.delete_pattern(f"user_feed_{follower_id}_*")
    cache.delete(profile_detail_cache_key(follower_id))
    cache.delete(profile_detail_cache_key(following_id))


def invalidate_privacy_caches(user_id):
    """Remove cached posts, feeds, and profile details when a user's privacy changes."""
    cache.delete_pattern(f"post_list_{user_id}_*")
    cache.delete_pattern("post_list_all_*")
    cache.delete_pattern("post_detail_*")
    cache.delete(profile_detail_cache_key(user_id))
    cache.delete(f"user_detail_{user_id}")
    cache.delete_pattern(f"user_following_{user_id}_*")
    cache.delete_pattern(f"user_follower_{user_id}_*")

