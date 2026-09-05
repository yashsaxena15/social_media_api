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
from apps.posts.models import Comment, Like, Post, SavedPost


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

    def test_author_can_modify_post_and_comment(self):
        comment = Comment.objects.create(
            user=self.author, post=self.post, text="Original comment"
        )
        self.authenticate(self.author)

        post_response = self.client.patch(
            f"/api/posts/{self.post.id}/", {"caption": "Updated caption"}
        )
        self.assertEqual(post_response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertEqual(self.post.caption, "Updated caption")

        comment_response = self.client.patch(
            f"/api/posts/{self.post.id}/comments/{comment.id}/", {"text": "Updated comment text"}
        )
        self.assertEqual(comment_response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertEqual(comment.text, "Updated comment text")

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

    def test_post_creation_with_multiple_carousel_images(self):
        self.authenticate(self.author)
        images = []
        for i in range(3):
            img = Image.new("RGB", (800 + i * 200, 600 + i * 150), color=(50 * i, 100, 150))
            img_io = io.BytesIO()
            img.save(img_io, format="JPEG")
            img_io.seek(0)
            images.append(
                SimpleUploadedFile(f"slide_{i}.jpg", img_io.getvalue(), content_type="image/jpeg")
            )

        response = self.client.post(
            "/api/posts/",
            {"caption": "Carousel post with 3 images", "images": images},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        post_id = response.data["id"]
        created_post = Post.objects.get(id=post_id)

        # Verify PostImage records were created
        self.assertEqual(created_post.images.count(), 3)
        self.assertEqual(len(response.data["images"]), 3)

        # Verify backward compatibility (primary image is populated)
        self.assertTrue(bool(created_post.image))
        self.assertTrue(bool(created_post.thumbnail))

        # Check order and aspect ratio
        for idx, post_image in enumerate(created_post.images.all()):
            self.assertEqual(post_image.order, idx)
            with Image.open(post_image.image.path) as img:
                w, h = img.size
                orig_w = 800 + idx * 200
                orig_h = 600 + idx * 150
                self.assertAlmostEqual(w / h, orig_w / orig_h, places=2)

    def test_post_and_tweet_content_type_filtering(self):
        self.authenticate(self.author)

        # Create an image post
        img = Image.new("RGB", (400, 400), color=(100, 150, 200))
        img_io = io.BytesIO()
        img.save(img_io, format="JPEG")
        img_io.seek(0)
        img_file = SimpleUploadedFile("test_img.jpg", img_io.getvalue(), content_type="image/jpeg")

        img_resp = self.client.post(
            "/api/posts/",
            {"caption": "Image post caption", "image": img_file},
            format="multipart",
        )
        self.assertEqual(img_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(img_resp.data["post_type"], "post")

        # Create a text-only tweet
        tweet_resp = self.client.post(
            "/api/posts/",
            {"caption": "A text-only tweet without any image"},
        )
        self.assertEqual(tweet_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(tweet_resp.data["post_type"], "tweet")

        # Test filtering by type=posts
        posts_filter = self.client.get(f"/api/posts/?username={self.author.username}&type=posts")
        self.assertEqual(posts_filter.status_code, status.HTTP_200_OK)
        for p in posts_filter.data["results"]:
            self.assertEqual(p["post_type"], "post")
            self.assertTrue(bool(p["image"] or p["images"]))

        # Test filtering by type=tweets
        tweets_filter = self.client.get(f"/api/posts/?username={self.author.username}&type=tweets")
        self.assertEqual(tweets_filter.status_code, status.HTTP_200_OK)
        for p in tweets_filter.data["results"]:
            self.assertEqual(p["post_type"], "tweet")
            self.assertFalse(bool(p["image"]))
            self.assertEqual(len(p["images"]), 0)

        # Test empty post rejection (no text, no image)
        empty_resp = self.client.post("/api/posts/", {"caption": "   "})
        self.assertEqual(empty_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pagination_batches_of_five_for_posts_and_tweets(self):
        self.authenticate(self.author)

        # Create 7 image posts
        for i in range(7):
            img = Image.new("RGB", (300, 300), color=(10 * i, 50, 80))
            img_io = io.BytesIO()
            img.save(img_io, format="JPEG")
            img_io.seek(0)
            img_file = SimpleUploadedFile(f"batch_img_{i}.jpg", img_io.getvalue(), content_type="image/jpeg")
            Post.objects.create(user=self.author, caption=f"Image post {i}", image=img_file)

        # Create 8 text-only tweets
        for i in range(8):
            Post.objects.create(user=self.author, caption=f"Tweet text {i}")

        # Page 1 of image posts: exactly 5 items, has next
        p1_posts = self.client.get(f"/api/posts/?username={self.author.username}&type=posts&page=1")
        self.assertEqual(p1_posts.status_code, status.HTTP_200_OK)
        self.assertEqual(len(p1_posts.data["results"]), 5)
        self.assertIsNotNone(p1_posts.data["next"])
        for p in p1_posts.data["results"]:
            self.assertEqual(p["post_type"], "post")

        # Page 2 of image posts: remaining 2 items, next is None
        p2_posts = self.client.get(f"/api/posts/?username={self.author.username}&type=posts&page=2")
        self.assertEqual(p2_posts.status_code, status.HTTP_200_OK)
        self.assertEqual(len(p2_posts.data["results"]), 2)
        self.assertIsNone(p2_posts.data["next"])

        # Page 1 of tweets: exactly 5 items, has next
        p1_tweets = self.client.get(f"/api/posts/?username={self.author.username}&type=tweets&page=1")
        self.assertEqual(p1_tweets.status_code, status.HTTP_200_OK)
        self.assertEqual(len(p1_tweets.data["results"]), 5)
        self.assertIsNotNone(p1_tweets.data["next"])
        for p in p1_tweets.data["results"]:
            self.assertEqual(p["post_type"], "tweet")

        # Page 2 of tweets: remaining 4 items (self.post from setUp + 8 tweets = 9 tweets; 9 - 5 = 4), next is None
        p2_tweets = self.client.get(f"/api/posts/?username={self.author.username}&type=tweets&page=2")
        self.assertEqual(p2_tweets.status_code, status.HTTP_200_OK)
        self.assertEqual(len(p2_tweets.data["results"]), 4)
        self.assertIsNone(p2_tweets.data["next"])

    def test_save_post_toggle_and_state(self):
        self.authenticate(self.viewer)

        # 1. Save post
        res_save = self.client.post(f"/api/posts/{self.post.id}/save/")
        self.assertEqual(res_save.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_save.data["is_saved"])
        self.assertTrue(SavedPost.objects.filter(user=self.viewer, post=self.post).exists())

        # Check detail serialization shows is_saved=True
        detail_res = self.client.get(f"/api/posts/{self.post.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertTrue(detail_res.data["is_saved"])

        # 2. Unsave post
        res_unsave = self.client.post(f"/api/posts/{self.post.id}/save/")
        self.assertEqual(res_unsave.status_code, status.HTTP_200_OK)
        self.assertFalse(res_unsave.data["is_saved"])
        self.assertFalse(SavedPost.objects.filter(user=self.viewer, post=self.post).exists())

        # Check detail serialization shows is_saved=False
        detail_res2 = self.client.get(f"/api/posts/{self.post.id}/")
        self.assertFalse(detail_res2.data["is_saved"])

    def test_private_account_save_permissions_and_auto_removal(self):
        # Author becomes private
        self.author.profile.is_private = True
        self.author.profile.save()

        # Viewer is not following author -> cannot save
        self.authenticate(self.viewer)
        res_forbidden = self.client.post(f"/api/posts/{self.post.id}/save/")
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Viewer follows author
        Follow.objects.create(follower=self.viewer, following=self.author)

        # Now viewer can save
        res_saved = self.client.post(f"/api/posts/{self.post.id}/save/")
        self.assertEqual(res_saved.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_saved.data["is_saved"])

        # Post is in viewer's saved collection
        saved_list = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list.status_code, status.HTTP_200_OK)
        saved_ids = [p["id"] for p in saved_list.data["results"]]
        self.assertIn(self.post.id, saved_ids)

        # Author removes viewer from followers
        Follow.objects.filter(follower=self.viewer, following=self.author).delete()

        # Saved post MUST automatically disappear from viewer's saved list at API level
        cache.clear()
        saved_list_after_unfollow = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list_after_unfollow.status_code, status.HTTP_200_OK)
        saved_ids_after = [p["id"] for p in saved_list_after_unfollow.data["results"]]
        self.assertNotIn(self.post.id, saved_ids_after)

        # Author switches profile back to public -> post immediately reappears in saved list!
        self.author.profile.is_private = False
        self.author.profile.save()
        cache.clear()

        saved_list_reappear = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list_reappear.status_code, status.HTTP_200_OK)
        reappear_ids = [p["id"] for p in saved_list_reappear.data["results"]]
        self.assertIn(self.post.id, reappear_ids)

    def test_saved_collection_cascades_on_post_delete(self):
        self.authenticate(self.viewer)
        self.client.post(f"/api/posts/{self.post.id}/save/")
        self.assertTrue(SavedPost.objects.filter(user=self.viewer, post=self.post).exists())

        # Author deletes post
        self.authenticate(self.author)
        del_res = self.client.delete(f"/api/posts/{self.post.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

        # SavedPost entry was cascaded
        self.assertFalse(SavedPost.objects.filter(post_id=self.post.id).exists())

        # Viewer's saved list is empty
        self.authenticate(self.viewer)
        saved_list = self.client.get("/api/posts/?type=saved")
        self.assertEqual(saved_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(saved_list.data["results"]), 0)

    def test_saved_collection_ordering_newest_saved_first(self):
        self.authenticate(self.author)
        p1 = Post.objects.create(user=self.author, caption="Post 1")
        p2 = Post.objects.create(user=self.author, caption="Post 2")
        p3 = Post.objects.create(user=self.author, caption="Post 3")

        self.authenticate(self.viewer)
        # Save in order: p2, then p1, then p3
        self.client.post(f"/api/posts/{p2.id}/save/")
        self.client.post(f"/api/posts/{p1.id}/save/")
        self.client.post(f"/api/posts/{p3.id}/save/")

        # Saved endpoint should return p3, then p1, then p2
        res = self.client.get("/api/posts/?type=saved")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data["results"]
        result_ids = [p["id"] for p in results]
        self.assertEqual(result_ids, [p3.id, p1.id, p2.id])

    def test_saved_posts_cannot_be_viewed_by_another_user(self):
        self.authenticate(self.viewer)
        self.client.post(f"/api/posts/{self.post.id}/save/")

        # Other viewer tries to view viewer's saved posts
        self.authenticate(self.other_viewer)
        forbidden_res = self.client.get(f"/api/posts/?username={self.viewer.username}&type=saved")
        self.assertEqual(forbidden_res.status_code, status.HTTP_403_FORBIDDEN)



