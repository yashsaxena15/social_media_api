import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { getImageUrl } from '../../utils/imageUrl';

const FollowListModal = ({ userId, type, onClose, isOwnProfile = false, onFollowerRemoved }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState(null);

  const title = type === 'followers' ? 'Followers' : 'Following';

  const handleRemove = async (item) => {
    const targetKey = item.user_id || item.id;
    setRemovingId(targetKey);
    try {
      if (item.user_id) {
        await api.post(`users/${item.user_id}/remove-follower/`);
      } else {
        await api.post(`users/remove-follower/`, { username: item.follower });
      }

      // Remove from list immediately
      setList(prev => prev.filter(f => f.id !== item.id && (f.user_id ? f.user_id !== targetKey : f.follower !== item.follower)));

      if (onFollowerRemoved) {
        onFollowerRemoved(targetKey);
      }
    } catch (err) {
      console.error('Failed to remove follower', err);
      alert('Failed to remove follower. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const endpoint = type === 'followers'
      ? `users/${userId}/follower/`
      : `users/${userId}/following/`;

    const fetch = async () => {
      if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await api.get(endpoint, { params: { page } });
        const data = res.data.results ? res.data.results : res.data;
        const fetchedList = Array.isArray(data) ? data : [];
        
        if (page === 1) {
          setList(fetchedList);
        } else {
          setList(prev => [...prev, ...fetchedList]);
        }
        
        setHasNext(!!res.data.next);
      } catch (err) {
        console.error('Failed to fetch follow list', err);
        if (err.response?.status === 403) {
          setError(`This account is private. Follow this account to see their ${title.toLowerCase()}.`);
        }
        if (page === 1) setList([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetch();
  }, [userId, type, page]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[80vh] border border-transparent dark:border-slate-800 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple dark:border-brand-teal"></div>
            </div>
          ) : error ? (
            <div className="text-center p-6 text-gray-500 dark:text-slate-400 text-sm">
              {error}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center p-6 text-gray-500 dark:text-slate-400 text-sm">
              No {title.toLowerCase()} yet.
            </div>
          ) : (

            <div className="pb-4">
              {list.map((item) => {
                const username = type === 'followers' ? item.follower : item.following;
                const targetKey = item.user_id || item.id;
                return (
                  <div
                    key={item.id || targetKey}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Link
                      to={`/profile/${username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 flex-1 min-w-0 mr-3"
                    >
                      {item.profile_image ? (
                        <img
                          src={getImageUrl(item.profile_image)}
                          alt={`${username}'s avatar`}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold flex-shrink-0">
                          {username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-slate-100 truncate">{username}</div>
                        {item.full_name && (
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{item.full_name}</div>
                        )}
                      </div>
                    </Link>

                    {isOwnProfile && type === 'followers' && (
                      <button
                        type="button"
                        disabled={removingId === targetKey}
                        onClick={() => handleRemove(item)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                        title={`Remove ${username} from your followers`}
                        aria-label={`Remove ${username} from your followers`}
                      >
                        {removingId === targetKey ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                );
              })}
              
              {hasNext && (
                <div className="px-4 mt-2">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loadingMore}
                    className="w-full py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Show More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
