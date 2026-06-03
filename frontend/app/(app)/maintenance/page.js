'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Spinner, EmptyState, Modal, Field, Alert } from '@/components/ui';

export default function MaintenancePage() {
  const { user } = useAuth();
  const canLog = ['admin', 'inspector'].includes(user.role);

  const [items, setItems] = useState(null);
  const [exts, setExts] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ extinguisherId: '', actionTaken: '', maintenanceDate: '', issuesIdentified: '', notes: '', recommendations: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get('/maintenance');
    setItems(res.maintenance);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/extinguishers').then((r) => setExts(r.extinguishers)).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/maintenance', form);
      setModal(false);
      setForm({ extinguisherId: '', actionTaken: '', maintenanceDate: '', issuesIdentified: '', notes: '', recommendations: '' });
      load();
    } catch (err) {
      setError(err.details ? Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ') : err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-sm text-slate-500">{items ? `${items.length} record(s)` : ''}</p>
        </div>
        {canLog && <button className="btn-primary" onClick={() => { setError(''); setModal(true); }}>+ Log maintenance</button>}
      </div>

      <div className="card overflow-hidden">
        {!items ? <Spinner /> : items.length === 0 ? <EmptyState>No maintenance records.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Extinguisher</th><th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">Issues</th>
                  <th className="px-4 py-3">Recommendations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{m.serialNumber}</td>
                    <td className="px-4 py-3">{m.actionTaken}</td>
                    <td className="px-4 py-3">{m.maintenanceDate?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-500">{m.issuesIdentified || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{m.recommendations || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Log maintenance activity"
        footer={<>
          <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary" form="maint-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>}>
        <form id="maint-form" onSubmit={save} className="space-y-3">
          <Alert>{error}</Alert>
          <Field label="Extinguisher">
            <select className="input" value={form.extinguisherId} onChange={set('extinguisherId')} required>
              <option value="">Select…</option>
              {exts.map((x) => <option key={x.id} value={x.id}>{x.serialNumber} — {x.location}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Action taken"><input className="input" value={form.actionTaken} onChange={set('actionTaken')} required maxLength={255} /></Field>
            <Field label="Date"><input className="input" type="date" value={form.maintenanceDate} onChange={set('maintenanceDate')} required /></Field>
          </div>
          <Field label="Issues identified"><textarea className="input" rows={2} value={form.issuesIdentified} onChange={set('issuesIdentified')} maxLength={2000} /></Field>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} maxLength={2000} /></Field>
          <Field label="Recommendations"><textarea className="input" rows={2} value={form.recommendations} onChange={set('recommendations')} maxLength={2000} /></Field>
        </form>
      </Modal>
    </div>
  );
}
