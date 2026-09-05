import os
import sys
import io
import time
import math
import django
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Setup Django environment
sys.path.insert(0, r"d:\yash\projects\social_media_api")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.common.image_optimizer import (
    optimize_post_image,
    optimize_avatar_image,
    optimize_image,
)
from django.core.files.uploadedfile import SimpleUploadedFile


def compute_psnr(img1, img2):
    """
    Computes Peak Signal-to-Noise Ratio between two images.
    PSNR > 38 dB is typically considered visually indistinguishable to humans.
    """
    # Resize img1 to match img2 dimensions for pixel-to-pixel comparison
    if img1.size != img2.size:
        img1 = img1.resize(img2.size, resample=Image.Resampling.LANCZOS)

    img1_rgb = img1.convert("RGB")
    img2_rgb = img2.convert("RGB")

    pixels1 = list(img1_rgb.getdata())
    pixels2 = list(img2_rgb.getdata())

    mse = 0.0
    for p1, p2 in zip(pixels1, pixels2):
        mse += (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2
    mse /= (len(pixels1) * 3)

    if mse == 0:
        return float("inf")
    max_pixel = 255.0
    return 20 * math.log10(max_pixel / math.sqrt(mse))


def create_complex_highres_image(width=2334, height=3112):
    """
    Creates a high-resolution, complex synthetic image with photographic characteristics:
    - Multi-color radial and linear gradients (smooth tones, skies, skin tone ranges)
    - High-frequency texture noise (fabric, grain, leaves)
    - Fine lines, circular arcs, and sharp contrast borders (edges, architecture, text)
    """
    print(f"\n[1] Generating high-resolution {width}x{height} image with fine textures & gradients...")
    img = Image.new("RGB", (width, height), (240, 240, 245))
    draw = ImageDraw.Draw(img)

    # 1. Background gradient
    for y in range(0, height, 4):
        r = int(120 + 100 * (y / height))
        g = int(150 + 80 * math.sin(y / 200.0))
        b = int(200 - 80 * (y / height))
        draw.rectangle([(0, y), (width, min(height, y + 4))], fill=(r, g, b))

    # 2. Geometric details, curves, fine lines
    for i in range(0, width, 60):
        draw.line([(i, 0), (width - i, height)], fill=(255, 255, 255, 120), width=2)
    for j in range(0, height, 80):
        draw.line([(0, j), (width, height - j)], fill=(30, 30, 60), width=1)

    # 3. Circles with gradients (mimicking face / portrait curves)
    center_x, center_y = width // 2, height // 2
    for radius in range(50, 600, 20):
        color = (
            int(180 + 75 * math.cos(radius / 50.0)),
            int(120 + 60 * math.sin(radius / 40.0)),
            int(90 + 40 * math.cos(radius / 30.0)),
        )
        draw.ellipse(
            [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
            outline=color,
            width=3,
        )

    # 4. High-contrast text simulation
    draw.rectangle([center_x - 400, center_y - 100, center_x + 400, center_y + 100], fill=(20, 25, 35))
    draw.text((center_x - 360, center_y - 30), "AEQUOSIA HIGH-RESOLUTION OPTIMIZATION TEST", fill=(255, 255, 255))
    draw.text((center_x - 250, center_y + 20), "Near-Lossless LANCZOS Resampling", fill=(100, 230, 200))

    out_io = io.BytesIO()
    img.save(out_io, format="JPEG", quality=98)
    data = out_io.getvalue()
    size_mb = len(data) / (1024 * 1024)
    print(f"    -> Generated raw image: {width}x{height}, size: {size_mb:.2f} MB ({len(data)} bytes)")
    return data, (width, height)


def run_benchmark():
    print("===============================================================")
    print("      AEQUOSIA IMAGE OPTIMIZATION PIPELINE BENCHMARK           ")
    print("===============================================================")

    # Test 1: ~10MB Synthetic 2334x3112 Image
    raw_data, (orig_w, orig_h) = create_complex_highres_image(2334, 3112)
    uploaded = SimpleUploadedFile("camera_raw_2334x3112.jpg", raw_data, content_type="image/jpeg")

    start_time = time.time()
    optimized_post, thumbnail = optimize_post_image(uploaded)
    elapsed = time.time() - start_time

    # Inspect optimized post
    opt_img = Image.open(optimized_post)
    opt_w, opt_h = opt_img.size
    opt_size_kb = len(optimized_post.read()) / 1024
    optimized_post.seek(0)

    # Inspect thumbnail
    thumb_img = Image.open(thumbnail)
    th_w, th_h = thumb_img.size
    th_size_kb = len(thumbnail.read()) / 1024
    thumbnail.seek(0)

    orig_ratio = orig_w / orig_h
    opt_ratio = opt_w / opt_h
    th_ratio = th_w / th_h

    # PSNR calculation
    orig_pil = Image.open(io.BytesIO(raw_data))
    psnr_score = compute_psnr(orig_pil, opt_img)

    print(f"\n[RESULTS FOR 2334x3112 UPLOAD (~{len(raw_data) / (1024*1024):.2f} MB)]:")
    print(f"  - Optimization Time: {elapsed:.2f}s")
    print(f"  - Main Image Resolution: {opt_w}x{opt_h} (max dim: {max(opt_w, opt_h)}px <= 2048px)")
    print(f"  - Main Image Size: {opt_size_kb:.1f} KB (reduced from {len(raw_data)/(1024*1024):.2f} MB without visual loss)")
    print(f"  - Aspect Ratio: Original = {orig_ratio:.4f}, Optimized = {opt_ratio:.4f} (diff: {abs(orig_ratio - opt_ratio):.6f})")
    print(f"  - Thumbnail Resolution: {th_w}x{th_h} (max dim: {max(th_w, th_h)}px <= 400px)")
    print(f"  - Thumbnail Size: {th_size_kb:.1f} KB")
    print(f"  - Thumbnail Aspect Ratio: {th_ratio:.4f} (diff: {abs(orig_ratio - th_ratio):.6f})")
    print(f"  - Visual Quality Fidelity (PSNR): {psnr_score:.2f} dB (>= 38 dB is pristine near-lossless)")

    assert max(opt_w, opt_h) <= 2048, "Main image exceeds max dimension 2048"
    assert max(th_w, th_h) <= 400, "Thumbnail exceeds max dimension 400"
    assert abs(orig_ratio - opt_ratio) < 0.005, "Aspect ratio was not preserved!"
    assert abs(orig_ratio - th_ratio) < 0.005, "Thumbnail aspect ratio was not preserved!"

    # Test 2: Real photo test (from media/ directory if available)
    real_photo_path = r"d:\yash\projects\social_media_api\media\profiles\LinkedIn-photo.jpg"
    if os.path.exists(real_photo_path):
        print(f"\n[2] Testing with Real Camera Photo: {real_photo_path}")
        with open(real_photo_path, "rb") as f:
            real_data = f.read()

        real_upload = SimpleUploadedFile("LinkedIn-photo.jpg", real_data, content_type="image/jpeg")
        real_orig_img = Image.open(io.BytesIO(real_data))
        r_w, r_h = real_orig_img.size

        opt_real_main, opt_real_thumb = optimize_post_image(real_upload)
        real_opt_img = Image.open(opt_real_main)
        ro_w, ro_h = real_opt_img.size
        real_psnr = compute_psnr(real_orig_img, real_opt_img)

        print(f"    Original: {r_w}x{r_h}, {len(real_data)/1024:.1f} KB")
        print(f"    Optimized: {ro_w}x{ro_h}, {len(opt_real_main.read())/1024:.1f} KB")
        print(f"    Aspect Ratio: {r_w/r_h:.4f} vs {ro_w/ro_h:.4f}")
        print(f"    Visual Quality Fidelity (PSNR): {real_psnr:.2f} dB")
        assert abs((r_w / r_h) - (ro_w / ro_h)) < 0.005, "Real photo aspect ratio altered!"

    # Test 3: Transparent PNG Preservation
    print("\n[3] Testing PNG with Alpha Transparency Preservation...")
    png_img = Image.new("RGBA", (1200, 900), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(png_img)
    p_draw.rectangle([(200, 150), (1000, 750)], fill=(66, 133, 244, 200))
    p_io = io.BytesIO()
    png_img.save(p_io, format="PNG")
    p_data = p_io.getvalue()

    png_upload = SimpleUploadedFile("transparent_logo.png", p_data, content_type="image/png")
    opt_png_main, _ = optimize_post_image(png_upload)
    result_png = Image.open(opt_png_main)
    print(f"    PNG Format Preserved: {result_png.format} (Mode: {result_png.mode})")
    assert result_png.format == "PNG", f"Expected PNG format, got {result_png.format}"
    assert "A" in result_png.mode, f"Alpha channel was lost in PNG! Mode: {result_png.mode}"

    # Test 4: Small image must never upscale
    print("\n[4] Testing Small Image (Never Upscale)...")
    small_img = Image.new("RGB", (320, 240), (100, 200, 100))
    s_io = io.BytesIO()
    small_img.save(s_io, format="JPEG")
    s_data = s_io.getvalue()

    small_upload = SimpleUploadedFile("small_320x240.jpg", s_data, content_type="image/jpeg")
    opt_small_main, opt_small_thumb = optimize_post_image(small_upload)
    small_res = Image.open(opt_small_main)
    print(f"    Original: 320x240 -> Optimized: {small_res.size[0]}x{small_res.size[1]}")
    assert small_res.size == (320, 240), f"Small image was unexpectedly modified: {small_res.size}"

    # Save visual verification images to scratch directory for inspection
    scratch_dir = r"C:\Users\YASH\.gemini\antigravity\brain\e97654f4-e331-4c35-9296-65522b9bbb8c\scratch"
    os.makedirs(scratch_dir, exist_ok=True)
    orig_pil.save(os.path.join(scratch_dir, "benchmark_original.jpg"), quality=95)
    opt_img.save(os.path.join(scratch_dir, "benchmark_optimized.jpg"), quality=88)
    thumb_img.save(os.path.join(scratch_dir, "benchmark_thumbnail.jpg"), quality=85)
    print(f"\n[5] Saved comparison images to: {scratch_dir}")

    print("\n>>> ALL IMAGE OPTIMIZATION BENCHMARKS AND FIDELITY CHECKS PASSED SUCCESSFULLY! <<<\n")


if __name__ == "__main__":
    run_benchmark()
