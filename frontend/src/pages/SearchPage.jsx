import React, { useState, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import PostCard from '../components/posts/PostCard';
import { getImageUrl } from '../utils/imageUrl';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [posts, setPosts] = useState([]);
  const debounceTimer = useRef(null);

  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  const doSearch = async (q) => {
    if (!q.trim()) {
      handleClear();
      return;
    }

    setLoading(true);
    setSearched(true);
    setUsersPage(1);
    setPostsPage(1);

    try {
      const res = await api.get(`search/?q=${encodeURIComponent(q)}`);
      const usersData = res.data.users?.results ?? res.data.users ?? [];
      const postsData = res.data.posts?.results ?? res.data.posts ?? [];
      
      setResults({ users: usersData, posts: postsData });
      setPosts(postsData);

      setHasMoreUsers(!!res.data.users?.next);
      setHasMorePosts(!!res.data.posts?.next);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreUsers = async () => {
    if (loadingMoreUsers || !hasMoreUsers) return;
    setLoadingMoreUsers(true);
    const nextPage = usersPage + 1;
    try {
      const res = await api.get(`search/?q=${encodeURIComponent(query)}&type=users&page=${nextPage}`);
      const data = res.data.results ?? res.data ?? [];
      setResults(prev => ({ ...prev, users: [...prev.users, ...data] }));
      setUsersPage(nextPage);
      setHasMoreUsers(!!res.data.next);
    } catch (err) {
      console.error('Failed to load more users', err);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    const nextPage = postsPage + 1;
    try {
      const res = await api.get(`search/?q=${encodeURIComponent(query)}&type=posts&page=${nextPage}`);
      const data = res.data.results ?? res.data ?? [];
      setPosts(prev => [...prev, ...data]);
      setResults(prev => ({ ...prev, posts: [...prev.posts, ...data] }));
      setPostsPage(nextPage);
      setHasMorePosts(!!res.data.next);
    } catch (err) {
      console.error('Failed to load more posts', err);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(val), 400);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ users: [], posts: [] });
    setPosts([]);
    setSearched(false);
    setUsersPage(1);
    setPostsPage(1);
    setHasMoreUsers(false);
    setHasMorePosts(false);
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-slate-100">Search</h2>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search people or posts..."
          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-full py-3 pl-12 pr-12 focus:outline-none focus:border-brand-blue dark:focus:border-brand-teal shadow-sm transition-colors"
          autoFocus
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Users */}
          {results.users.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">People</h3>
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
                {results.users.map((user, idx) => (
                  <Link
                    key={`${user.username}-${idx}`}
                    to={`/profile/${user.username}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors ${
                      idx < results.users.length - 1 ? 'border-b border-gray-100 dark:border-slate-800' : ''
                    }`}
                  >
                    {user.profile_image ? (
                      <img
                        src={getImageUrl(user.profile_image)}
                        alt={`${user.username}'s avatar`}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{user.username}</p>
                      {(user.first_name || user.last_name) && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">{user.first_name} {user.last_name}</p>
                      )}
                    </div>
                  </Link>
                ))}
                
                {hasMoreUsers && (
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800">
                    <button
                      onClick={loadMoreUsers}
                      disabled={loadingMoreUsers}
                      className="w-full py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingMoreUsers ? 'Loading...' : 'Show More People'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Posts</h3>
              {posts.map((post, idx) => (
                <PostCard key={`${post.id}-${idx}`} post={post} onLikeToggle={handleLikeToggle} />
              ))}
              
              {hasMorePosts && (
                <div className="mb-6">
                  <button
                    onClick={loadMorePosts}
                    disabled={loadingMorePosts}
                    className="w-full py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMorePosts ? 'Loading...' : 'Show More Posts'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {results.users.length === 0 && posts.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-700" />
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100">No results for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term.</p>
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && !loading && (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <Search className="w-14 h-14 mx-auto mb-3 text-gray-300 dark:text-slate-700" />
          <p className="text-base font-medium">Search for people or posts</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
