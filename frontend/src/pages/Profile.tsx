import { Link } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import { getMe } from '../api/auth.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';
import type { Role } from '../types.ts';

const roleLabels: Record<Role, string> = { CUSTOMER: 'Customer', ADMIN: 'Administrator' };

export default function Profile() {
  // A 401 here fires auth:expired, which logs out and sends the user to the login page.
  const { data: profile, error, reload } = useFetch(getMe);
  useDocumentTitle('Profile');

  if (error) return <Alert onRetry={reload}>Couldn't load your profile: {error}</Alert>;
  if (!profile) {
    return (
      <p role="status" className="muted">
        Loading profile…
      </p>
    );
  }

  return (
    <article className="card profile">
      <h1>{profile.name}</h1>
      <dl className="profile-meta">
        <dt>Email</dt>
        <dd>{profile.email}</dd>
        <dt>Account type</dt>
        <dd>{roleLabels[profile.role]}</dd>
      </dl>
      <p>
        <Link to="/orders">View my bookings</Link>
      </p>
    </article>
  );
}
