import React, { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../../api/axiosInstance';

const CommentForm = ({ postId, onCommentAdded }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(`posts/${postId}/comments/`, {
        text: text.trim()
      });
      setText('');
      if (onCommentAdded) {
        onCommentAdded(response.data);
      }
    } catch (error) {
      console.error('Failed to post comment', error);
      alert('Failed to post comment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-brand-blue text-sm"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="bg-gradient-to-r from-brand-purple to-brand-teal text-white rounded-full p-2 flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-colors"
      >
        <Send className="w-4 h-4 ml-1" />
      </button>
    </form>
  );
};

export default CommentForm;
