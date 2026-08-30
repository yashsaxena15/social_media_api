import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCheck, UserPlus, Grid } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import PostCard from '../../components/posts/PostCard';
import EditProfileModal from './EditProfileModal';
import FollowListModal from './FollowListModal';
import { getImageUrl } from '../../utils/imageUrl';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useContext(AuthContext);

  const isOwnProfile = username === currentUser?.username;

  const [profile, setProfile] = useState(null);       // profile data (includes user_id)
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null

  // Fetch profile by exact username using our new ?username= filter
  const fetchProfile = async () => {
    try {
      if (isOwnProfile) {
        const res = await api.get('profile/me/');
        setProfile(res.data);
      } else {
        // GET /api/profiles/?username=<name> — returns a single profile object
        const res = await api.get(`profiles/?username=${encodeURIComponent(username)}`);
        setProfile(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
      setProfile(null);
    }
  };

  // Fetch all posts and filter by username
  const fetchUserPosts = async () => {
    try {
      const res = await api.get('posts/');
      const allPosts = res.data.results ? res.data.results : res.data;
      setPosts(allPosts.filter(p => p.username === username));
    } catch (err) {
      console.error('Failed to fetch posts', err);
    }
  };

  // Check if current user is following this profile
  const checkFollowStatus = async (targetUserId) => {
    if (!targetUserId || isOwnProfile) return;
    try {
      // Check current user's following list for the target user's id
      const res = await api.get(`users/${currentUser?.id ?? 0}/following/`);
      const data = res.data.results ? res.data.results : res.data;
      setIsFollowing(data.some(f => f.following === username));
    } catch (err) {
      // silently ignore — follow status is not critical
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProfile(null);
      setPosts([]);
      setIsFollowing(false);
      await Promise.all([fetchProfile(), fetchUserPosts()]);
      setLoading(false);
    };
    if (username) load();
  }, [username, isOwnProfile]);

  // Once we have the profile (and its user_id), check follow status
  useEffect(() => {
    if (profile?.user_id && !isOwnProfile) {
      checkFollowStatus(profile.user_id);
    }
  }, [profile?.user_id]);

  const handleFollowToggle = async () => {
    if (!profile?.user_id) return;
    try {
      const res = await api.post(`users/${profile.user_id}/follow/`);
      const followed = res.data.message === 'Followed';
      setIsFollowing(followed);
      setProfile(prev => prev ? {
        ...prev,
        followers_count: followed ? prev.followers_count + 1 : prev.followers_count - 1
      } : prev);
    } catch (err) {
      console.error('Follow toggle failed', err);
    }
  };

  const handleLikeToggle = async (postId) => {
    setPosts(current =>
      current.map(p => p.id === postId
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
      )
    );
    try {
      await api.post(`posts/${postId}/like/`);
    } catch {
      setPosts(current =>
        current.map(p => p.id === postId
          ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
          : p
        )
      );
    }
  };

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(prev => ({ ...prev, ...updatedProfile }));
    setShowEditModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 text-gray-500">
        User not found. <Link to="/" className="text-brand-blue underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profile_image ? (
              <img
                src={getImageUrl(profile.profile_image)}
                alt={`${profile.username}'s avatar`}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-4xl">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{profile.username}</h2>

              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing
                      ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-3">
              <span className="text-gray-700"><strong>{posts.length}</strong> posts</span>
              <button
                onClick={() => setFollowModal('followers')}
                className="text-gray-700 hover:text-brand-blue transition-colors"
              >
                <strong>{profile.followers_count}</strong> followers
              </button>
              <button
                onClick={() => setFollowModal('following')}
                className="text-gray-700 hover:text-brand-blue transition-colors"
              >
                <strong>{profile.following_count}</strong> following
              </button>
            </div>

            {/* Bio */}
            {profile.full_name && <p className="font-semibold text-gray-900">{profile.full_name}</p>}
            {profile.bio && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="flex items-center gap-2 mb-4 text-gray-600 font-medium border-t border-gray-200 pt-4">
        <Grid className="w-4 h-4" />
        <span>Posts</span>
      </div>

      {posts.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200 text-gray-500">
          No posts yet.
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onLikeToggle={handleLikeToggle} />
        ))
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleProfileUpdated}
        />
      )}

      {/* Followers / Following Modal — uses profile.user_id (reliable) */}
      {followModal && (
        <FollowListModal
          userId={isOwnProfile ? currentUser?.id : profile?.user_id}
          type={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
