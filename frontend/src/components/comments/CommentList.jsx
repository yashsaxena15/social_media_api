import React, { useContext } from 'react';
import { Trash2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';

const CommentList = ({ comments, onDelete }) => {
  const { user } = useContext(AuthContext);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4 text-sm">
        No comments yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="font-semibold text-gray-800 mb-2">Comments</h3>
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 items-start">
          {/* Avatar */}
          <Link to={`/profile/${comment.username}`} className="flex-shrink-0">
            {comment.profile_image ? (
              <img 
                src={getImageUrl(comment.profile_image)} 
                alt={`${comment.username}'s avatar`} 
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-sm">
                {comment.username ? comment.username.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </Link>
          
          {/* Comment Content */}
          <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2">
            <div className="flex justify-between items-start">
              <div>
                <Link to={`/profile/${comment.username}`} className="font-semibold text-gray-900 text-sm hover:underline">
                  {comment.username}
                </Link>
                <span className="text-xs text-gray-500 ml-2">{formatDate(comment.created_at)}</span>
              </div>
              
              {/* Delete Button (Only if user owns the comment) */}
              {user && user.username === comment.username && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
