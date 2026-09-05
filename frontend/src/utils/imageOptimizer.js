/**
 * Instagram-Style Client-Side Image Pre-processor
 *
 * Prioritizes visual quality first:
 * - Preserves exact aspect ratio.
 * - Never upscales images smaller than maxDimension.
 * - High-quality canvas resampling (imageSmoothingQuality: 'high').
 * - Preserves appropriate image formats (JPEG -> JPEG, PNG with transparency -> PNG, WebP -> WebP, animated GIF -> untouched).
 * - High-quality encoding (quality 0.88) avoids aggressive compression artifacts while preventing network timeouts on 10MB+ uploads.
 */

const MAX_POST_DIMENSION = 2048;
const MAX_AVATAR_DIMENSION = 800;

/**
 * Checks if a PNG image contains transparent pixels.
 */
function checkTransparency(canvas, ctx) {
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 255) {
        return true;
      }
    }
  } catch (e) {
    // Canvas might be tainted or out of memory; default to preserving PNG
    return true;
  }
  return false;
}

/**
 * Optimizes an image File before network upload.
 *
 * @param {File} file - Original file from input element
 * @param {Object} options
 * @param {number} [options.maxDimension=2048] - Max pixel length for width or height
 * @param {number} [options.quality=0.88] - Compression quality (0 to 1)
 * @param {boolean} [options.isAvatar=false] - If true, max dimension defaults to 800px
 * @returns {Promise<File>} Optimized File object (or original if optimization not required)
 */
export async function optimizeImageForUpload(file, options = {}) {
  if (!file || !(file instanceof File)) {
    return file;
  }

  // Preserve animated GIFs without stripping animation frames
  if (file.type === 'image/gif') {
    return file;
  }

  const maxDimension = options.isAvatar
    ? (options.maxDimension || MAX_AVATAR_DIMENSION)
    : (options.maxDimension || MAX_POST_DIMENSION);

  const quality = options.quality ?? 0.88;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;

      // If dimensions are within limit and file is not gigantic (< 2MB), keep original
      const longestEdge = Math.max(origWidth, origHeight);
      if (longestEdge <= maxDimension && file.size < 2 * 1024 * 1024) {
        return resolve(file);
      }

      // Calculate proportional dimensions strictly preserving aspect ratio
      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (longestEdge > maxDimension) {
        const scale = maxDimension / longestEdge;
        targetWidth = Math.max(1, Math.round(origWidth * scale));
        targetHeight = Math.max(1, Math.round(origHeight * scale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Decide output mime type intelligently based on input
      let outputType = file.type || 'image/jpeg';
      let hasAlpha = false;

      if (outputType === 'image/png') {
        // Draw first to inspect alpha if needed
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        hasAlpha = checkTransparency(canvas, ctx);
        if (!hasAlpha) {
          // Opaque PNG photo can safely be converted to high-quality JPEG for substantial size saving
          outputType = 'image/jpeg';
        }
      } else {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      // If converting to JPEG or JPEG input, ensure white background behind any translucent pixels
      if (outputType === 'image/jpeg') {
        // Redraw with white backing if source might have had alpha
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = targetWidth;
        fillCanvas.height = targetHeight;
        const fillCtx = fillCanvas.getContext('2d');
        fillCtx.fillStyle = '#FFFFFF';
        fillCtx.fillRect(0, 0, targetWidth, targetHeight);
        fillCtx.imageSmoothingEnabled = true;
        fillCtx.imageSmoothingQuality = 'high';
        fillCtx.drawImage(canvas, 0, 0);

        fillCanvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          quality
        );
        return;
      }

      // For PNG / WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name, { type: outputType, lastModified: Date.now() }));
        },
        outputType,
        outputType === 'image/png' ? undefined : quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original file on load error
    };

    img.src = objectUrl;
  });
}
