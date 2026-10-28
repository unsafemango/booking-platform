import { useEffect, useState } from 'react';
import { formatRelative } from '../lib/relativeTime.ts';

/** A <time> showing how long ago a date was, with the full date on hover. Refreshes every minute. */
export default function RelativeTime({ value }: { value: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {formatRelative(date, now)}
    </time>
  );
}
