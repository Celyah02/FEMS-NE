'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Alert, Field } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@tzw.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl">🔥</div>
          <h1 className="mt-2 text-xl font-bold text-brand-700">TZW FEMS</h1>
          <p className="text-sm text-slate-500">Fire Extinguisher Management System</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert>{error}</Alert>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link className="text-brand-600 hover:underline" href="/forgot-password">Forgot password?</Link>
          <Link className="text-brand-600 hover:underline" href="/register">Create account</Link>
        </div>
        <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo accounts (password: Password123!)</p>
          <p>admin@tzw.com · inspector@tzw.com · user@tzw.com</p>
        </div>
      </div>
    </div>
  );
}
