import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.cache import post_detail_cache_key
from apps.users.models import Follow, User
from apps.posts.models import Comment, Like, Post


TEST_CACHES = {
    "default": {
        "BACKEND": "apps.test_utils.PatternLocMemCache",
        "LOCATION": "posts-api-tests",
    }
}
TEST_REST_FRAMEWORK = {
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}


@override_settings(CACHES=TEST_CACHES, REST_FRAMEWORK=TEST_REST_FRAMEWORK)
class PostEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.author = User.objects.create_user(username="author", password="password123")
        self.viewer = User.objects.create_user(username="viewer", password="password123")
        self.other_viewer = User.objects.create_user(
            username="other-viewer", password="password123"
        )
        self.post = Post.objects.create(user=self.author, caption="A cached post")

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_post_routes_require_authentication(self):
        response = self.client.get("/api/posts/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_detail_cache_is_isolated_per_user(self):
        Like.objects.create(user=self.viewer, post=self.post)

        self.authenticate(self.viewer)
        liked_response = self.client.get(f"/api/posts/{self.post.id}/")

        self.authenticate(self.other_viewer)
        unliked_response = self.client.get(f"/api/posts/{self.post.id}/")

        self.assertEqual(liked_response.status_code, status.HTTP_200_OK)
        self.assertTrue(liked_response.data["is_liked"])
        self.assertEqual(unliked_response.status_code, status.HTTP_200_OK)
        self.assertFalse(unliked_response.data["is_liked"])
        self.assertIsNotNone(cache.get(post_detail_cache_key(self.post.id, self.viewer.id)))
        self.assertIsNotNone(
            cache.get(post_detail_cache_key(self.post.id, self.other_viewer.id))
        )

    def test_like_invalidates_post_list_detail_and_feed_caches(self):
        Follow.objects.create(follower=self.viewer, following=self.author)
        cache.set(post_detail_cache_key(self.post.id, self.viewer.id), {"id": self.post.id})
        cache.set(
            post_detail_cache_key(self.post.id, self.other_viewer.id), {"id": self.post.id}
        )
        cache.set(f"post_list_{self.author.id}_page_1", {"results": []})
        cache.set(f"user_feed_{self.viewer.id}_page_1", {"results": []})

        self.authenticate(self.viewer)
        response = self.client.post(f"/api/posts/{self.post.id}/like/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(cache.get(post_detail_cache_key(self.post.id, self.viewer.id)))
        self.assertIsNone(
            cache.get(post_detail_cache_key(self.post.id, self.other_viewer.id))
        )
        self.assertIsNone(cache.get(f"post_list_{self.author.id}_page_1"))
        self.assertIsNone(cache.get(f"user_feed_{self.viewer.id}_page_1"))

    def test_comment_creation_invalidates_comment_and_post_caches(self):
        Follow.objects.create(follower=self.viewer, following=self.author)
        cache.set(f"comment_list_{self.post.id}_page_1", {"results": []})
        cache.set(post_detail_cache_key(self.post.id, self.viewer.id), {"id": self.post.id})
        cache.set(f"post_list_{self.author.id}_page_1", {"results": []})
        cache.set(f"user_feed_{self.viewer.id}_page_1", {"results": []})

        self.authenticate(self.viewer)
        response = self.client.post(
            f"/api/posts/{self.post.id}/comments/", {"text": "Great post"}
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.filter(post=self.post).count(), 1)
        self.assertIsNone(cache.get(f"comment_list_{self.post.id}_page_1"))
        self.assertIsNone(cache.get(post_detail_cache_key(self.post.id, self.viewer.id)))
        self.assertIsNone(cache.get(f"post_list_{self.author.id}_page_1"))
        self.assertIsNone(cache.get(f"user_feed_{self.viewer.id}_page_1"))

    def test_new_post_invalidates_followers_feed_cache(self):
        Follow.objects.create(follower=self.viewer, following=self.author)
        cache.set(f"user_feed_{self.viewer.id}_page_1", {"results": []})

        self.authenticate(self.author)
        response = self.client.post("/api/posts/", {"caption": "A new post"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(cache.get(f"user_feed_{self.viewer.id}_page_1"))

    def test_other_users_cannot_modify_posts_or_comments(self):
        comment = Comment.objects.create(
            user=self.author, post=self.post, text="Author comment"
        )
        self.authenticate(self.viewer)

        post_response = self.client.patch(
            f"/api/posts/{self.post.id}/", {"caption": "Changed"}
        )
        comment_response = self.client.patch(
            f"/api/posts/{self.post.id}/comments/{comment.id}/", {"text": "Changed"}
        )

        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(comment_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_can_view_author_posts_by_username(self):
        Like.objects.create(user=self.viewer, post=self.post)
        self.authenticate(self.viewer)

        response = self.client.get(f"/api/posts/?username={self.author.username}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.post.id)
        self.assertEqual(response.data["results"][0]["username"], self.author.username)
        self.assertTrue(response.data["results"][0]["is_liked"])

    def test_post_creation_with_large_image_optimizes_and_creates_thumbnail(self):
        self.authenticate(self.author)
        # Create a synthetic high-res image (2400 x 3200)
        img = Image.new("RGB", (2400, 3200), color=(100, 150, 200))
        img_io = io.BytesIO()
        img.save(img_io, format="JPEG", quality=90)
        img_io.seek(0)

        uploaded_file = SimpleUploadedFile(
            "camera_highres.jpg", img_io.getvalue(), content_type="image/jpeg"
        )

        response = self.client.post(
            "/api/posts/",
            {"caption": "High-res test post", "image": uploaded_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        post_id = response.data["id"]
        created_post = Post.objects.get(id=post_id)

        # Verify main image was downscaled to max 2048px while preserving aspect ratio
        with Image.open(created_post.image.path) as saved_img:
            w, h = saved_img.size
            self.assertLessEqual(max(w, h), 2048)
            # Aspect ratio 2400/3200 = 0.75
            self.assertAlmostEqual(w / h, 2400 / 3200, places=2)

        # Verify thumbnail was generated with max 400px
        self.assertIsNotNone(created_post.thumbnail)
        with Image.open(created_post.thumbnail.path) as thumb_img:
            tw, th = thumb_img.size
            self.assertLessEqual(max(tw, th), 400)
            self.assertAlmostEqual(tw / th, 2400 / 3200, places=2)

    def test_post_creation_with_small_image_does_not_upscale(self):
        self.authenticate(self.author)
        img = Image.new("RGB", (400, 300), color=(200, 100, 50))
        img_io = io.BytesIO()
        img.save(img_io, format="PNG")
        img_io.seek(0)

        uploaded_file = SimpleUploadedFile(
            "small_photo.png", img_io.getvalue(), content_type="image/png"
        )

        response = self.client.post(
            "/api/posts/",
            {"caption": "Small image post", "image": uploaded_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_post = Post.objects.get(id=response.data["id"])

        with Image.open(created_post.image.path) as saved_img:
            self.assertEqual(saved_img.size, (400, 300))

    def test_post_creation_rejects_invalid_image_file(self):
        self.authenticate(self.author)
        fake_file = SimpleUploadedFile(
            "not_an_image.jpg", b"This is plain text pretending to be a jpg", content_type="image/jpeg"
        )

        response = self.client.post(
            "/api/posts/",
            {"caption": "Invalid image post", "image": fake_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", response.data)
