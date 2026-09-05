import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { getImageUrl } from '../../utils/imageUrl';

const FollowListModal = ({ userId, type, onClose }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const endpoint = type === 'followers'
      ? `users/${userId}/follower/`
      : `users/${userId}/following/`;

    const fetch = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

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
        if (page === 1) setList([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetch();
  }, [userId, type, page]);

  const title = type === 'followers' ? 'Followers' : 'Following';

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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center p-6 text-gray-500 dark:text-slate-400 text-sm">
              No {title.toLowerCase()} yet.
            </div>
          ) : (
            <div className="pb-4">
              {list.map((item) => {
                const username = type === 'followers' ? item.follower : item.following;
                return (
                  <Link
                    key={item.id}
                    to={`/profile/${username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {item.profile_image ? (
                      <img
                        src={getImageUrl(item.profile_image)}
                        alt={`${username}'s avatar`}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold">
                        {username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-slate-100">{username}</span>
                  </Link>
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
