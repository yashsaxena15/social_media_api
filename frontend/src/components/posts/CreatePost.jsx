import React, { useState, useRef } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import api from '../../api/axiosInstance';
import FileErrorModal from '../common/FileErrorModal';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const CreatePost = ({ onPostCreated }) => {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isExtensionSvg = file.name.toLowerCase().endsWith('.svg');
      if (file.type === 'image/svg+xml' || isExtensionSvg || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        clearImage();
        setShowErrorModal(true);
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !image) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (caption.trim()) formData.append('caption', caption);
      if (image) formData.append('image', image);

      // POST to /api/posts/ to create a post
      const response = await api.post('posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear form
      setCaption('');
      clearImage();
      
      // Notify parent component to refresh feed or add post directly
      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (error) {
      console.error('Error creating post', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4 mb-6 transition-colors">
      <form onSubmit={handleSubmit}>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full resize-none outline-none bg-transparent text-gray-700 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-lg mb-2"
          rows={3}
        />
        
        {preview && (
          <div className="relative mb-4">
            <img src={preview} alt="Upload preview" className="max-h-64 rounded-lg object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3">
          <div className="flex items-center">
            <input
              type="file"
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
              <span className="font-medium">Photo</span>
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || (!caption.trim() && !image)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-purple to-brand-teal text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Posting...' : (
              <>
                <Send className="w-4 h-4" />
                Post
              </>
            )}
          </button>
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
