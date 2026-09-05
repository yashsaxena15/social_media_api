from django.db.models import BooleanField, Exists, OuterRef, Value

from .models import Like, SavedPost


def with_post_request_state(queryset, user):
    """Load post relationships and annotate whether the request user liked and saved each post."""
    queryset = queryset.select_related("user").prefetch_related("likes", "comments", "saved_by")

    if user.is_authenticated:
        return queryset.annotate(
            request_user_liked=Exists(
                Like.objects.filter(post_id=OuterRef("pk"), user_id=user.id)
            ),
            request_user_saved=Exists(
                SavedPost.objects.filter(post_id=OuterRef("pk"), user_id=user.id)
            ),
        )

    return queryset.annotate(
        request_user_liked=Value(False, output_field=BooleanField()),
        request_user_saved=Value(False, output_field=BooleanField()),
    )

