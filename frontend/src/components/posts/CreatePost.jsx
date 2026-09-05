import React, { useState, useRef } from 'react';
import { ImagePlus, Send, MessageSquare, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import FileErrorModal from '../common/FileErrorModal';
import { optimizeImageForUpload } from '../../utils/imageOptimizer';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const CreatePost = ({ onPostCreated, mode, onClose }) => {
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef(null);

  const isTweetMode = mode === 'tweet';
  const isPostMode = mode === 'post';

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const newPreviews = [];
    let hasInvalid = false;

    for (const file of files) {
      const isExtensionSvg = file.name.toLowerCase().endsWith('.svg');
      if (file.type === 'image/svg+xml' || isExtensionSvg || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        hasInvalid = true;
      } else {
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }

    if (hasInvalid) {
      setShowErrorModal(true);
    }

    if (validFiles.length > 0) {
      setError('');
      setImages((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[indexToRemove]);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const clearAllImages = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setImages([]);
    setPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (isTweetMode) {
      return !caption.trim();
    }
    if (isPostMode) {
      return images.length === 0;
    }
    return !caption.trim() && images.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitDisabled()) return;

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (caption.trim()) formData.append('caption', caption.trim());

      if (!isTweetMode && images.length > 0) {
        for (const imgFile of images) {
          const optimizedImage = await optimizeImageForUpload(imgFile, {
            maxDimension: 2048,
            quality: 0.88,
          });
          formData.append('images', optimizedImage);
        }
        // Also provide primary image for backward compatibility
        const firstOpt = await optimizeImageForUpload(images[0], {
          maxDimension: 2048,
          quality: 0.88,
        });
        formData.append('image', firstOpt);
      }

      // POST to /api/posts/ to create a post
      const response = await api.post('posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear form
      setCaption('');
      clearAllImages();

      // Notify parent component to refresh feed or add post directly
      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (err) {
      console.error('Error creating post', err);
      let errMsg = isTweetMode ? 'Failed to create tweet. Please try again.' : 'Failed to create post. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.image) {
          errMsg = Array.isArray(err.response.data.image) ? err.response.data.image[0] : err.response.data.image;
        } else if (err.response.data.caption) {
          errMsg = Array.isArray(err.response.data.caption) ? err.response.data.caption[0] : err.response.data.caption;
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const placeholderText = isTweetMode
    ? "What's happening?"
    : isPostMode
    ? 'Write a caption for your post...'
    : "What's on your mind?";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4 mb-6 transition-colors">
      {/* Header if mode or onClose is provided */}
      {(mode || onClose) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isTweetMode ? (
              <>
                <MessageSquare className="w-4 h-4 text-brand-purple dark:text-brand-teal" />
                <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">Create Tweet</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Text only
                </span>
              </>
            ) : isPostMode ? (
              <>
                <ImagePlus className="w-4 h-4 text-brand-purple dark:text-brand-teal" />
                <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">Create Post</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Image + caption
                </span>
              </>
            ) : (
              <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">New Content</span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Close composer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={placeholderText}
          className="w-full resize-none outline-none bg-transparent text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-lg mb-2"
          rows={isTweetMode ? 4 : 3}
          maxLength={300}
        />

        {/* Character count indicator for tweets */}
        {isTweetMode && (
          <div className="flex justify-end mb-2">
            <span className={`text-xs ${caption.length > 280 ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
              {caption.length}/300
            </span>
          </div>
        )}

        {/* Previews (hidden for tweet mode) */}
        {!isTweetMode && previews.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {previews.map((previewUrl, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt={`Upload preview ${idx + 1}`}
                    className="h-28 w-28 rounded-lg object-cover border border-gray-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm transition-colors"
                  >
                    &times;
                  </button>
                  {previews.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.2 rounded font-semibold pointer-events-none">
                      {idx + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post mode notice when no image selected */}
        {isPostMode && images.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mb-3 p-4 border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-brand-purple dark:hover:border-brand-teal rounded-lg cursor-pointer flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 transition-colors"
          >
            <ImagePlus className="w-8 h-8 text-brand-purple dark:text-brand-teal mb-1.5" />
            <span className="text-sm font-medium">Click to select photos for your post</span>
            <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">JPEG, PNG, WebP or GIF</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
          <div className="flex items-center">
            {!isTweetMode && (
              <>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-brand-blue dark:text-brand-teal hover:bg-brand-purple/5 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="font-medium">
                    {images.length > 0 ? `Photos (${images.length})` : 'Photos'}
                  </span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitDisabled()}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-purple to-brand-teal text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? (
                isTweetMode ? 'Tweeting...' : 'Posting...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isTweetMode ? 'Tweet' : 'Post'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <FileErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onSelectOther={() => fileInputRef.current?.click()}
      />
    </div>
  );
};

export default CreatePost;

