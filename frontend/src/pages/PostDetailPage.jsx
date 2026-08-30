import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import CommentForm from '../components/comments/CommentForm';
import CommentList from '../components/comments/CommentList';
import { getImageUrl } from '../utils/imageUrl';

const PostDetailPage = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const fetchPost = async () => {
    try {
      const response = await api.get(`posts/${id}/`);
      setPost(response.data);
    } catch (error) {
      console.error('Failed to fetch post', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`posts/${id}/comments/`);
      const data = response.data.results ? response.data.results : response.data;
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPost(), fetchComments()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleLikeToggle = async () => {
    if (!post) return;
    // Optimistic update
    setPost(prev => ({
      ...prev,
      is_liked: !prev.is_liked,
      like_count: prev.is_liked ? prev.like_count - 1 : prev.like_count + 1
    }));
    try {
      await api.post(`posts/${id}/like/`);
    } catch (error) {
      console.error('Like toggle failed', error);
      // Revert on error
      setPost(prev => ({
        ...prev,
        is_liked: !prev.is_liked,
        like_count: prev.is_liked ? prev.like_count - 1 : prev.like_count + 1
      }));
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`posts/${id}/`);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete post', error);
      alert('Failed to delete post.');
    }
  };

  const handleCommentAdded = (newComment) => {
    setComments(prev => [...prev, newComment]);
    setPost(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`posts/${id}/comments/${commentId}/`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => ({ ...prev, comment_count: prev.comment_count - 1 }));
    } catch (error) {
      console.error('Failed to delete comment', error);
      alert('Failed to delete comment.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center p-8 text-gray-500">
        Post not found. <Link to="/" className="text-brand-blue underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-brand-blue mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Post Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <Link to={`/profile/${post.username}`} className="flex items-center gap-3">
            {post.profile_image ? (
              <img 
                src={getImageUrl(post.profile_image)} 
                alt={`${post.username}'s avatar`} 
                className="w-11 h-11 rounded-full object-cover border border-gray-200" 
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-lg">
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-900 hover:underline">{post.username}</h3>
              <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
            </div>
          </Link>

          {/* Delete button (only post owner) */}
          {user && user.username === post.username && (
            <button
              onClick={handleDeletePost}
              className="text-gray-400 hover:text-red-500 transition-colors p-2"
              title="Delete post"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Image */}
        {post.image && (
          <div className="w-full bg-gray-50 flex justify-center">
            <img src={post.image} alt="Post" className="max-h-[600px] w-full object-cover" />
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="p-4">
            <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">
              <span className="font-semibold mr-2">{post.username}</span>
              {post.caption}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-6 border-t border-gray-100">
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-2 group transition-colors ${
              post.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart
              className={`w-7 h-7 transition-transform group-hover:scale-110 ${post.is_liked ? 'fill-current' : ''}`}
            />
            <span className="font-semibold text-sm">{post.like_count} likes</span>
          </button>

          <div className="flex items-center gap-2 text-gray-500">
            <MessageCircle className="w-6 h-6" />
            <span className="font-semibold text-sm">{post.comment_count} comments</span>
          </div>
        </div>

        {/* Comment Section */}
        <div className="px-4 pb-6 border-t border-gray-100 pt-4">
          <CommentList comments={comments} onDelete={handleCommentDelete} />
          <CommentForm postId={id} onCommentAdded={handleCommentAdded} />
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
