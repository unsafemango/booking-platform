import type { Notification } from '../types.ts';

const READ_KEY = 'booking.notificationsRead';

/** Fired on window after notifications are marked as read, so other views can update. */
export const NOTIFICATIONS_READ_EVENT = 'notifications:read';

/** Notifications have no id, so one is built from the fields that tell two emails apart. */
export function notificationKey(n: Notification): string {
  return `${n.orderId}|${n.type}|${n.status}|${n.sentAt}`;
}

/** Keys of the notifications marked as read in this browser; empty when storage is unavailable. */
export function loadReadNotifications(): string[] {
  try {
    const stored = localStorage.getItem(READ_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Marks the given notifications as read and returns the new list of read keys.
 * Only keys still in `current` are kept, so the stored list doesn't grow forever.
 */
export function markNotificationsRead(read: Notification[], current: Notification[]): string[] {
  const keep = new Set(current.map(notificationKey));
  const merged = new Set([...loadReadNotifications(), ...read.map(notificationKey)]);
  const next = [...merged].filter((k) => keep.has(k));
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable; the choice just won't survive a reload
  }
  window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  return next;
}
