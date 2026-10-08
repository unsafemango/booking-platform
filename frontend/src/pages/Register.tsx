import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';
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
      <Input
        label="Name"
        value={form.name}
        onChange={set('name')}
        error={fields.name}
        required
        autoFocus
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={set('email')}
        error={fields.email}
        required
      />
      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={set('password')}
        error={fields.password}
        minLength={8}
        required
      />
      {error && !Object.keys(fields).length && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </Button>
      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
