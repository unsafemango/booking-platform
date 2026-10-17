import { useState } from 'react';

/**
 * Shown while a live connection that was up has dropped. Nothing is shown during the
 * first connect, which the page's "Connecting…" pill already covers.
 */
export default function OfflineBanner({ connected }: { connected: boolean }) {
  const [wasConnected, setWasConnected] = useState(connected);
  if (connected && !wasConnected) setWasConnected(true);

  if (connected || !wasConnected) return null;
  return (
    <p className="offline-banner" role="status">
      Live updates are paused while we reconnect. Statuses will refresh once the connection is back.
    </p>
  );
}
