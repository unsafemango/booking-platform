import { api } from '../lib/api.ts';
import type { AuthResponse, User } from '../types.ts';

export const login = (email: string, password: string): Promise<AuthResponse> =>
  api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } });

export const register = (name: string, email: string, password: string): Promise<AuthResponse> =>
  api<AuthResponse>('/api/auth/register', { method: 'POST', body: { name, email, password } });

/** The signed-in user's profile. */
export const getMe = (signal?: AbortSignal): Promise<User> =>
  api<User>('/api/users/me', { signal });
