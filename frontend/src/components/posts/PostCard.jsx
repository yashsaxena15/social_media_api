import React, { useState, useEffect, useContext } from 'react';
import { Heart, MessageCircle, Pencil, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axiosInstance';
import EditPostModal from './EditPostModal';
import PostImageCarousel from './PostImageCarousel';

const PostCard = ({ post, onLikeToggle, onPostUpdated, onSaveToggle }) => {
  const { user } = useContext(AuthContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [isSaved, setIsSaved] = useState(!!post.is_saved);

  useEffect(() => {
    setIsSaved(!!post.is_saved);
  }, [post.is_saved]);

  const { 
    id, 
    username, 
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

  const handlePostUpdated = (updatedPost) => {
    setCaption(updatedPost.caption);
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
  };

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const previousState = isSaved;
    const nextState = !isSaved;
    setIsSaved(nextState);
    if (onSaveToggle) {
      onSaveToggle(id, nextState);
    }
    try {
      const res = await api.post(`posts/${id}/save/`);
      if (typeof res.data?.is_saved === 'boolean') {
        setIsSaved(res.data.is_saved);
        if (onSaveToggle && res.data.is_saved !== nextState) {
          onSaveToggle(id, res.data.is_saved);
        }
      }
    } catch (err) {
      console.error('Failed to toggle save post', err);
      setIsSaved(previousState);
      if (onSaveToggle) {
        onSaveToggle(id, previousState);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 mb-6 overflow-hidden transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
        <Link to={`/profile/${username}`} className="flex items-center gap-3">
          {post.profile_image ? (
            <img 
              src={getImageUrl(post.profile_image)} 
              alt={`${username}'s avatar`} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-lg">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100 hover:underline">{username}</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(created_at)}</p>
          </div>
        </Link>

        {/* Edit Button (post author only) */}
        {user && user.username === username && (
          <button
            onClick={() => setShowEditModal(true)}
            className="text-gray-400 dark:text-slate-500 hover:text-brand-blue dark:hover:text-brand-teal p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit post"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content — clicking caption goes to post detail */}
      <Link to={`/posts/${id}`} className="block px-4 pt-3">
        {caption && <p className="text-gray-800 dark:text-slate-200 mb-3 whitespace-pre-wrap hover:text-gray-600 dark:hover:text-slate-300">{caption}</p>}
      </Link>

      {/* Image / Carousel */}
      <PostImageCarousel post={{ ...post, caption }} linkToDetail={true} />

      {/* Actions */}
      <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onLikeToggle && onLikeToggle(id)}
            className={`flex items-center gap-2 group transition-colors cursor-pointer ${
              is_liked ? 'text-red-500' : 'text-gray-500 dark:text-slate-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-6 h-6 transition-transform group-hover:scale-110 ${is_liked ? 'fill-current' : ''}`} />
            <span className="font-medium">{like_count}</span>
          </button>

          <Link to={`/posts/${id}`} className="flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-brand-blue dark:hover:text-brand-teal group transition-colors">
            <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="font-medium">{comment_count} comments</span>
          </Link>
        </div>

        {/* Bookmark / Save Button */}
        <button
          onClick={handleSaveToggle}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isSaved
              ? 'text-brand-purple dark:text-brand-teal hover:bg-brand-purple/10 dark:hover:bg-brand-teal/10'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
          title={isSaved ? 'Unsave post' : 'Save post'}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
        >
          <Bookmark className={`w-6 h-6 transition-transform hover:scale-110 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={{ ...post, caption }}
          onClose={() => setShowEditModal(false)}
          onUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
};

export default PostCard;
