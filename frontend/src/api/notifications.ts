import { api } from '../lib/api.ts';
import type { Notification } from '../types.ts';

export const listNotifications = (signal?: AbortSignal): Promise<Notification[]> =>
  api<Notification[]>('/api/notifications', { signal });
