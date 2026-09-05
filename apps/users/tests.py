import json
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cache import profile_detail_cache_key
from apps.posts.models import Like, Post, SavedPost
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
            "/api/users/me/",
            {
                "username": "new-user",
                "password": "password123",
                "full_name": "New User",
                "dob": "1999-05-15",
                "gender": "female",
            },
        )
        login = self.client.post(
            "/api/token/", {"username": "new-user", "password": "password123"}
        )

        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        profile = Profile.objects.filter(user__username="new-user").first()
        self.assertIsNotNone(profile)
        self.assertEqual(str(profile.dob), "1999-05-15")
        self.assertEqual(profile.gender, "female")
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        logout = self.client.post("/api/logout-user/", {"refresh": login.data["refresh"]})

        self.assertEqual(logout.status_code, status.HTTP_200_OK)

    def test_profile_dob_and_gender_update(self):
        self.authenticate(self.user)
        res = self.client.patch(
            "/api/profile/me/",
            {"dob": "2000-01-01", "gender": "male"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["dob"], "2000-01-01")
        self.assertEqual(res.data["gender"], "male")

        # Verify through profile detail get
        detail_res = self.client.get("/api/profile/me/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["dob"], "2000-01-01")
        self.assertEqual(detail_res.data["gender"], "male")

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

    def test_profile_avatar_upload_optimizes_dimension_and_preserves_ratio(self):
        self.authenticate(self.user)
        # 1600x1200 avatar upload
        img = Image.new("RGB", (1600, 1200), color=(220, 150, 100))
        img_io = io.BytesIO()
        img.save(img_io, format="JPEG", quality=90)
        img_io.seek(0)

        uploaded_file = SimpleUploadedFile(
            "large_avatar.jpg", img_io.getvalue(), content_type="image/jpeg"
        )

        response = self.client.patch(
            "/api/profile/me/",
            {"profile_image": uploaded_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertTrue(bool(self.user.profile.profile_image))

        with Image.open(self.user.profile.profile_image.path) as saved_avatar:
            w, h = saved_avatar.size
            self.assertLessEqual(max(w, h), 800)
            self.assertAlmostEqual(w / h, 1600 / 1200, places=2)

    def test_remove_follower_successfully(self):
        # Bob follows Alice
        Follow.objects.create(follower=self.other_user, following=self.user)
        self.assertEqual(self.user.followers.count(), 1)

        self.authenticate(self.user)
        # Alice checks follower list
        follower_res = self.client.get(f"/api/users/{self.user.id}/follower/")
        self.assertEqual(follower_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(follower_res.data["results"]), 1)
        self.assertEqual(follower_res.data["results"][0]["follower"], self.other_user.username)
        self.assertEqual(follower_res.data["results"][0]["user_id"], self.other_user.id)

        # Alice removes Bob from followers
        remove_res = self.client.post(f"/api/users/{self.other_user.id}/remove-follower/")
        self.assertEqual(remove_res.status_code, status.HTTP_200_OK)
        self.assertFalse(Follow.objects.filter(follower=self.other_user, following=self.user).exists())

        # Bob no longer in Alice's followers list
        follower_res_after = self.client.get(f"/api/users/{self.user.id}/follower/")
        self.assertEqual(follower_res_after.status_code, status.HTTP_200_OK)
        self.assertEqual(len(follower_res_after.data["results"]), 0)

        # Alice's profile reflects 0 followers
        profile_res = self.client.get(f"/api/profiles/?username={self.user.username}")
        self.assertEqual(profile_res.data["followers_count"], 0)

    def test_remove_follower_cuts_off_private_access_and_saved_posts(self):
        # Alice has a private profile
        self.user.profile.is_private = True
        self.user.profile.save()

        # Alice creates a post
        alice_post = Post.objects.create(user=self.user, caption="Alice's private post")

        # Bob follows Alice
        Follow.objects.create(follower=self.other_user, following=self.user)

        # Bob saves Alice's post
        self.authenticate(self.other_user)
        save_res = self.client.post(f"/api/posts/{alice_post.id}/save/")
        self.assertEqual(save_res.status_code, status.HTTP_201_CREATED)

        # Bob can view Alice's posts, follower list, following list, and saved post
        self.assertEqual(self.client.get(f"/api/posts/?username={self.user.username}").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f"/api/users/{self.user.id}/follower/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f"/api/users/{self.user.id}/following/").status_code, status.HTTP_200_OK)

        saved_list = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list.status_code, status.HTTP_200_OK)
        self.assertIn(alice_post.id, [p["id"] for p in saved_list.data["results"]])

        # Alice removes Bob as a follower
        self.authenticate(self.user)
        remove_res = self.client.post(f"/api/users/{self.other_user.id}/remove-follower/")
        self.assertEqual(remove_res.status_code, status.HTTP_200_OK)

        # Now Bob's access to Alice's private content is immediately cut off
        self.authenticate(self.other_user)
        self.assertEqual(self.client.get(f"/api/posts/?username={self.user.username}").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f"/api/users/{self.user.id}/follower/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f"/api/users/{self.user.id}/following/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f"/api/posts/{alice_post.id}/").status_code, status.HTTP_403_FORBIDDEN)

        # Alice's post is automatically excluded from Bob's Saved collection
        saved_list_after = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list_after.status_code, status.HTTP_200_OK)
        self.assertNotIn(alice_post.id, [p["id"] for p in saved_list_after.data["results"]])

        # Bob is NOT blocked: Bob can view Alice's basic profile and search for her
        profile_res = self.client.get(f"/api/profiles/?username={self.user.username}")
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertFalse(profile_res.data["can_view_content"])
        self.assertFalse(profile_res.data["is_following"])

        search_res = self.client.get(f"/api/search/?q={self.user.username}&type=users")
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertIn(self.user.username, [u["username"] for u in search_res.data["results"]])

        # Bob can request to follow Alice again
        request_follow_res = self.client.post(f"/api/users/{self.user.id}/follow/")
        self.assertEqual(request_follow_res.status_code, status.HTTP_200_OK)
        self.assertEqual(request_follow_res.data["status"], "requested")

    def test_remove_follower_validation(self):
        self.authenticate(self.user)
        # Cannot remove self
        self_res = self.client.post(f"/api/users/{self.user.id}/remove-follower/")
        self.assertEqual(self_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Cannot remove someone who is not following
        non_follower_res = self.client.post(f"/api/users/{self.other_user.id}/remove-follower/")
        self.assertEqual(non_follower_res.status_code, status.HTTP_400_BAD_REQUEST)



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
