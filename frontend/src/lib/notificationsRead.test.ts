import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '../types.ts';
import {
  loadReadNotifications,
  markNotificationsRead,
  notificationKey,
} from './notificationsRead.ts';

const READ_KEY = 'booking.notificationsRead';

const placed: Notification = {
  orderId: 'o1',
  type: 'order.placed',
  status: 'PLACED',
  subject: 'We got your booking',
  sentAt: '2026-10-06T09:01:00Z',
};
const confirmed: Notification = {
  ...placed,
  type: 'order.status-changed',
  status: 'CONFIRMED',
  subject: 'Your booking is confirmed',
  sentAt: '2026-10-06T10:00:00Z',
};

describe('notificationsRead', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives two emails for the same order different keys', () => {
    expect(notificationKey(placed)).not.toBe(notificationKey(confirmed));
  });

  it('is empty when nothing is stored or the stored value is invalid', () => {
    expect(loadReadNotifications()).toEqual([]);
    localStorage.setItem(READ_KEY, '{not json');
    expect(loadReadNotifications()).toEqual([]);
    localStorage.setItem(READ_KEY, JSON.stringify(['a', 1, 'b']));
    expect(loadReadNotifications()).toEqual(['a', 'b']);
  });

  it('adds to what is already read and drops keys no longer in the list', () => {
    localStorage.setItem(READ_KEY, JSON.stringify(['gone']));
    expect(markNotificationsRead([placed], [placed, confirmed])).toEqual([notificationKey(placed)]);
    expect(markNotificationsRead([confirmed], [placed, confirmed])).toEqual([
      notificationKey(placed),
      notificationKey(confirmed),
    ]);
    expect(loadReadNotifications()).toHaveLength(2);
  });

  it('still returns the new list when storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(markNotificationsRead([placed], [placed])).toEqual([notificationKey(placed)]);
  });
});
