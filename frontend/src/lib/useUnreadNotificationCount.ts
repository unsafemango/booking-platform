import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listNotifications } from '../api/notifications.ts';
import { useAuth } from './auth.tsx';
import {
  NOTIFICATIONS_READ_EVENT,
  loadReadNotifications,
  notificationKey,
} from './notificationsRead.ts';
import type { Notification } from '../types.ts';

/**
 * Number of booking emails the signed-in user hasn't marked as read in this browser.
 * The list is fetched again on every route change; read state follows the inbox panel
 * (same tab) and other tabs. Always 0 for visitors.
 */
export function useUnreadNotificationCount(): number {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readKeys, setReadKeys] = useState(loadReadNotifications);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    listNotifications(controller.signal)
      .then(setNotifications)
      .catch(() => {});
    return () => controller.abort();
  }, [user, pathname]);

  useEffect(() => {
    const sync = () => setReadKeys(loadReadNotifications());
    window.addEventListener(NOTIFICATIONS_READ_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!user) return 0;
  return notifications.filter((n) => !readKeys.includes(notificationKey(n))).length;
}
