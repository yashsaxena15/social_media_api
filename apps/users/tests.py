import json

from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cache import profile_detail_cache_key
from apps.posts.models import Like, Post
from apps.users.models import Follow, Profile, User, FollowRequest, Notification


TEST_CACHES = {
    "default": {
        "BACKEND": "apps.test_utils.PatternLocMemCache",
        "LOCATION": "users-api-tests",
    }
}
TEST_REST_FRAMEWORK = {
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}


@override_settings(CACHES=TEST_CACHES, REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class UserEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="alice", password="password123")
        self.other_user = User.objects.create_user(
            username="bob", password="password123"
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_registration_login_and_logout(self):
        registration = self.client.post(
            "/api/users/me/", {"username": "new-user", "password": "password123"}
        )
        login = self.client.post(
            "/api/token/", {"username": "new-user", "password": "password123"}
        )

        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Profile.objects.filter(user__username="new-user").exists())
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        logout = self.client.post("/api/logout-user/", {"refresh": login.data["refresh"]})

        self.assertEqual(logout.status_code, status.HTTP_200_OK)

    def test_authenticated_user_endpoints_reject_anonymous_requests(self):
        user_response = self.client.get("/api/users/me/")
        profile_response = self.client.get("/api/profile/me/")
        feed_response = self.client.get("/api/feed/")

        self.assertEqual(user_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(profile_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(feed_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_follow_and_unfollow_clear_related_caches(self):
        cache.set(f"user_following_{self.user.id}_page_1", {"results": []})
        cache.set(f"user_follower_{self.other_user.id}_page_1", {"results": []})
        cache.set(f"user_feed_{self.user.id}_page_1", {"results": []})
        cache.set(profile_detail_cache_key(self.user.id), {"username": self.user.username})
        cache.set(
            profile_detail_cache_key(self.other_user.id), {"username": self.other_user.username}
        )

        self.authenticate(self.user)
        follow_response = self.client.post(f"/api/users/{self.other_user.id}/follow/")

        self.assertEqual(follow_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Follow.objects.filter(follower=self.user, following=self.other_user).exists()
        )
        self.assertIsNone(cache.get(f"user_following_{self.user.id}_page_1"))
        self.assertIsNone(cache.get(f"user_follower_{self.other_user.id}_page_1"))
        self.assertIsNone(cache.get(f"user_feed_{self.user.id}_page_1"))
        self.assertIsNone(cache.get(profile_detail_cache_key(self.user.id)))
        self.assertIsNone(cache.get(profile_detail_cache_key(self.other_user.id)))

        unfollow_response = self.client.post(f"/api/users/{self.other_user.id}/follow/")

        self.assertEqual(unfollow_response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Follow.objects.filter(follower=self.user, following=self.other_user).exists()
        )

    def test_feed_returns_followed_users_posts_and_updates_after_unfollow(self):
        Follow.objects.create(follower=self.user, following=self.other_user)
        post = Post.objects.create(user=self.other_user, caption="Bob's feed post")
        self.authenticate(self.user)

        feed_response = self.client.get("/api/feed/")
        self.assertEqual(feed_response.status_code, status.HTTP_200_OK)
        self.assertEqual(feed_response.data["results"][0]["id"], post.id)

        unfollow_response = self.client.post(f"/api/users/{self.other_user.id}/follow/")
        updated_feed = self.client.get("/api/feed/")

        self.assertEqual(unfollow_response.status_code, status.HTTP_200_OK)
        self.assertEqual(updated_feed.data["results"], [])

    def test_search_paginates_each_result_type_and_serializes_liked_posts(self):
        for number in range(6):
            User.objects.create_user(
                username=f"search-user-{number}", password="password123"
            )
        post = Post.objects.create(user=self.other_user, caption="Searchable post")
        Like.objects.create(user=self.user, post=post)
        self.authenticate(self.user)

        users_response = self.client.get("/api/search/?q=search-user&type=users")
        posts_response = self.client.get("/api/search/?q=searchable&type=posts")
        combined_response = self.client.get("/api/search/?q=searchable")

        self.assertEqual(users_response.status_code, status.HTTP_200_OK)
        self.assertEqual(users_response.data["count"], 6)
        self.assertEqual(len(users_response.data["results"]), 5)
        self.assertIsNotNone(users_response.data["next"])

        self.assertEqual(posts_response.status_code, status.HTTP_200_OK)
        self.assertEqual(posts_response.data["count"], 1)
        self.assertTrue(posts_response.data["results"][0]["is_liked"])

        self.assertEqual(combined_response.status_code, status.HTTP_200_OK)
        self.assertEqual(combined_response.data["users"]["count"], 0)
        self.assertEqual(combined_response.data["posts"]["count"], 1)

    def test_search_rejects_invalid_types(self):
        response = self.client.get("/api/search/?q=alice&type=invalid")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_user_follow_immediate(self):
        self.authenticate(self.user)
        response = self.client.post(f"/api/users/{self.other_user.id}/follow/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "following")
        self.assertTrue(Follow.objects.filter(follower=self.user, following=self.other_user).exists())

    def test_private_user_follow_creates_request_and_notification(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        response = self.client.post(f"/api/users/{self.other_user.id}/follow/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "requested")
        self.assertFalse(Follow.objects.filter(follower=self.user, following=self.other_user).exists())
        self.assertTrue(
            FollowRequest.objects.filter(requester=self.user, target=self.other_user, status="pending").exists()
        )
        self.assertTrue(
            Notification.objects.filter(recipient=self.other_user, sender=self.user, notification_type="follow_request").exists()
        )

    def test_cancel_follow_request(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        self.client.post(f"/api/users/{self.other_user.id}/follow/")
        cancel_response = self.client.post(f"/api/users/{self.other_user.id}/follow/")

        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_response.data["status"], "none")
        self.assertFalse(
            FollowRequest.objects.filter(requester=self.user, target=self.other_user).exists()
        )

    def test_accept_follow_request(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        self.client.post(f"/api/users/{self.other_user.id}/follow/")
        follow_req = FollowRequest.objects.get(requester=self.user, target=self.other_user)

        # Unauthorized user cannot accept
        charlie = User.objects.create_user(username="charlie", password="password123")
        self.authenticate(charlie)
        unauthorized = self.client.post(f"/api/follow-requests/{follow_req.id}/accept/")
        self.assertEqual(unauthorized.status_code, status.HTTP_403_FORBIDDEN)

        # Target user accepts
        self.authenticate(self.other_user)
        accept_res = self.client.post(f"/api/follow-requests/{follow_req.id}/accept/")
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertTrue(Follow.objects.filter(follower=self.user, following=self.other_user).exists())

        # Repeated accept fails
        repeat_res = self.client.post(f"/api/follow-requests/{follow_req.id}/accept/")
        self.assertEqual(repeat_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_follow_request(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        self.client.post(f"/api/users/{self.other_user.id}/follow/")
        follow_req = FollowRequest.objects.get(requester=self.user, target=self.other_user)

        self.authenticate(self.other_user)
        reject_res = self.client.post(f"/api/follow-requests/{follow_req.id}/reject/")
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)
        self.assertFalse(Follow.objects.filter(follower=self.user, following=self.other_user).exists())

        repeat_reject = self.client.post(f"/api/follow-requests/{follow_req.id}/reject/")
        self.assertEqual(repeat_reject.status_code, status.HTTP_400_BAD_REQUEST)

    def test_private_account_blocks_unauthorized_posts_and_follow_lists(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()
        post = Post.objects.create(user=self.other_user, caption="Secret private post")

        self.authenticate(self.user)
        # Direct lookup by username
        posts_by_username = self.client.get(f"/api/posts/?username={self.other_user.username}")
        self.assertEqual(posts_by_username.status_code, status.HTTP_403_FORBIDDEN)

        # Direct lookup by post id
        post_detail = self.client.get(f"/api/posts/{post.id}/")
        self.assertEqual(post_detail.status_code, status.HTTP_403_FORBIDDEN)

        # Direct followers list
        followers = self.client.get(f"/api/users/{self.other_user.id}/follower/")
        self.assertEqual(followers.status_code, status.HTTP_403_FORBIDDEN)

        # Direct following list
        following = self.client.get(f"/api/users/{self.other_user.id}/following/")
        self.assertEqual(following.status_code, status.HTTP_403_FORBIDDEN)

        # All posts feed should not include this post
        all_posts = self.client.get("/api/posts/")
        post_ids = [p["id"] for p in all_posts.data["results"]]
        self.assertNotIn(post.id, post_ids)

    def test_private_to_public_transition_auto_accepts_pending_requests(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        self.client.post(f"/api/users/{self.other_user.id}/follow/")
        self.assertTrue(FollowRequest.objects.filter(requester=self.user, target=self.other_user, status="pending").exists())

        # Bob switches to public
        self.authenticate(self.other_user)
        res = self.client.patch("/api/profile/me/", {"is_private": False})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Alice should now be an active follower
        self.assertTrue(Follow.objects.filter(follower=self.user, following=self.other_user).exists())
        self.assertFalse(FollowRequest.objects.filter(requester=self.user, target=self.other_user, status="pending").exists())

    def test_self_follow_rejected(self):
        self.authenticate(self.user)
        response = self.client.post(f"/api/users/{self.user.id}/follow/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_notifications_list_and_mark_read(self):
        Notification.objects.create(recipient=self.user, sender=self.other_user, notification_type="follow_request")
        self.authenticate(self.user)

        res = self.client.get("/api/notifications/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["unread_count"], 1)
        self.assertEqual(len(res.data["results"]), 1)

        mark_res = self.client.post("/api/notifications/mark-read/", {})
        self.assertEqual(mark_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    def test_public_user_follow_creates_and_removes_notification(self):
        self.authenticate(self.user)
        # Alice follows Bob (public)
        res = self.client.post(f"/api/users/{self.other_user.id}/follow/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.other_user, sender=self.user, notification_type="follow"
            ).exists()
        )

        # Alice unfollows Bob
        unfollow_res = self.client.post(f"/api/users/{self.other_user.id}/follow/")
        self.assertEqual(unfollow_res.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.other_user, sender=self.user, notification_type="follow"
            ).exists()
        )

    def test_like_creates_and_removes_notification(self):
        post = Post.objects.create(user=self.other_user, caption="Bob's test post")
        self.authenticate(self.user)

        # Alice likes Bob's post -> Notification created
        like_res = self.client.post(f"/api/posts/{post.id}/like/")
        self.assertEqual(like_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.other_user, sender=self.user, notification_type="like", post=post
            ).exists()
        )

        # Alice unlikes -> Notification deleted
        unlike_res = self.client.post(f"/api/posts/{post.id}/like/")
        self.assertEqual(unlike_res.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.other_user, sender=self.user, notification_type="like", post=post
            ).exists()
        )

    def test_liking_or_commenting_on_own_post_does_not_create_notification(self):
        post = Post.objects.create(user=self.user, caption="Alice's post")
        self.authenticate(self.user)

        # Alice likes her own post
        self.client.post(f"/api/posts/{post.id}/like/")
        self.assertFalse(
            Notification.objects.filter(recipient=self.user, notification_type="like").exists()
        )

        # Alice comments on her own post
        self.client.post(f"/api/posts/{post.id}/comments/", {"text": "Self comment"})
        self.assertFalse(
            Notification.objects.filter(recipient=self.user, notification_type="comment").exists()
        )

    def test_comment_creates_notification_and_filtering_works(self):
        post = Post.objects.create(user=self.other_user, caption="Bob's post")
        self.authenticate(self.user)

        # Alice comments on Bob's post
        res = self.client.post(f"/api/posts/{post.id}/comments/", {"text": "Great picture!"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.other_user, sender=self.user, notification_type="comment", post=post
            ).exists()
        )

        # Bob checks notifications with filters
        self.authenticate(self.other_user)
        # Filter comments
        comm_res = self.client.get("/api/notifications/?filter=comments")
        self.assertEqual(comm_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(comm_res.data["results"]), 1)
        self.assertEqual(comm_res.data["results"][0]["comment_text"], "Great picture!")
        self.assertEqual(comm_res.data["results"][0]["post_id"], post.id)

        # Filter likes (should be 0)
        likes_res = self.client.get("/api/notifications/?filter=likes")
        self.assertEqual(likes_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(likes_res.data["results"]), 0)

    def test_grouped_like_notifications(self):
        post = Post.objects.create(user=self.user, caption="Alice's popular post")
        charlie = User.objects.create_user(username="charlie", password="password123")

        # Bob and Charlie like Alice's post
        Notification.objects.create(recipient=self.user, sender=self.other_user, notification_type="like", post=post)
        Notification.objects.create(recipient=self.user, sender=charlie, notification_type="like", post=post)

        self.authenticate(self.user)
        res = self.client.get("/api/notifications/?filter=likes")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should be grouped into 1 notification row
        self.assertEqual(len(res.data["results"]), 1)
        item = res.data["results"][0]
        self.assertEqual(item["total_like_count"], 2)
        self.assertEqual(len(item["notification_ids"]), 2)
        self.assertIn("charlie", item["grouped_senders"])
        self.assertIn("bob", item["grouped_senders"])

        # Batch mark read using notification_ids
        batch_res = self.client.post("/api/notifications/mark-read/", {"notification_ids": item["notification_ids"]})
        self.assertEqual(batch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    def test_pending_requests_filter_and_cancellation(self):
        self.other_user.profile.is_private = True
        self.other_user.profile.save()

        self.authenticate(self.user)
        # Alice requests to follow private user Bob
        self.client.post(f"/api/users/{self.other_user.id}/follow/")
        self.assertTrue(FollowRequest.objects.filter(requester=self.user, target=self.other_user, status="pending").exists())

        # Alice checks pending requests filter in notifications
        res = self.client.get("/api/notifications/?filter=pending_requests")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        item = res.data["results"][0]
        self.assertEqual(item["sender_username"], self.other_user.username)
        self.assertEqual(item["notification_type"], "pending_request_sent")
        self.assertEqual(item["follow_request_status"], "pending")

        # Alice cancels the follow request via cancel endpoint
        cancel_res = self.client.post(f"/api/follow-requests/{item['follow_request_id']}/cancel/")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertFalse(FollowRequest.objects.filter(requester=self.user, target=self.other_user).exists())

        # Now pending requests should be empty
        empty_res = self.client.get("/api/notifications/?filter=pending_requests")
        self.assertEqual(empty_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(empty_res.data["results"]), 0)



@override_settings(CACHES=TEST_CACHES, REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class ApiDocumentationTests(APITestCase):
    def test_local_react_origin_is_allowed_by_cors(self):
        response = self.client.options(
            "/api/posts/",
            HTTP_ORIGIN="http://localhost:5173",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:5173")

    def test_openapi_schema_documents_all_api_routes(self):
        response = self.client.get("/api/schema/?format=json")
        schema = json.loads(response.content)
        expected_paths = {
            "/api/feed/",
            "/api/logout-user/",
            "/api/posts/",
            "/api/posts/{post_id}/",
            "/api/posts/{post_id}/like/",
            "/api/posts/{post_id}/comments/",
            "/api/posts/{post_id}/comments/{comment_id}/",
            "/api/profile/me/",
            "/api/profiles/",
            "/api/search/",
            "/api/token/",
            "/api/token/refresh/",
            "/api/users/me/",
            "/api/users/{user_id}/follow/",
            "/api/users/{user_id}/following/",
            "/api/users/{user_id}/follower/",
        }

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(expected_paths.issubset(schema["paths"]))

    def test_swagger_and_redoc_pages_render(self):
        swagger_response = self.client.get("/api/docs/")
        redoc_response = self.client.get("/api/redoc/")

        self.assertEqual(swagger_response.status_code, status.HTTP_200_OK)
        self.assertEqual(redoc_response.status_code, status.HTTP_200_OK)
