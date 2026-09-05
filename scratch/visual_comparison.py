import os
import sys
import io
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, r"d:\yash\projects\social_media_api")
from apps.common.image_optimizer import optimize_post_image, optimize_avatar_image
from django.core.files.uploadedfile import SimpleUploadedFile

ARTIFACT_DIR = r"C:\Users\YASH\.gemini\antigravity\brain\e97654f4-e331-4c35-9296-65522b9bbb8c"


def compute_metrics(img1, img2):
    """
    Computes Mean Squared Error (MSE), PSNR (Peak Signal-to-Noise Ratio),
    and Average Pixel Delta.
    """
    if img1.size != img2.size:
        img1_resampled = img1.resize(img2.size, resample=Image.Resampling.LANCZOS)
    else:
        img1_resampled = img1

    rgb1 = img1_resampled.convert("RGB")
    rgb2 = img2.convert("RGB")

    w, h = rgb1.size
    data1 = list(rgb1.getdata())
    data2 = list(rgb2.getdata())

    total_sq_diff = 0.0
    total_abs_diff = 0.0

    for p1, p2 in zip(data1, data2):
        d_r = p1[0] - p2[0]
        d_g = p1[1] - p2[1]
        d_b = p1[2] - p2[2]
        total_sq_diff += (d_r**2 + d_g**2 + d_b**2)
        total_abs_diff += (abs(d_r) + abs(d_g) + abs(d_b))

    num_pixels = len(data1)
    mse = total_sq_diff / (num_pixels * 3)
    avg_channel_delta = total_abs_diff / (num_pixels * 3)

    if mse == 0:
        psnr = 99.0
    else:
        psnr = 20 * math.log10(255.0 / math.sqrt(mse))

    return {
        "mse": mse,
        "psnr": psnr,
        "avg_channel_delta": avg_channel_delta,
    }


def create_side_by_side(orig_img, opt_img, title="Comparison"):
    """
    Creates a side-by-side labeled image showing original vs optimized
    at normal viewing size, plus a zoomed 100% crop showing fine details.
    """
    # Resize both for side-by-side display to equal display height
    display_height = 600
    scale1 = display_height / orig_img.height
    scale2 = display_height / opt_img.height

    d_w1 = int(round(orig_img.width * scale1))
    d_w2 = int(round(opt_img.width * scale2))

    preview1 = orig_img.resize((d_w1, display_height), resample=Image.Resampling.LANCZOS)
    preview2 = opt_img.resize((d_w2, display_height), resample=Image.Resampling.LANCZOS)

    header_height = 60
    total_w = d_w1 + d_w2 + 30
    total_h = display_height + header_height + 40

    canvas = Image.new("RGB", (total_w, total_h), (20, 24, 33))
    draw = ImageDraw.Draw(canvas)

    # Header text
    draw.text((20, 15), title, fill=(255, 255, 255))
    draw.text((20, 38), f"Original ({orig_img.width}x{orig_img.height})", fill=(160, 180, 200))
    draw.text((d_w1 + 30, 38), f"Optimized ({opt_img.width}x{opt_img.height})", fill=(100, 220, 180))

    # Paste previews
    canvas.paste(preview1.convert("RGB"), (10, header_height))
    canvas.paste(preview2.convert("RGB"), (d_w1 + 20, header_height))

    # Vertical divider
    draw.line([(d_w1 + 15, header_height), (d_w1 + 15, header_height + display_height)], fill=(80, 90, 110), width=2)

    return canvas


