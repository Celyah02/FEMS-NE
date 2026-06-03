'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Field, Alert, StatusBadge } from '@/components/ui';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pMsg, setPMsg] = useState(''); const [pErr, setPErr] = useState('');
  const [wMsg, setWMsg] = useState(''); const [wErr, setWErr] = useState('');

  async function saveProfile(e) {
    e.preventDefault(); setPMsg(''); setPErr('');
    try { await api.patch('/users/me', profile); await refreshUser(); setPMsg('Profile updated.'); }
    catch (err) { setPErr(err.message); }
  }

  async function changePassword(e) {
    e.preventDefault(); setWMsg(''); setWErr('');
    try { await api.post('/users/me/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); setWMsg('Password changed.'); }
    catch (err) { setWErr(err.message); }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-slate-500">Role: <StatusBadge value={user.role} /></p>
      </div>

      <form onSubmit={saveProfile} className="card space-y-3 p-6">
        <h2 className="font-semibold">Personal information</h2>
        <Alert kind="success">{pMsg}</Alert>
        <Alert>{pErr}</Alert>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input className="input" value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              maxLength={80} pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"}
              title="Letters only. Spaces, hyphens, and apostrophes allowed."
            />
          </Field>
          <Field label="Last name">
            <input className="input" value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              maxLength={80} pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"}
              title="Letters only. Spaces, hyphens, and apostrophes allowed."
            />
          </Field>
        </div>
        <Field label="Email"><input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} maxLength={255} /></Field>
        <div><button className="btn-primary">Save profile</button></div>
      </form>

      <form onSubmit={changePassword} className="card space-y-3 p-6">
        <h2 className="font-semibold">Change password</h2>
        <Alert kind="success">{wMsg}</Alert>
        <Alert>{wErr}</Alert>
        <Field label="Current password"><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
        <Field label="New password"><input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} /></Field>
        <p className="text-xs text-slate-400">Min 8 characters, including uppercase, lowercase, a number, and a special character.</p>
        <div><button className="btn-primary">Change password</button></div>
      </form>
    </div>
  );
}
