import os
import sys
import io
import django
from PIL import Image, ImageDraw

sys.path.insert(0, r"d:\yash\projects\social_media_api")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.common.image_optimizer import optimize_post_image
from django.core.files.uploadedfile import SimpleUploadedFile

width, height = 4000, 3000
img = Image.new("RGB", (width, height))
draw = ImageDraw.Draw(img)
for y in range(0, height, 8):
    draw.rectangle([(0, y), (width, y + 4)], fill=((y * 3) % 256, (y * 7) % 256, (y * 11) % 256))
for x in range(0, width, 50):
    draw.line([(x, 0), (x, height)], fill=((x * 5) % 256, 255 - (x * 2) % 256, 128), width=3)
draw.text((width // 2 - 200, height // 2), "10MB REALISTIC CAMERA IMAGE TEST", fill=(255, 255, 255))

out_io = io.BytesIO()
img.save(out_io, format="JPEG", quality=99, subsampling=0)
raw_bytes = out_io.getvalue()
orig_size = len(raw_bytes)

uploaded_file = SimpleUploadedFile("camera_photo.jpg", raw_bytes, content_type="image/jpeg")
main_img, thumb_img = optimize_post_image(uploaded_file)

main_size = len(main_img.read())
thumb_size = len(thumb_img.read())

print("=== EXACT MEASUREMENTS ===")
print(f"Original: {orig_size:,} bytes ({orig_size / (1024*1024):.2f} MB / {orig_size / 1024:.2f} KB)")
print(f"Optimized Main (2048x1536): {main_size:,} bytes ({main_size / (1024*1024):.2f} MB / {main_size / 1024:.2f} KB)")
print(f"Optimized Thumbnail (400x300): {thumb_size:,} bytes ({thumb_size / (1024*1024):.4f} MB / {thumb_size / 1024:.2f} KB)")

main_reduction = (1 - (main_size / orig_size)) * 100
total_combined = main_size + thumb_size
total_reduction = (1 - (total_combined / orig_size)) * 100

print(f"Main Image Storage Reduction: {main_reduction:.2f}%")
print(f"Combined (Main + Thumbnail) Storage Reduction: {total_reduction:.2f}%")
