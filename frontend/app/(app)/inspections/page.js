'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatusBadge, Spinner, EmptyState, Modal, Field, Alert } from '@/components/ui';

export default function InspectionsPage() {
  const { user } = useAuth();
  const canComplete = ['admin', 'inspector'].includes(user.role);

  const [items, setItems] = useState(null);
  const [exts, setExts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [scheduleModal, setScheduleModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(null); // inspection
  const [form, setForm] = useState({ extinguisherId: '', scheduledDate: '', scheduledTime: '', notes: '' });
  const [result, setResult] = useState({ result: 'pass', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const res = await api.get(`/inspections${qs}`);
    setItems(res.inspections);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/extinguishers').then((r) => setExts(r.extinguishers)).catch(() => {}); }, []);

  async function schedule(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/inspections', form);
      setScheduleModal(false); setForm({ extinguisherId: '', scheduledDate: '', scheduledTime: '', notes: '' });
      load();
    } catch (err) {
      setError(err.details ? Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ') : err.message);
    } finally { setBusy(false); }
  }

  async function complete(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post(`/inspections/${completeModal.id}/complete`, result);
      setCompleteModal(null); setResult({ result: 'pass', notes: '' });
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspections</h1>
          <p className="text-sm text-slate-500">{items ? `${items.length} record(s)` : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setError(''); setScheduleModal(true); }}>+ Schedule inspection</button>
      </div>

      <div className="card flex items-end gap-3 p-4">
        <Field label="Status">
          <select className="input w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {['pending', 'completed', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="card overflow-hidden">
        {!items ? <Spinner /> : items.length === 0 ? <EmptyState>No inspections.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Extinguisher</th><th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Result</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{i.serialNumber}</td>
                    <td className="px-4 py-3">{i.location}</td>
                    <td className="px-4 py-3">{i.scheduledDate?.slice(0, 10)} {i.scheduledTime?.slice(0, 5) || ''}</td>
                    <td className="px-4 py-3"><StatusBadge value={i.status} /></td>
                    <td className="px-4 py-3">{i.result ? <StatusBadge value={i.result} /> : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canComplete && i.status !== 'completed' && i.status !== 'cancelled' && (
                        <button className="btn-ghost px-2 py-1 text-xs text-brand-600" onClick={() => { setError(''); setCompleteModal(i); }}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule modal */}
      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule inspection"
        footer={<>
          <button className="btn-secondary" onClick={() => setScheduleModal(false)}>Cancel</button>
          <button className="btn-primary" form="sched-form" disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</button>
        </>}>
        <form id="sched-form" onSubmit={schedule} className="space-y-3">
          <Alert>{error}</Alert>
          <Field label="Extinguisher">
            <select className="input" value={form.extinguisherId} onChange={(e) => setForm({ ...form, extinguisherId: e.target.value })} required>
              <option value="">Select…</option>
              {exts.map((x) => <option key={x.id} value={x.id}>{x.serialNumber} — {x.location}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input className="input" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required /></Field>
            <Field label="Time"><input className="input" type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} /></Field>
        </form>
      </Modal>

      {/* Complete modal */}
      <Modal open={!!completeModal} onClose={() => setCompleteModal(null)} title={`Complete inspection — ${completeModal?.serialNumber || ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setCompleteModal(null)}>Cancel</button>
          <button className="btn-primary" form="complete-form" disabled={busy}>{busy ? 'Saving…' : 'Save result'}</button>
        </>}>
        <form id="complete-form" onSubmit={complete} className="space-y-3">
          <Alert>{error}</Alert>
          <Field label="Result">
            <select className="input" value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="needs_maintenance">Needs maintenance</option>
            </select>
          </Field>
          <p className="text-xs text-slate-400">“Needs maintenance” moves the extinguisher to maintenance status.</p>
          <Field label="Notes"><textarea className="input" rows={2} value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} maxLength={2000} /></Field>
        </form>
      </Modal>
    </div>
  );
}
