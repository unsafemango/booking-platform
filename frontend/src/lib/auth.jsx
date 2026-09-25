import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api.js';

const USER_KEY = 'booking.user';
const AuthContext = createContext(null);

function loadUser() {
  try {
    return tokenStore.get() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const accept = useCallback(({ token, user }) => {
    tokenStore.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      login: (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } }).then(accept),
      register: (name, email, password) =>
        api('/api/auth/register', { method: 'POST', body: { name, email, password } }).then(accept),
      logout,
    }),
    [user, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
