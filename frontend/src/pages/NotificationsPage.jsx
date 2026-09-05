import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Check,
  X,
  CheckCheck,
  Clock,
} from 'lucide-react';
import api from '../api/axiosInstance';
import { getImageUrl } from '../utils/imageUrl';
import { NotificationContext } from '../context/NotificationContext';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'follows', label: 'Follows' },
  { id: 'likes', label: 'Likes' },
  { id: 'pending_requests', label: 'Pending Requests' },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount, markAllRead, markSingleRead } = useContext(NotificationContext);
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // { [reqId]: 'accept' | 'reject' }
  const [followLoading, setFollowLoading] = useState({}); // { [userId]: boolean }

  const fetchNotifications = async (filterKey = activeFilter) => {
    try {
      setLoading(true);
      const res = await api.get(`notifications/?filter=${filterKey}`);
      const data = res.data.results ? res.data.results : res.data;
      setNotifications(Array.isArray(data) ? data : []);
      if (typeof res.data.unread_count === 'number') {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(activeFilter);
  }, [activeFilter]);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleAccept = async (notificationId, followRequestId) => {
    if (!followRequestId || actionLoading[followRequestId]) return;
    setActionLoading(prev => ({ ...prev, [followRequestId]: 'accept' }));
    try {
      await api.post(`follow-requests/${followRequestId}/accept/`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId || n.follow_request_id === followRequestId
            ? { ...n, follow_request_status: 'accepted', is_read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to accept follow request', err);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[followRequestId];
        return next;
      });
    }
  };

  const handleReject = async (notificationId, followRequestId) => {
    if (!followRequestId || actionLoading[followRequestId]) return;
    setActionLoading(prev => ({ ...prev, [followRequestId]: 'reject' }));
    try {
      await api.post(`follow-requests/${followRequestId}/reject/`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId || n.follow_request_id === followRequestId
            ? { ...n, follow_request_status: 'rejected', is_read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to reject follow request', err);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[followRequestId];
        return next;
      });
    }
  };

  const handleCancelSentRequest = async (followRequestId, targetUserId) => {
    if (!followRequestId || actionLoading[followRequestId]) return;
    setActionLoading(prev => ({ ...prev, [followRequestId]: 'cancel' }));
    try {
      await api.post(`follow-requests/${followRequestId}/cancel/`);
      setNotifications(prev => prev.filter(n => n.follow_request_id !== followRequestId));
    } catch (err) {
      console.error('Failed to cancel follow request', err);
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[followRequestId];
        return next;
      });
    }
  };

  const handleToggleFollow = async (senderId) => {
    if (!senderId || followLoading[senderId]) return;
    setFollowLoading(prev => ({ ...prev, [senderId]: true }));
    try {
      const res = await api.post(`users/${senderId}/follow/`);
      const newStatus = res.data.status;
      const isNowFollowing = newStatus === 'following';
      setNotifications(prev =>
        prev.map(item =>
          item.sender_id === senderId
            ? { ...item, sender_is_following: isNowFollowing }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to toggle follow', err);
    } finally {
      setFollowLoading(prev => {
        const next = { ...prev };
        delete next[senderId];
        return next;
      });
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
      return `${Math.floor(diffDays / 30)}mo`;
    } catch {
      return '';
    }
  };

  const getTimeBucket = (dateStr) => {
    if (!dateStr) return 'Older';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      const isSameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isSameDay || diffHours < 24) return 'Today';
      if (diffDays < 7) return 'This week';
      if (diffDays < 30) return 'This month';
      return 'Older';
    } catch {
      return 'Older';
    }
  };

  // Group notifications into time buckets
  const groupedNotifications = {
    Today: [],
    'This week': [],
    'This month': [],
    Older: [],
  };

  notifications.forEach((item) => {
    const bucket = getTimeBucket(item.created_at);
    if (groupedNotifications[bucket]) {
      groupedNotifications[bucket].push(item);
    } else {
      groupedNotifications.Older.push(item);
    }
  });

  const availableSections = ['Today', 'This week', 'This month', 'Older'].filter(
    (b) => groupedNotifications[b].length > 0
  );

  const renderNotificationMessage = (item) => {
    const timeText = (
      <span className="text-gray-400 dark:text-slate-500 font-normal ml-1">
        · {formatRelativeTime(item.created_at)}
      </span>
    );

    if (item.notification_type === 'follow_request') {
      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
          >
            {item.sender_username}
          </Link>
          <span>requested to follow you.</span>
          {timeText}
        </p>
      );
    }

    if (item.notification_type === 'follow_accepted') {
      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
          >
            {item.sender_username}
          </Link>
          <span>accepted your follow request.</span>
          {timeText}
        </p>
      );
    }

    if (item.notification_type === 'pending_request_sent') {
      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <span>Requested to follow </span>
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline"
          >
            {item.sender_username}
          </Link>
          {timeText}
        </p>
      );
    }

    if (item.notification_type === 'follow') {
      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
          >
            {item.sender_username}
          </Link>
          <span>started following you.</span>
          {timeText}
        </p>
      );
    }

    if (item.notification_type === 'like') {
      const count = item.total_like_count || 1;
      const senders = item.grouped_senders || [];

      if (count <= 1 || senders.length <= 1) {
        return (
          <p className="text-sm text-gray-800 dark:text-slate-200">
            <Link
              to={`/profile/${item.sender_username}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
            >
              {item.sender_username}
            </Link>
            <span>liked your post.</span>
            {timeText}
          </p>
        );
      }

      if (count === 2 && senders.length >= 2) {
        return (
          <p className="text-sm text-gray-800 dark:text-slate-200">
            <Link
              to={`/profile/${senders[0]}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
            >
              {senders[0]}
            </Link>
            <span>and </span>
            <Link
              to={`/profile/${senders[1]}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
            >
              {senders[1]}
            </Link>
            <span>liked your post.</span>
            {timeText}
          </p>
        );
      }

      const otherCount = count - 1;
      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
          >
            {item.sender_username}
          </Link>
          <span>and </span>
          <span className="font-semibold text-gray-900 dark:text-slate-100">
            {otherCount} {otherCount === 1 ? 'other' : 'others'}
          </span>
          <span> liked your post.</span>
          {timeText}
        </p>
      );
    }

    if (item.notification_type === 'comment') {
      const commentSnippet = item.comment_text
        ? item.comment_text.length > 50
          ? `${item.comment_text.slice(0, 50)}...`
          : item.comment_text
        : null;

      return (
        <p className="text-sm text-gray-800 dark:text-slate-200">
          <Link
            to={`/profile/${item.sender_username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
          >
            {item.sender_username}
          </Link>
          <span>commented on your post</span>
          {commentSnippet && (
            <span className="text-gray-600 dark:text-slate-300">
              : &ldquo;{commentSnippet}&rdquo;
            </span>
          )}
          {timeText}
        </p>
      );
    }

    return (
      <p className="text-sm text-gray-800 dark:text-slate-200">
        <Link
          to={`/profile/${item.sender_username}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-gray-900 dark:text-slate-100 hover:underline mr-1"
        >
          {item.sender_username}
        </Link>
        <span>interacted with your account.</span>
        {timeText}
      </p>
    );
  };

  const renderActionOrThumbnail = (item) => {
    // 1. Follow Request actions
    if (item.notification_type === 'follow_request') {
      const isPending = item.follow_request_status === 'pending';
      const isAccepted = item.follow_request_status === 'accepted';
      const isRejected = item.follow_request_status === 'rejected';
      const isBusy = !!actionLoading[item.follow_request_id];

      if (isPending) {
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleAccept(item.id, item.follow_request_id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-brand-purple to-brand-teal text-white shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleReject(item.id, item.follow_request_id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        );
      }

      if (isAccepted) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      }

      if (isRejected) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
            <span>Rejected</span>
          </span>
        );
      }
    }

    // 2. Follow / Follow Accepted: Interactive Follow / Following button
    if (item.notification_type === 'follow' || item.notification_type === 'follow_accepted') {
      const isFollowing = !!item.sender_is_following;
      const isBusy = !!followLoading[item.sender_id];

      return (
        <button
          type="button"
          disabled={isBusy}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFollow(item.sender_id);
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0 disabled:opacity-50 ${
            isFollowing
              ? 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700'
              : 'bg-gradient-to-r from-brand-purple to-brand-teal text-white shadow-xs hover:opacity-90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      );
    }

    // 3. Like or Comment: Post Thumbnail (only if post has an image, document icon completely removed)
    if (item.post_id && item.post_image) {
      return (
        <div className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800">
          <img
            src={getImageUrl(item.post_image)}
            alt="Post thumbnail"
            className="w-11 h-11 object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // 4. Pending Request Sent: Cancel / Requested button
    if (item.notification_type === 'pending_request_sent') {
      const isBusy = actionLoading[item.follow_request_id] === 'cancel';
      return (
        <button
          type="button"
          disabled={isBusy}
          onClick={(e) => {
            e.stopPropagation();
            handleCancelSentRequest(item.follow_request_id, item.sender_id);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 disabled:opacity-50 transition-colors flex-shrink-0"
          title="Cancel follow request"
        >
          {isBusy ? 'Cancelling...' : 'Requested'}
        </button>
      );
    }

    return null;
  };

  const renderBadgeIcon = (type) => {
    switch (type) {
      case 'like':
        return (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <Heart className="w-3 h-3 fill-current" />
          </span>
        );
      case 'comment':
        return (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
            <MessageCircle className="w-3 h-3 fill-current" />
          </span>
        );
      case 'pending_request_sent':
        return (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Clock className="w-3 h-3" />
          </span>
        );
      case 'follow_request':
      case 'follow_accepted':
      case 'follow':
      default:
        return (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-purple text-white flex items-center justify-center shadow-xs">
            <UserPlus className="w-3 h-3" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-brand-purple dark:text-brand-teal" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Follows, likes, comments, and account activity.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs Bar (All, Comments, Follows, Likes) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple dark:border-brand-teal"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal mb-3">
              {activeFilter === 'likes' ? (
                <Heart className="w-7 h-7" />
              ) : activeFilter === 'comments' ? (
                <MessageCircle className="w-7 h-7" />
              ) : activeFilter === 'follows' ? (
                <UserPlus className="w-7 h-7" />
              ) : activeFilter === 'pending_requests' ? (
                <Clock className="w-7 h-7" />
              ) : (
                <Bell className="w-7 h-7" />
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              {activeFilter === 'likes'
                ? 'No likes yet'
                : activeFilter === 'comments'
                ? 'No comments yet'
                : activeFilter === 'follows'
                ? 'No follow activity yet'
                : activeFilter === 'pending_requests'
                ? 'No pending requests sent'
                : 'No notifications yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {activeFilter === 'likes'
                ? 'When people like your posts, you will see them here.'
                : activeFilter === 'comments'
                ? 'When someone comments on your posts, they will show up here.'
                : activeFilter === 'follows'
                ? 'Follow requests and new followers will appear here.'
                : activeFilter === 'pending_requests'
                ? 'When you send follow requests to private accounts, you can view and manage them here.'
                : "Activity and notifications will appear right here when people interact with you."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {availableSections.map((sectionTitle) => {
              const sectionItems = groupedNotifications[sectionTitle];
              return (
                <div key={sectionTitle} className="first:pt-0">
                  {/* Time Section Header */}
                  <div className="px-4 sm:px-5 pt-4 pb-2">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 tracking-tight">
                      {sectionTitle}
                    </h2>
                  </div>

                  {/* Section Notifications List */}
                  <div className="divide-y divide-gray-50 dark:divide-slate-800/50">
                    {sectionItems.map((item) => {
                      const hasPost = !!item.post_id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!item.is_read) {
                              markSingleRead(item.id, item.notification_ids);
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
                              );
                            }
                            if (hasPost) {
                              navigate(`/posts/${item.post_id}`);
                            }
                          }}
                          className={`p-4 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3.5 transition-colors ${
                            hasPost
                              ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60'
                              : 'hover:bg-gray-50/70 dark:hover:bg-slate-800/40'
                          } ${
                            !item.is_read
                              ? 'bg-brand-purple/5 dark:bg-brand-teal/5'
                              : ''
                          }`}
                        >
                          {/* Left: Avatar & Message */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <Link
                              to={`/profile/${item.sender_username}`}
                              onClick={(e) => e.stopPropagation()}
                              className="relative flex-shrink-0 hover:opacity-85 transition-opacity"
                            >
                            {item.sender_profile_image ? (
                              <img
                                src={getImageUrl(item.sender_profile_image)}
                                alt={`${item.sender_username}'s avatar`}
                                className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple dark:text-brand-teal font-bold text-base">
                                {item.sender_username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {renderBadgeIcon(item.notification_type)}
                          </Link>

                          <div className="min-w-0 flex-1">
                            {renderNotificationMessage(item)}
                          </div>
                        </div>

                        {/* Right: Actions or Post Thumbnail */}
                        <div className="flex-shrink-0">
                          {renderActionOrThumbnail(item)}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
