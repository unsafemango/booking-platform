import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';
import PasswordInput from '../components/PasswordInput.tsx';
import { ApiError } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { safeNext, withNext } from '../lib/safeNext.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFocusFirstInvalid } from '../lib/useFocusFirstInvalid.ts';
import {
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  passwordStrengthLabel,
} from '../lib/passwordStrength.ts';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export default function Register() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState<RegisterForm>({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [busy, setBusy] = useState(false);
  const [formRef, focusFirstInvalid] = useFocusFirstInvalid();
  useDocumentTitle('Create an account');

  // Also covers a successful sign-up, and replaces this page so Back doesn't return to the form.
  if (user) return <Navigate to={safeNext(params.get('next'))} replace />;

  const strength = passwordStrength(form.password);

  const set = (key: keyof RegisterForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await register(form.name, form.email, form.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setFields(err instanceof ApiError ? (err.fields ?? {}) : {});
      focusFirstInvalid();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth" ref={formRef} onSubmit={submit}>
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
      <PasswordInput
        label="Password"
        autoComplete="new-password"
        value={form.password}
        onChange={set('password')}
        error={fields.password}
        hint={
          form.password ? (
            <span className={`strength strength-${strength}`} aria-live="polite">
              {passwordStrengthLabel(strength)}
            </span>
          ) : (
            `At least ${MIN_PASSWORD_LENGTH} characters`
          )
        }
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      {error && !Object.keys(fields).length && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </Button>
      <p className="muted">
        Already registered? <Link to={withNext('/login', params.get('next'))}>Log in</Link>
      </p>
    </form>
  );
}
