import os
import io
from PIL import Image, ImageOps, ImageSequence
from django.core.files.base import ContentFile
from rest_framework.exceptions import ValidationError

MAX_POST_DIMENSION = 2048
MAX_AVATAR_DIMENSION = 800
MAX_THUMBNAIL_DIMENSION = 400
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "GIF"}


def validate_image_file(uploaded_file):
    """
    Validates that the uploaded file is a supported image and within size limits.
    Resets the file pointer after checking.
    """
    if uploaded_file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File size exceeds the 25MB limit (current: {uploaded_file.size / (1024 * 1024):.1f}MB)."
        )

    try:
        uploaded_file.seek(0)
        img = Image.open(uploaded_file)
        img.verify()
        format_name = (img.format or "").upper()
        if format_name not in ALLOWED_FORMATS:
            raise ValidationError(
                f"Unsupported image format: '{format_name}'. Allowed formats are JPEG, PNG, WEBP, and GIF."
            )
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(f"The uploaded file is not a valid or readable image: {str(e)}")
    finally:
        uploaded_file.seek(0)


def _calculate_proportional_dimensions(width, height, max_dimension):
    """
    Calculates proportional dimensions maintaining the exact aspect ratio.
    Never upscales if the image is already within max_dimension.
    """
    longest_edge = max(width, height)
    if longest_edge <= max_dimension:
        return width, height

    scale = max_dimension / float(longest_edge)
    new_width = max(1, int(round(width * scale)))
    new_height = max(1, int(round(height * scale)))
    return new_width, new_height


def _clean_mode_for_format(img, target_format):
    """
    Ensures the image color mode is compatible with the target format.
    - JPEG: Must be RGB or L. Blends transparency over white if converting from RGBA.
    - PNG/WEBP: Preserves RGBA/RGB/L.
    """
    target_format = target_format.upper()

    if target_format in ("JPEG", "JPG"):
        if img.mode in ("RGBA", "LA", "P"):
            # Create a clean white background for transparency blending
            if img.mode == "P":
                img = img.convert("RGBA")

            if "A" in img.mode:
                background = Image.new("RGB", img.size, (255, 255, 255))
                alpha_channel = img.split()[-1]
                background.paste(img, mask=alpha_channel)
                return background
            return img.convert("RGB")
        elif img.mode not in ("RGB", "L"):
            return img.convert("RGB")
        return img

    if target_format == "WEBP":
        if img.mode not in ("RGB", "RGBA"):
            return img.convert("RGBA" if "A" in img.mode else "RGB")
        return img

    if target_format == "PNG":
        if img.mode not in ("RGB", "RGBA", "L", "LA", "P"):
            return img.convert("RGBA" if "A" in img.mode else "RGB")
        return img

    return img


def optimize_image(
    uploaded_file,
    max_dimension=MAX_POST_DIMENSION,
    quality=88,
    name_suffix=""
):
    """
    Optimizes an uploaded image:
    1. Corrects EXIF orientation.
    2. Preserves exact aspect ratio, downscaling with high-quality LANCZOS only if > max_dimension.
    3. Never upscales smaller images.
    4. Respects original format (JPEG, PNG, WEBP, GIF) with appropriate high-quality encoding.
    5. Returns a Django ContentFile.
    """
    validate_image_file(uploaded_file)

    uploaded_file.seek(0)
    raw_img = Image.open(uploaded_file)

    # Detect format
    orig_format = (raw_img.format or "JPEG").upper()
    if orig_format == "JPG":
        orig_format = "JPEG"
    if orig_format not in ALLOWED_FORMATS:
        orig_format = "JPEG"

    # Auto-orient based on camera EXIF tags
    try:
        img = ImageOps.exif_transpose(raw_img)
    except Exception:
        img = raw_img

    orig_width, orig_height = img.size
    target_width, target_height = _calculate_proportional_dimensions(
        orig_width, orig_height, max_dimension
    )

    should_resize = (target_width, target_height) != (orig_width, orig_height)

    # Handle animated GIFs
    is_animated_gif = orig_format == "GIF" and getattr(raw_img, "is_animated", False)

    out_io = io.BytesIO()

    if is_animated_gif:
        frames = []
        for frame in ImageSequence.Iterator(raw_img):
            f = frame.copy()
            if should_resize:
                f = f.resize((target_width, target_height), resample=Image.Resampling.LANCZOS)
            frames.append(f)

        frames[0].save(
            out_io,
            format="GIF",
            save_all=True,
            append_images=frames[1:],
            loop=raw_img.info.get("loop", 0),
            duration=raw_img.info.get("duration", 100),
            optimize=True,
        )
    else:
        if should_resize:
            img = img.resize((target_width, target_height), resample=Image.Resampling.LANCZOS)

        img = _clean_mode_for_format(img, orig_format)

        if orig_format == "JPEG":
            img.save(
                out_io,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
            )
        elif orig_format == "PNG":
            img.save(
                out_io,
                format="PNG",
                optimize=True,
                compress_level=6,
            )
        elif orig_format == "WEBP":
            img.save(
                out_io,
                format="WEBP",
                quality=quality,
                method=6,
            )
        elif orig_format == "GIF":
            img.save(
                out_io,
                format="GIF",
                optimize=True,
            )

    # Compute appropriate filename
    original_name = getattr(uploaded_file, "name", "image.jpg")
    base_name, ext = os.path.splitext(original_name)
    if not ext:
        ext_map = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}
        ext = ext_map.get(orig_format, ".jpg")

    file_name = f"{base_name}{name_suffix}{ext}"

    uploaded_file.seek(0)
    return ContentFile(out_io.getvalue(), name=file_name)


def optimize_post_image(uploaded_file):
    """
    Processes a post upload:
    - Main image: high resolution (up to 2048px), quality 88.
    - Thumbnail derivative: fast-loading preview (up to 400px), quality 85.
    Returns: (optimized_main_file, thumbnail_file)
    """
    main_image = optimize_image(
        uploaded_file,
        max_dimension=MAX_POST_DIMENSION,
        quality=88,
    )
    thumbnail_image = optimize_image(
        uploaded_file,
        max_dimension=MAX_THUMBNAIL_DIMENSION,
        quality=85,
        name_suffix="_thumb",
    )
    return main_image, thumbnail_image


def optimize_avatar_image(uploaded_file):
    """
    Processes a user avatar upload:
    - Avatar image: up to 800px, quality 88.
    Returns: optimized_avatar_file
    """
    return optimize_image(
        uploaded_file,
        max_dimension=MAX_AVATAR_DIMENSION,
        quality=88,
    )
