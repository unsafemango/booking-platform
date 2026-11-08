import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';
import PasswordInput from '../components/PasswordInput.tsx';
import { useAuth } from '../lib/auth.tsx';
import { safeNext } from '../lib/safeNext.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';

export default function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Log in');

  // Also covers a successful login, and replaces this page so Back doesn't return to the form.
  if (user) return <Navigate to={safeNext(params.get('next'))} replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Log in</h1>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </Button>
      <p className="muted">
        No account?{' '}
        <Link to={`/register${params.get('next') ? `?next=${params.get('next')}` : ''}`}>
          Sign up
        </Link>
      </p>
    </form>
  );
}
