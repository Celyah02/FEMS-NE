'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatusBadge, Spinner, EmptyState, Modal, Field, Alert } from '@/components/ui';

const ROLES = ['admin', 'inspector', 'user'];
const empty = { firstName: '', lastName: '', email: '', password: '', role: 'user' };

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null); // { mode, id }
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Guard: only admins.
  useEffect(() => { if (user && user.role !== 'admin') router.replace('/dashboard'); }, [user, router]);

  const load = useCallback(async () => {
    try { const res = await api.get('/users'); setItems(res.users); } catch (e) { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function openCreate() { setForm(empty); setError(''); setModal({ mode: 'create' }); }
  function openEdit(u) { setForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive }); setError(''); setModal({ mode: 'edit', id: u.id }); }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (modal.mode === 'create') await api.post('/users', form);
      else await api.patch(`/users/${modal.id}`, { firstName: form.firstName, lastName: form.lastName, role: form.role, isActive: form.isActive });
      setModal(null); load();
    } catch (err) {
      setError(err.details ? Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ') : err.message);
    } finally { setBusy(false); }
  }

  async function remove(u) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try { await api.del(`/users/${u.id}`); load(); } catch (err) { alert(err.message); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-slate-500">{items ? `${items.length} user(s)` : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add user</button>
      </div>

      <div className="card overflow-hidden">
        {!items ? <Spinner /> : items.length === 0 ? <EmptyState>No users.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Active</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3"><StatusBadge value={u.role} /></td>
                    <td className="px-4 py-3">{u.isActive ? '✓' : '✗'}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => remove(u)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add user' : 'Edit user'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" form="user-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="user-form" onSubmit={save} className="space-y-3">
          <Alert>{error}</Alert>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className="input" value={form.firstName} onChange={set('firstName')} required maxLength={80} pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"} title="Letters only. Spaces, hyphens, and apostrophes allowed." /></Field>
            <Field label="Last name"><input className="input" value={form.lastName} onChange={set('lastName')} required maxLength={80} pattern={"[A-Za-z]+([ '-][A-Za-z]+)*"} title="Letters only. Spaces, hyphens, and apostrophes allowed." /></Field>
          </div>
          {modal?.mode === 'create' && (
            <>
              <Field label="Email"><input className="input" type="email" value={form.email} onChange={set('email')} required maxLength={255} /></Field>
              <Field label="Password"><input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} /></Field>
            </>
          )}
          <Field label="Role"><select className="input" value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
          {modal?.mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
