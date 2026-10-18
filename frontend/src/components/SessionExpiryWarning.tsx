import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.tsx';
import Button from './Button.tsx';

/** How long before the token expires the warning appears. */
export const WARN_BEFORE_MS = 2 * 60 * 1000;

// setTimeout overflows above this delay and would fire immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

function remainingText(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  return minutes <= 1 ? 'less than a minute' : `${minutes} minutes`;
}

/**
 * Warns a signed-in user shortly before their session token expires, so they can
 * sign in again on their own terms instead of being logged out mid-task.
 */
export default function SessionExpiryWarning() {
  const { user, expiresAt, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);

  const warnAt = expiresAt === null ? null : expiresAt - WARN_BEFORE_MS;
  const visible =
    user !== null && expiresAt !== null && warnAt !== null && now >= warnAt && now < expiresAt;

  // Wake up when the warning window opens, then tick so the countdown stays current.
  useEffect(() => {
    if (!user || warnAt === null) return;
    if (!visible) {
      const delay = warnAt - Date.now();
      if (delay > MAX_TIMEOUT_MS) return;
      const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, delay));
      return () => window.clearTimeout(timer);
    }
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, [user, warnAt, visible]);

  if (!visible || dismissedFor === expiresAt) return null;

  const signInAgain = () => {
    logout();
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
  };

  return (
    <div className="session-warning" role="alert">
      <span>
        Your session expires in {remainingText(expiresAt - now)}. Sign in again to keep working
        without interruption.
      </span>
      <Button onClick={signInAgain}>Sign in again</Button>
      <Button variant="ghost" onClick={() => setDismissedFor(expiresAt)}>
        Dismiss
      </Button>
    </div>
  );
}
