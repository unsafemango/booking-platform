import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(params.get('next') ?? '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
      <label>Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted">No account? <Link to={`/register${params.get('next') ? `?next=${params.get('next')}` : ''}`}>Sign up</Link></p>
    </form>
  );
}
