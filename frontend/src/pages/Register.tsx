import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof RegisterForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await register(form.name, form.email, form.password);
      navigate(params.get('next') ?? '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setFields(err instanceof ApiError ? (err.fields ?? {}) : {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Create an account</h1>
      <label>
        Name
        <input className="input" value={form.name} onChange={set('name')} required autoFocus />
      </label>
      {fields.name && <span className="field-error">{fields.name}</span>}
      <label>
        Email
        <input className="input" type="email" value={form.email} onChange={set('email')} required />
      </label>
      {fields.email && <span className="field-error">{fields.email}</span>}
      <label>
        Password
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={set('password')}
          minLength={8}
          required
        />
      </label>
      {fields.password && <span className="field-error">{fields.password}</span>}
      {error && !Object.keys(fields).length && <p className="alert">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </button>
      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
