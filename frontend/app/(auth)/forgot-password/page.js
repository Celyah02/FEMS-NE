'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Field } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function requestToken(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMsg('Reset token issued. Please check your email.');
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
            <Field label="Reset token">
              <input 
                className="input" 
                placeholder="Enter the 48-character token from your email"
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
                required 
                autoComplete="off"
              />
            </Field>
            <Field label="New password">
              <div className="relative">
                <input 
                  className="input pr-10" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
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
