import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCheck, UserPlus, Grid, PlusSquare, Lock, Clock } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import PostCard from '../../components/posts/PostCard';
import CreatePost from '../../components/posts/CreatePost';
import EditProfileModal from './EditProfileModal';
import FollowListModal from './FollowListModal';
import { getImageUrl } from '../../utils/imageUrl';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, refreshUser } = useContext(AuthContext);

  const isOwnProfile = username === currentUser?.username;

  const [profile, setProfile] = useState(null);       // profile data (includes user_id)
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Fetch profile by exact username
  const fetchProfile = async () => {
    try {
      const endpoint = isOwnProfile ? 'profile/me/' : `profiles/?username=${encodeURIComponent(username)}`;
      const res = await api.get(endpoint);
      setProfile(res.data);
      setIsFollowing(!!res.data.is_following);
      setIsRequested(!!res.data.is_requested);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch profile', err);
      setProfile(null);
      return null;
    }
  };

  // Fetch posts for this user
  const fetchUserPosts = async () => {
    try {
      const res = await api.get(`posts/?username=${encodeURIComponent(username)}`);
      const allPosts = res.data.results ? res.data.results : res.data;
      setPosts(Array.isArray(allPosts) ? allPosts : []);
    } catch (err) {
      console.error('Failed to fetch posts', err);
      setPosts([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProfile(null);
      setPosts([]);
      setIsFollowing(false);
      setIsRequested(false);
      const data = await fetchProfile();
      if (data && (isOwnProfile || !data.is_private || data.can_view_content || data.is_following)) {
        await fetchUserPosts();
      }
      setLoading(false);
    };
    if (username) load();
  }, [username, isOwnProfile]);

  const handleFollowToggle = async () => {
    if (!profile?.user_id) return;
    try {
      const res = await api.post(`users/${profile.user_id}/follow/`);
      const status = res.data.status; // 'following' | 'requested' | 'none'
      if (status === 'following') {
        setIsFollowing(true);
        setIsRequested(false);
        setProfile(prev => prev ? {
          ...prev,
          followers_count: prev.followers_count + 1,
          can_view_content: true,
        } : prev);
        fetchUserPosts();
      } else if (status === 'requested') {
        setIsFollowing(false);
        setIsRequested(true);
      } else { // 'none'
        const wasFollowing = isFollowing;
        setIsFollowing(false);
        setIsRequested(false);
        if (wasFollowing) {
          setProfile(prev => prev ? {
            ...prev,
            followers_count: Math.max(0, prev.followers_count - 1),
            can_view_content: !prev.is_private,
          } : prev);
          if (profile.is_private) {
            setPosts([]);
          }
        }
      }
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
    if (refreshUser) {
      refreshUser();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-purple dark:border-brand-teal"></div>
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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6 transition-colors">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.profile_image ? (
              <img
                src={getImageUrl(profile.profile_image)}
                alt={`${profile.username}'s avatar`}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-4xl">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{profile.username}</h2>
                {profile.is_private && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/80 dark:border-slate-700" title="Private Account">
                    <Lock className="w-3 h-3 text-brand-purple dark:text-brand-teal" />
                    <span>Private</span>
                  </span>
                )}
              </div>

              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-1.5 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Edit Profile
                </button>
              ) : isFollowing ? (
                <button
                  onClick={handleFollowToggle}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <UserCheck className="w-4 h-4 text-brand-teal" />
                  <span>Following</span>
                </button>
              ) : isRequested ? (
                <button
                  onClick={handleFollowToggle}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-brand-purple/40 dark:border-brand-teal/40 bg-brand-purple/5 dark:bg-brand-teal/10 text-brand-purple dark:text-brand-teal hover:bg-brand-purple/10 dark:hover:bg-brand-teal/20"
                  title="Click to cancel follow request"
                >
                  <Clock className="w-4 h-4" />
                  <span>Requested</span>
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Follow</span>
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-3">
              <span className="text-gray-700 dark:text-slate-300">
                <strong>{profile.posts_count ?? posts.length}</strong> posts
              </span>
              <button
                disabled={!isOwnProfile && profile.is_private && !profile.can_view_content && !isFollowing}
                onClick={() => setFollowModal('followers')}
                className={`text-gray-700 dark:text-slate-300 transition-colors ${
                  !isOwnProfile && profile.is_private && !profile.can_view_content && !isFollowing
                    ? 'opacity-80 cursor-default'
                    : 'hover:text-brand-blue dark:hover:text-brand-teal cursor-pointer'
                }`}
              >
                <strong>{profile.followers_count}</strong> followers
              </button>
              <button
                disabled={!isOwnProfile && profile.is_private && !profile.can_view_content && !isFollowing}
                onClick={() => setFollowModal('following')}
                className={`text-gray-700 dark:text-slate-300 transition-colors ${
                  !isOwnProfile && profile.is_private && !profile.can_view_content && !isFollowing
                    ? 'opacity-80 cursor-default'
                    : 'hover:text-brand-blue dark:hover:text-brand-teal cursor-pointer'
                }`}
              >
                <strong>{profile.following_count}</strong> following
              </button>
            </div>

            {/* Bio */}
            {profile.full_name && <p className="font-semibold text-gray-900 dark:text-slate-100">{profile.full_name}</p>}
            {profile.bio && <p className="text-gray-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Content Section: If private and viewer not follower, show private locked notice */}
      {!isOwnProfile && profile.is_private && !profile.can_view_content && !isFollowing ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center my-6 transition-colors shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 mb-4">
            <Lock className="w-8 h-8 text-brand-purple dark:text-brand-teal" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">This Account is Private</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
            Follow this account to see their photos and posts.
          </p>
        </div>
      ) : (
        <>
          {/* Posts Section */}
          <div className="flex items-center justify-between mb-4 border-t border-gray-200 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400 font-medium">
              <Grid className="w-4 h-4" />
              <span>Posts</span>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setShowCreatePost(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showCreatePost
                    ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                    : 'bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90'
                }`}
              >
                <PlusSquare className="w-4 h-4" />
                {showCreatePost ? 'Cancel' : 'New Post'}
              </button>
            )}
          </div>

          {/* Create Post Form (collapsible) */}
          {isOwnProfile && showCreatePost && (
            <CreatePost
              onPostCreated={(newPost) => {
                setPosts(prev => [newPost, ...prev]);
                setShowCreatePost(false);
              }}
            />
          )}

          {posts.length === 0 ? (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
              No posts yet.
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onLikeToggle={handleLikeToggle} />
            ))
          )}
        </>
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
