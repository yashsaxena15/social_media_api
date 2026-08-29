import json

from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cache import profile_detail_cache_key
from apps.posts.models import Like, Post
from apps.users.models import Follow, Profile, User


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
