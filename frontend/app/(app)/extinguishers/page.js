'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatusBadge, Spinner, EmptyState, Modal, Field, Alert } from '@/components/ui';

const TYPES = ['water', 'co2', 'foam', 'dry_chemical'];
const SIZES = ['2.5lb', '5lb', '9lb', '12lb'];
const STATUSES = ['active', 'maintenance', 'expired', 'decommissioned'];

const empty = { serialNumber: '', location: '', type: 'co2', size: '5lb', installationDate: '', expiryDate: '', status: 'active' };

export default function ExtinguishersPage() {
  const { user } = useAuth();
  const canEdit = ['admin', 'inspector'].includes(user.role);
  const canDelete = user.role === 'admin';

  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filters, setFilters] = useState({ q: '', status: '', type: '' });
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', data }
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filters.q) qs.set('q', filters.q);
    if (filters.status) qs.set('status', filters.status);
    if (filters.type) qs.set('type', filters.type);
    qs.set('limit', limit);
    qs.set('offset', (page - 1) * limit);
    const res = await api.get(`/extinguishers?${qs.toString()}`);
    setItems(res.extinguishers);
    setTotal(res.total);
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  function openCreate() { setForm(empty); setError(''); setModal({ mode: 'create' }); }
  function openEdit(x) {
    setForm({
      serialNumber: x.serialNumber, location: x.location, type: x.type, size: x.size,
      installationDate: x.installationDate?.slice(0, 10), expiryDate: x.expiryDate?.slice(0, 10), status: x.status,
    });
    setError(''); setModal({ mode: 'edit', id: x.id });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (modal.mode === 'create') await api.post('/extinguishers', form);
      else await api.patch(`/extinguishers/${modal.id}`, form);
      setModal(null); load();
    } catch (err) {
      setError(err.details ? Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ') : err.message);
    } finally { setBusy(false); }
  }

  async function remove(x) {
    if (!confirm(`Delete extinguisher ${x.serialNumber}?`)) return;
    try { await api.del(`/extinguishers/${x.id}`); load(); }
    catch (err) { alert(err.message); }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fire Extinguishers</h1>
          <p className="text-sm text-slate-500">{items ? `${items.length} record(s)` : ''}</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openCreate}>+ Add extinguisher</button>}
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label="Search"><input className="input w-48" placeholder="Serial or location" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></Field>
        <Field label="Status">
          <select className="input w-40" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="input w-40" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className="card overflow-hidden">
        {!items ? <Spinner /> : items.length === 0 ? <EmptyState>No extinguishers found.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serial</th><th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th><th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Installed</th><th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((x) => (
                  <tr key={x.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{x.serialNumber}</td>
                    <td className="px-4 py-3">{x.location}</td>
                    <td className="px-4 py-3 capitalize">{x.type.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{x.size}</td>
                    <td className="px-4 py-3">{x.installationDate?.slice(0, 10)}</td>
                    <td className="px-4 py-3">{x.expiryDate?.slice(0, 10)}</td>
                    <td className="px-4 py-3"><StatusBadge value={x.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/extinguishers/${x.id}`} className="btn-ghost px-2 py-1 text-xs">View</Link>
                      {canEdit && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(x)}>Edit</button>}
                      {canDelete && <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => remove(x)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Add extinguisher' : 'Edit extinguisher'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" form="ext-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="ext-form" onSubmit={save} className="space-y-3">
          <Alert>{error}</Alert>
          <Field label="Serial number">
            <input className="input" value={form.serialNumber} onChange={set('serialNumber')}
              required maxLength={64} pattern={"[A-Za-z0-9][A-Za-z0-9\\-]{0,63}"}
              title="Letters/numbers/hyphens only (max 64)."
            />
          </Field>
          <Field label="Location"><input className="input" value={form.location} onChange={set('location')} required maxLength={255} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className="input" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Size"><select className="input" value={form.size} onChange={set('size')}>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Installation date"><input className="input" type="date" value={form.installationDate} onChange={set('installationDate')} required /></Field>
            <Field label="Expiry date"><input className="input" type="date" value={form.expiryDate} onChange={set('expiryDate')} required /></Field>
          </div>
          <Field label="Status"><select className="input" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        </form>
      </Modal>
    </div>
  );
}
