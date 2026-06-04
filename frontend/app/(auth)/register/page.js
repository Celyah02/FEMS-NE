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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'user' });
  const [showPassword, setShowPassword] = useState(false);
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
                placeholder="John"
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
                placeholder="Doe"
                value={form.lastName}
                onChange={set('lastName')}
                required
                maxLength={80}
                pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"}
                title="Letters only. Spaces, hyphens, and apostrophes allowed."
              />
            </Field>
          </div>
          <Field label="Email">
            <input 
              className="input" 
              type="email" 
              placeholder="e.g. user@tzw.com"
              value={form.email} 
              onChange={set('email')} 
              required 
              maxLength={255} 
              autoComplete="off"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input 
                className="input pr-10" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={form.password} 
                onChange={set('password')} 
                required 
                minLength={8} 
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </Field>
          <p className="text-xs text-slate-400">Min 8 characters, including uppercase, lowercase, a number, and a special character.</p>
          <Field label="Role">
            <select className="input" value={form.role} onChange={set('role')} required>
              <option value="user">User</option>
              <option value="inspector">Inspector</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link className="text-brand-600 hover:underline" href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
