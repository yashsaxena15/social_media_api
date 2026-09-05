import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCheck, UserPlus, Grid, Lock, Clock, Plus, MessageSquare, ImagePlus, Bookmark } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'tweets' | 'saved'
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [composerMode, setComposerMode] = useState(null); // 'post' | 'tweet' | null

  // Independent state for posts, tweets, and saved tabs
  const [tabData, setTabData] = useState({
    posts: {
      items: [],
      page: 1,
      hasMore: true,
      loading: false,
      loadingMore: false,
      initialLoaded: false,
    },
    tweets: {
      items: [],
      page: 1,
      hasMore: true,
      loading: false,
      loadingMore: false,
      initialLoaded: false,
    },
    saved: {
      items: [],
      page: 1,
      hasMore: true,
      loading: false,
      loadingMore: false,
      initialLoaded: false,
    },
  });

  const tabDataRef = useRef(tabData);
  tabDataRef.current = tabData;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const usernameRef = useRef(username);
  usernameRef.current = username;

  const createMenuRef = useRef(null);
  const sentinelRef = useRef(null);

  // Click outside to close create menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    };
    if (showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showCreateMenu]);

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

  // Fetch posts for this user filtered by content type ('posts' or 'tweets') with pagination
  const fetchTabPosts = async (tab, pageNum = 1, isLoadMore = false) => {
    const currentState = tabDataRef.current[tab];
    if (isLoadMore && (currentState.loadingMore || !currentState.hasMore)) {
      return;
    }
    if (!isLoadMore && currentState.loading) {
      return;
    }

    setTabData(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        loading: !isLoadMore,
        loadingMore: isLoadMore,
      },
    }));

    try {
      const res = await api.get(`posts/?username=${encodeURIComponent(usernameRef.current)}&type=${tab}&page=${pageNum}`);
      if (usernameRef.current !== username) return;

      const data = res.data;
      const newItems = data.results ? data.results : (Array.isArray(data) ? data : []);
      const hasMore = Boolean(data.next);

      setTabData(prev => {
        const existingItems = isLoadMore ? prev[tab].items : [];
        const existingIds = new Set(existingItems.map(p => p.id));
        const filteredNew = newItems.filter(p => !existingIds.has(p.id));
        const combinedItems = isLoadMore ? [...existingItems, ...filteredNew] : newItems;

        return {
          ...prev,
          [tab]: {
            ...prev[tab],
            items: combinedItems,
            page: pageNum,
            hasMore: hasMore,
            loading: false,
            loadingMore: false,
            initialLoaded: true,
          },
        };
      });
    } catch (err) {
      console.error(`Failed to fetch ${tab} page ${pageNum}`, err);
      setTabData(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: false,
          loadingMore: false,
          hasMore: false,
          initialLoaded: true,
        },
      }));
    }
  };

  // Initial load when username changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setProfile(null);
      setActiveTab('posts');
      setTabData({
        posts: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
        tweets: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
        saved: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
      });
      setIsFollowing(false);
      setIsRequested(false);
      const data = await fetchProfile();
      if (data && (isOwnProfile || !data.is_private || data.can_view_content || data.is_following)) {
        await fetchTabPosts('posts', 1, false);
      }
      setLoading(false);
    };
    if (username) load();
  }, [username, isOwnProfile]);

  // Instagram-style infinite scroll observer and scroll listener
  useEffect(() => {
    const checkAndFetchMore = () => {
      const currentTab = activeTabRef.current;
      const current = tabDataRef.current[currentTab];
      if (
        current.initialLoaded &&
        current.hasMore &&
        !current.loading &&
        !current.loadingMore
      ) {
        fetchTabPosts(currentTab, current.page + 1, true);
      }
    };

    const sentinel = sentinelRef.current;
    let observer = null;
    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first.isIntersecting) {
            checkAndFetchMore();
          }
        },
        {
          root: null,
          rootMargin: '200px 0px',
          threshold: 0,
        }
      );
      observer.observe(sentinel);
    }

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        checkAndFetchMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, tabData[activeTab]?.items?.length, tabData[activeTab]?.loadingMore]);

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
        fetchTabPosts(activeTab, 1, false);
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
            setTabData({
              posts: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
              tweets: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
              saved: { items: [], page: 1, hasMore: true, loading: false, loadingMore: false, initialLoaded: false },
            });
          }
        }
      }
    } catch (err) {
      console.error('Follow toggle failed', err);
    }
  };

  const handleLikeToggle = async (postId) => {
    const updateList = (list) =>
      list.map(p => p.id === postId
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
      );

    setTabData(prev => ({
      ...prev,
      posts: { ...prev.posts, items: updateList(prev.posts.items) },
      tweets: { ...prev.tweets, items: updateList(prev.tweets.items) },
      saved: { ...prev.saved, items: updateList(prev.saved.items) },
    }));

    try {
      await api.post(`posts/${postId}/like/`);
    } catch {
      setTabData(prev => ({
        ...prev,
        posts: { ...prev.posts, items: updateList(prev.posts.items) },
        tweets: { ...prev.tweets, items: updateList(prev.tweets.items) },
        saved: { ...prev.saved, items: updateList(prev.saved.items) },
      }));
    }
  };

  const handleSaveToggle = (postId, isSaved) => {
    setTabData(prev => {
      const updateList = (items) =>
        items.map(p => (p.id === postId ? { ...p, is_saved: isSaved } : p));

      const savedItems = !isSaved
        ? prev.saved.items.filter(p => p.id !== postId)
        : updateList(prev.saved.items);

      return {
        ...prev,
        posts: { ...prev.posts, items: updateList(prev.posts.items) },
        tweets: { ...prev.tweets, items: updateList(prev.tweets.items) },
        saved: { ...prev.saved, items: savedItems },
      };
    });
  };

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (!tabDataRef.current[newTab].initialLoaded) {
      fetchTabPosts(newTab, 1, false);
    }
  };

  const handleSelectCreate = (mode) => {
    setShowCreateMenu(false);
    setComposerMode(mode);
  };

  const handlePostCreated = (newPost) => {
    const hasImage = Boolean(newPost.image || (newPost.images && newPost.images.length > 0));
    const targetTab = hasImage ? 'posts' : 'tweets';

    setActiveTab(targetTab);

    setTabData(prev => {
      const targetState = prev[targetTab];
      return {
        ...prev,
        [targetTab]: {
          ...targetState,
          items: [newPost, ...targetState.items.filter(p => p.id !== newPost.id)],
          initialLoaded: true,
        },
      };
    });

    setProfile(prev => prev ? {
      ...prev,
      posts_count: (prev.posts_count || 0) + 1,
    } : prev);

    setComposerMode(null);
  };

  const handlePostUpdated = (updatedPost) => {
    const updateList = (list) =>
      list.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p);

    setTabData(prev => ({
      ...prev,
      posts: { ...prev.posts, items: updateList(prev.posts.items) },
      tweets: { ...prev.tweets, items: updateList(prev.tweets.items) },
      saved: { ...prev.saved, items: updateList(prev.saved.items) },
    }));
  };

  const currentTabState = tabData[activeTab];
  const filteredPosts = activeTab === 'saved'
    ? currentTabState.items
    : currentTabState.items.filter(post => {
        const hasImage = Boolean(post.image || (post.images && post.images.length > 0));
        return activeTab === 'posts' ? hasImage : !hasImage;
      });

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
          {/* Profile Tabs + Unified Create (+) Button */}
          <div className="border-t border-gray-200 dark:border-slate-800 mb-6">
            <div className="flex items-center justify-between">
              {/* Instagram-style Tabs Navigation */}
              <div className="flex items-center gap-6 sm:gap-10">
                <button
                  type="button"
                  onClick={() => handleTabChange('posts')}
                  className={`flex items-center gap-2 py-3.5 px-2 -mt-px border-t-2 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                    activeTab === 'posts'
                      ? 'border-brand-purple dark:border-brand-teal text-brand-purple dark:text-brand-teal'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Posts</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('tweets')}
                  className={`flex items-center gap-2 py-3.5 px-2 -mt-px border-t-2 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                    activeTab === 'tweets'
                      ? 'border-brand-purple dark:border-brand-teal text-brand-purple dark:text-brand-teal'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Tweets</span>
                </button>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('saved')}
                    className={`flex items-center gap-2 py-3.5 px-2 -mt-px border-t-2 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                      activeTab === 'saved'
                        ? 'border-brand-purple dark:border-brand-teal text-brand-purple dark:text-brand-teal'
                        : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Saved</span>
                  </button>
                )}
              </div>

              {/* Unified Create (+) Button & Menu */}
              {isOwnProfile && (
                <div className="relative" ref={createMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (composerMode) {
                        setComposerMode(null);
                        setShowCreateMenu(false);
                      } else {
                        setShowCreateMenu(prev => !prev);
                      }
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                      showCreateMenu || composerMode
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rotate-45'
                        : 'bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90 hover:scale-105 active:scale-95'
                    }`}
                    title={showCreateMenu || composerMode ? 'Close' : 'Create new post or tweet'}
                    aria-label={showCreateMenu || composerMode ? 'Close' : 'Create new post or tweet'}
                  >
                    <Plus className="w-5 h-5 transition-transform" />
                  </button>

                  {/* Dropdown Menu */}
                  {showCreateMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-1.5 z-30 transition-all animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={() => handleSelectCreate('post')}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors text-left group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal flex-shrink-0 group-hover:scale-105 transition-transform">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Create Post</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Image + caption</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectCreate('tweet')}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors text-left group cursor-pointer mt-1"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal flex-shrink-0 group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Create Tweet</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">Text only</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Post / Tweet Form */}
          {isOwnProfile && composerMode && (
            <CreatePost
              mode={composerMode}
              onClose={() => setComposerMode(null)}
              onPostCreated={handlePostCreated}
            />
          )}

          {/* Posts / Tweets / Saved List */}
          {currentTabState.loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple dark:border-brand-teal"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
              {activeTab === 'posts' ? 'No posts yet.' : activeTab === 'tweets' ? 'No tweets yet.' : 'No saved posts yet.'}
            </div>
          ) : (
            <div>
              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onPostUpdated={handlePostUpdated}
                  onSaveToggle={handleSaveToggle}
                />
              ))}

              {/* Infinite Scroll Bottom Sentinel */}
              {currentTabState.hasMore && (
                <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />
              )}

              {/* Small centered loading spinner / buffering indicator */}
              {currentTabState.loadingMore && (
                <div className="flex justify-center items-center py-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-purple dark:border-brand-teal border-t-transparent shadow-xs"></div>
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Loading...
                    </span>
                  </div>
                </div>
              )}

              {/* End of content indicator */}
              {!currentTabState.hasMore && currentTabState.items.length > 0 && (
                <div className="text-center py-8 text-xs text-gray-400 dark:text-slate-500 font-medium tracking-wide border-t border-gray-100 dark:border-slate-800/60 mt-4">
                  {activeTab === 'posts' ? 'No more posts' : activeTab === 'tweets' ? 'No more tweets' : 'No more saved posts'}
                </div>
              )}
            </div>
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
          isOwnProfile={isOwnProfile}
          onFollowerRemoved={() => {
            setProfile(prev => prev ? {
              ...prev,
              followers_count: Math.max(0, (prev.followers_count || 1) - 1),
            } : prev);
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
