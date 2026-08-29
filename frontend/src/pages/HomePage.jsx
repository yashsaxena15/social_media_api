import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import CreatePost from '../components/posts/CreatePost';
import PostCard from '../components/posts/PostCard';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      // In a real app we might use /api/feed/ but /api/posts/ is a good generic feed too
      const response = await api.get('posts/'); 
      // If the API returns pagination (e.g. { results: [...] }) adjust here
      const data = response.data.results ? response.data.results : response.data;
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handlePostCreated = (newPost) => {
    // Add new post to the top of the feed
    setPosts([newPost, ...posts]);
  };

  const handleLikeToggle = async (postId) => {
    // Optimistic UI update
    setPosts(currentPosts => 
      currentPosts.map(post => {
        if (post.id === postId) {
          const isLiked = !post.is_liked;
          return {
            ...post,
            is_liked: isLiked,
            like_count: isLiked ? post.like_count + 1 : post.like_count - 1
          };
        }
        return post;
      })
    );

    try {
      // Send like to server
      // Note: we just assume the server handles toggling based on previous design
      await api.post(`posts/${postId}/like/`);
    } catch (error) {
      console.error('Failed to toggle like', error);
      // Revert if failed (optional, for simplicity we skip revert here or just re-fetch)
      fetchFeed();
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-800">Home Feed</h2>
      
      <CreatePost onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLikeToggle={handleLikeToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
