import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/axiosInstance';

const EditPostModal = ({ post, onClose, onUpdated }) => {
  const [caption, setCaption] = useState(post.caption || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.patch(`posts/${post.id}/`, { caption });
      if (onUpdated) {
        onUpdated(response.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update post', err);
      let errMsg = 'Failed to update post.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.caption) {
          errMsg = Array.isArray(err.response.data.caption) ? err.response.data.caption[0] : err.response.data.caption;
        } else if (err.response.data.error) {
          errMsg = err.response.data.error;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 w-full max-w-md mx-4 p-6 z-10 animate-[fadeIn_0.15s_ease-out] transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Edit Post</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {post.image && (
            <div className="mb-4 max-h-52 overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-950 flex justify-center border border-gray-100 dark:border-slate-800">
              <img src={post.image} alt="Post preview" className="object-cover max-h-52 w-full" />
            </div>
          )}

          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={4}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg p-3 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal text-sm resize-none transition-colors"
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
