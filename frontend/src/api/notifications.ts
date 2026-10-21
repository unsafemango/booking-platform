import { api } from '../lib/api.ts';
import type { Notification } from '../types.ts';

export const listNotifications = (): Promise<Notification[]> =>
  api<Notification[]>('/api/notifications');
