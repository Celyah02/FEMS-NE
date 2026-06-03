'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function requestToken(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg('Reset token issued.');
      if (res.resetToken) setToken(res.resetToken); // demo convenience
    } catch (err) { setError(err.message); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setMsg('Password reset! You can now sign in.');
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Reset password</h1>
        <p className="mb-6 text-sm text-slate-500">Request a token, then set a new password.</p>
        <div className="space-y-6">
          <Alert>{error}</Alert>
          <Alert kind="success">{msg}</Alert>

          <form onSubmit={requestToken} className="space-y-3">
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <button className="btn-secondary w-full">Request reset token</button>
          </form>

          <form onSubmit={resetPassword} className="space-y-3 border-t border-slate-200 pt-6">
            <Field label="Reset token"><input className="input" value={token} onChange={(e) => setToken(e.target.value)} required /></Field>
            <Field label="New password"><input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></Field>
            <button className="btn-primary w-full">Set new password</button>
          </form>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link className="text-brand-600 hover:underline" href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
