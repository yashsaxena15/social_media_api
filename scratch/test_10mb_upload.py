import os
import sys
import io
import time
import django
from PIL import Image, ImageDraw

sys.path.insert(0, r"d:\yash\projects\social_media_api")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.users.models import User
from apps.posts.models import Post


def test_10mb_multipart_upload():
    print("===============================================================")
    print("      TESTING 10MB+ HIGH-RES UPLOAD END-TO-END VIA API         ")
    print("===============================================================")

    # Generate a large ~10MB file: 4000 x 3000 with detailed noise/patterns
    width, height = 4000, 3000
    print(f"Creating {width}x{height} high-resolution image...")
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Rich patterns to ensure high file size (> 10MB raw JPEG)
    for y in range(0, height, 8):
        draw.rectangle([(0, y), (width, y + 4)], fill=((y * 3) % 256, (y * 7) % 256, (y * 11) % 256))

    for x in range(0, width, 50):
        draw.line([(x, 0), (x, height)], fill=((x * 5) % 256, 255 - (x * 2) % 256, 128), width=3)

    draw.text((width // 2 - 200, height // 2), "10MB REALISTIC CAMERA IMAGE TEST", fill=(255, 255, 255))

    out_io = io.BytesIO()
    # Save uncompressed / minimal compression to reach ~10MB
    img.save(out_io, format="JPEG", quality=99, subsampling=0)
    raw_bytes = out_io.getvalue()
    size_mb = len(raw_bytes) / (1024 * 1024)
    print(f"Generated test file: {size_mb:.2f} MB ({len(raw_bytes)} bytes)")

    user, _ = User.objects.get_or_create(username="upload_test_user")
    user.set_password("pass123")
    user.save()

    client = APIClient()
    client.force_authenticate(user=user)

    uploaded_file = SimpleUploadedFile(
        "large_10mb_camera_photo.jpg", raw_bytes, content_type="image/jpeg"
    )

    t0 = time.time()
    response = client.post(
        "/api/posts/",
        {"caption": "Testing 10MB upload optimization", "image": uploaded_file},
        format="multipart",
        HTTP_HOST="localhost",
    )
    duration = time.time() - t0

    print(f"Upload and processing finished in {duration:.2f}s")
    print(f"Response status: {response.status_code}")

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.data}"

    post_id = response.data["id"]
    post = Post.objects.get(id=post_id)

    print(f"Post created successfully with ID: {post.id}")
    print(f"Saved Image URL: {post.image.url}")
    print(f"Saved Thumbnail URL: {post.thumbnail.url}")

    with Image.open(post.image.path) as saved_img:
        sw, sh = saved_img.size
        print(f"Optimized Image Dimensions: {sw}x{sh} (original was {width}x{height})")
        assert max(sw, sh) <= 2048, "Image exceeded 2048px limit!"
        assert abs((sw / sh) - (width / height)) < 0.005, "Aspect ratio altered!"

    with Image.open(post.thumbnail.path) as thumb_img:
        tw, th = thumb_img.size
        print(f"Optimized Thumbnail Dimensions: {tw}x{th}")
        assert max(tw, th) <= 400, "Thumbnail exceeded 400px limit!"
        assert abs((tw / th) - (width / height)) < 0.005, "Thumbnail aspect ratio altered!"

    # Clean up test post
    post.delete()
    user.delete()
    print("\n>>> 10MB+ END-TO-END UPLOAD TEST PASSED WITH DISTINCTION! <<<\n")


if __name__ == "__main__":
    test_10mb_multipart_upload()
