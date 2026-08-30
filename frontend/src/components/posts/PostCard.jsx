import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';

const PostCard = ({ post, onLikeToggle }) => {
  const { 
    id, 
    username, 
    caption, 
    image, 
    like_count, 
    is_liked, 
    comment_count, 
    created_at 
  } = post;

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <Link to={`/profile/${username}`} className="flex items-center gap-3">
          {post.profile_image ? (
            <img 
              src={getImageUrl(post.profile_image)} 
              alt={`${username}'s avatar`} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-gray-900 hover:underline">{username}</h3>
            <p className="text-xs text-gray-500">{formatDate(created_at)}</p>
          </div>
        </Link>
      </div>

      {/* Content — clicking caption goes to post detail */}
      <Link to={`/posts/${id}`} className="block px-4 pt-3">
        {caption && <p className="text-gray-800 mb-3 whitespace-pre-wrap hover:text-gray-600">{caption}</p>}
      </Link>

      {/* Image — clicking image goes to post detail */}
      {image && (
        <Link to={`/posts/${id}`} className="block w-full bg-gray-50">
          <img src={image} alt="Post content" className="max-h-[500px] w-full object-cover" />
        </Link>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center gap-6 border-t border-gray-100">
        <button 
          onClick={() => onLikeToggle && onLikeToggle(id)}
          className={`flex items-center gap-2 group transition-colors ${
            is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <Heart className={`w-6 h-6 transition-transform group-hover:scale-110 ${is_liked ? 'fill-current' : ''}`} />
          <span className="font-medium">{like_count}</span>
        </button>

        <Link to={`/posts/${id}`} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 group transition-colors">
          <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="font-medium">{comment_count} comments</span>
        </Link>
      </div>
    </div>
  );
};

export default PostCard;
