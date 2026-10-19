import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import { api } from '../lib/api.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import type { Role, User } from '../types.ts';

const roleLabels: Record<Role, string> = { CUSTOMER: 'Customer', ADMIN: 'Administrator' };

export default function Profile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle('Profile');

  useEffect(() => {
    let active = true;
    // A 401 here fires auth:expired, which logs out and sends the user to the login page.
    api<User>('/api/users/me')
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <Alert>Couldn't load your profile: {error}</Alert>;
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
