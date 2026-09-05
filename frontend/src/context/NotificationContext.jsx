import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/axiosInstance';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      // Reusing existing notifications endpoint
      const res = await api.get('notifications/?page_size=1');
      if (res.data && typeof res.data.unread_count === 'number') {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch unread notification count', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    if (!user) return;

    // Polling interval to detect new notification activity in the background (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [user, fetchUnreadCount]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('notifications/mark-read/', {});
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  }, []);

  const markSingleRead = useCallback(async (notificationId, notificationIds) => {
    try {
      if (notificationIds && notificationIds.length > 0) {
        await api.post('notifications/mark-read/', { notification_ids: notificationIds });
      } else if (notificationId) {
        await api.post('notifications/mark-read/', { notification_id: notificationId });
      }
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  const decrementUnreadCount = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const value = {
    unreadCount,
    setUnreadCount,
    fetchUnreadCount,
    markAllRead,
    markSingleRead,
    decrementUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