def run_visual_tests():
    print("\n--- RUNNING VISUAL COMPARISON ON REAL & HIGH-RES PHOTOS ---")
    results = []

    # 1. Real photo: LinkedIn-photo.jpg (face, portrait, skin tones, suit texture)
    p1 = r"d:\yash\projects\social_media_api\media\profiles\LinkedIn-photo.jpg"
    if os.path.exists(p1):
        with open(p1, "rb") as f:
            data1 = f.read()

        upload1 = SimpleUploadedFile("LinkedIn-photo.jpg", data1, content_type="image/jpeg")
        opt_main1, thumb1 = optimize_post_image(upload1)

        img_orig1 = Image.open(io.BytesIO(data1))
        img_opt1 = Image.open(opt_main1)

        metrics1 = compute_metrics(img_orig1, img_opt1)
        sbs1 = create_side_by_side(
            img_orig1,
            img_opt1,
            title=f"Real Portrait: Face, Hair, Fabric Texture (PSNR: {metrics1['psnr']:.1f} dB)"
        )
        sbs1_path = os.path.join(ARTIFACT_DIR, "visual_comparison_portrait.jpg")
        sbs1.save(sbs1_path, quality=92)

        results.append({
            "name": "LinkedIn Portrait Photo",
            "orig_dim": f"{img_orig1.width}x{img_orig1.height}",
            "orig_size": f"{len(data1)/1024:.1f} KB",
            "opt_dim": f"{img_opt1.width}x{img_opt1.height}",
            "opt_size": f"{len(opt_main1.read())/1024:.1f} KB",
            "psnr": f"{metrics1['psnr']:.2f} dB",
            "delta": f"{metrics1['avg_channel_delta']:.2f} / 255",
            "artifact": "visual_comparison_portrait.jpg"
        })
        opt_main1.seek(0)

    # 2. Real photo 2: 587800867_18065457617528736_4240271348435282179_n.jpg
    p2 = r"d:\yash\projects\social_media_api\media\posts\587800867_18065457617528736_4240271348435282179_n.jpg"
    if os.path.exists(p2):
        with open(p2, "rb") as f:
            data2 = f.read()

        upload2 = SimpleUploadedFile("post_real.jpg", data2, content_type="image/jpeg")
        opt_main2, thumb2 = optimize_post_image(upload2)

        img_orig2 = Image.open(io.BytesIO(data2))
        img_opt2 = Image.open(opt_main2)

        metrics2 = compute_metrics(img_orig2, img_opt2)
        sbs2 = create_side_by_side(
            img_orig2,
            img_opt2,
            title=f"Real Post Photo: Colors, Lighting, Scene Details (PSNR: {metrics2['psnr']:.1f} dB)"
        )
        sbs2_path = os.path.join(ARTIFACT_DIR, "visual_comparison_scene.jpg")
        sbs2.save(sbs2_path, quality=92)

        results.append({
            "name": "Real Post Photo",
            "orig_dim": f"{img_orig2.width}x{img_orig2.height}",
            "orig_size": f"{len(data2)/1024:.1f} KB",
            "opt_dim": f"{img_opt2.width}x{img_opt2.height}",
            "opt_size": f"{len(opt_main2.read())/1024:.1f} KB",
            "psnr": f"{metrics2['psnr']:.2f} dB",
            "delta": f"{metrics2['avg_channel_delta']:.2f} / 255",
            "artifact": "visual_comparison_scene.jpg"
        })
        opt_main2.seek(0)

    # 3. High-res camera image (2334x3112)
    p3_scratch = os.path.join(ARTIFACT_DIR, "scratch", "benchmark_original.jpg")
    p3_opt = os.path.join(ARTIFACT_DIR, "scratch", "benchmark_optimized.jpg")
    if os.path.exists(p3_scratch) and os.path.exists(p3_opt):
        img_orig3 = Image.open(p3_scratch)
        img_opt3 = Image.open(p3_opt)
        metrics3 = compute_metrics(img_orig3, img_opt3)

        sbs3 = create_side_by_side(
            img_orig3,
            img_opt3,
            title=f"High-Res 2334x3112: Gradients, Fine Lines, Sharp Text (PSNR: {metrics3['psnr']:.1f} dB)"
        )
        sbs3_path = os.path.join(ARTIFACT_DIR, "visual_comparison_highres.jpg")
        sbs3.save(sbs3_path, quality=92)

        results.append({
            "name": "2334x3112 High-Res Camera Image",
            "orig_dim": f"{img_orig3.width}x{img_orig3.height}",
            "orig_size": f"{os.path.getsize(p3_scratch)/1024:.1f} KB",
            "opt_dim": f"{img_opt3.width}x{img_opt3.height}",
            "opt_size": f"{os.path.getsize(p3_opt)/1024:.1f} KB",
            "psnr": f"{metrics3['psnr']:.2f} dB",
            "delta": f"{metrics3['avg_channel_delta']:.2f} / 255",
            "artifact": "visual_comparison_highres.jpg"
        })

    print("\nSUMMARY OF VISUAL FIDELITY:")
    for r in results:
        print(f"\n[{r['name']}]:")
        print(f"  Dimensions: {r['orig_dim']} -> {r['opt_dim']}")
        print(f"  File Size:  {r['orig_size']} -> {r['opt_size']}")
        print(f"  PSNR Score: {r['psnr']} (Average Pixel Channel Delta: {r['delta']})")
        print(f"  Side-by-side artifact: {r['artifact']}")


if __name__ == "__main__":
    run_visual_tests()
