'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Alert, Field } from '@/components/ui';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      // 1. Register the account
      await api.post('/auth/register', form);
      
      // 2. Auto-login immediately after successful registration
      const user = await login(form.email, form.password);
      if (!user) {
        throw new Error('Auto-login failed. Please try logging in manually.');
      }
      
      // 3. Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err.details ? `${err.message}: ${Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ')}` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Create your account</h1>
        <p className="mb-6 text-sm text-slate-500">Self-registered accounts get the “user” role.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                className="input"
                value={form.firstName}
                onChange={set('firstName')}
                required
                maxLength={80}
                pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"}
                title="Letters only. Spaces, hyphens, and apostrophes allowed."
              />
            </Field>
            <Field label="Last name">
              <input
                className="input"
                value={form.lastName}
                onChange={set('lastName')}
                required
                maxLength={80}
                pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"}
                title="Letters only. Spaces, hyphens, and apostrophes allowed."
              />
            </Field>
          </div>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} required maxLength={255} /></Field>
          <Field label="Password"><input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} /></Field>
          <p className="text-xs text-slate-400">Min 8 characters, including uppercase, lowercase, a number, and a special character.</p>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link className="text-brand-600 hover:underline" href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
