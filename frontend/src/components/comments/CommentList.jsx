import React, { useState, useContext } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';

const CommentList = ({ comments, onEdit, onDelete }) => {
  const { user } = useContext(AuthContext);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingId, setSavingId] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim() || !onEdit) return;
    setSavingId(commentId);
    try {
      await onEdit(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to save comment edit', err);
    } finally {
      setSavingId(null);
    }
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-slate-400 py-4 text-sm">
        No comments yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">Comments</h3>
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 items-start">
          {/* Avatar */}
          <Link to={`/profile/${comment.username}`} className="flex-shrink-0">
            {comment.profile_image ? (
              <img 
                src={getImageUrl(comment.profile_image)} 
                alt={`${comment.username}'s avatar`} 
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-sm">
                {comment.username ? comment.username.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </Link>
          
          {/* Comment Content */}
          <div className="flex-1 bg-gray-50 dark:bg-slate-800/70 rounded-2xl px-4 py-2.5 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <Link to={`/profile/${comment.username}`} className="font-semibold text-gray-900 dark:text-slate-100 text-sm hover:underline">
                  {comment.username}
                </Link>
                <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">{formatDate(comment.created_at)}</span>
              </div>
              
              {/* Action Buttons (Edit & Delete for comment owner) */}
              {user && user.username === comment.username && editingId !== comment.id && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="text-gray-400 dark:text-slate-500 hover:text-brand-blue dark:hover:text-brand-teal transition-colors p-1"
                    title="Edit comment"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Comment Body or Inline Editor */}
            {editingId === comment.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-sm p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 text-xs font-medium rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editText.trim() || savingId === comment.id}
                    onClick={() => handleSaveEdit(comment.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md text-white bg-gradient-to-r from-brand-purple to-brand-teal hover:opacity-90 disabled:opacity-50 transition-colors"
                  >
                    {savingId === comment.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-800 dark:text-slate-200 text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
