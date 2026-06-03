'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner, StatusBadge } from '@/components/ui';

const TABS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'maintenance', label: 'Maintenance' },
];

function Table({ rows }) {
  if (!rows || !rows.length) return <p className="py-4 text-sm text-slate-400">No records.</p>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>{headers.map((h) => <th key={h} className="px-3 py-2">{h.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>{headers.map((h) => <td key={h} className="px-3 py-2">{String(r[h] ?? '—')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('inventory');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/reports/${tab}`).then(setData).catch(() => setData({ error: true }));
  }, [tab]);

  function exportFile(format) {
    api.download(`/reports/${tab}/export?format=${format}`, `${tab}_report.${format}`).catch((e) => alert(e.message));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">Real-time analytics with PDF / CSV export.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => exportFile('csv')}>⬇ CSV</button>
          <button className="btn-primary" onClick={() => exportFile('pdf')}>⬇ PDF</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {!data ? <Spinner /> : (
        <div className="space-y-5">
          {tab === 'inventory' && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card p-5"><div className="text-sm text-slate-500">Total</div><div className="text-3xl font-semibold">{data.total}</div></div>
                <div className="card p-5"><h3 className="mb-2 text-sm font-semibold">By status</h3>{data.byStatus.map((s) => <div key={s.status} className="flex justify-between py-0.5"><StatusBadge value={s.status} /><span>{s.count}</span></div>)}</div>
                <div className="card p-5"><h3 className="mb-2 text-sm font-semibold">By type</h3>{data.byType.map((t) => <div key={t.type} className="flex justify-between py-0.5 text-sm capitalize"><span>{t.type.replace('_', ' ')}</span><span>{t.count}</span></div>)}</div>
              </div>
              <div className="card p-5"><h3 className="mb-2 font-semibold">Monthly summary</h3><Table rows={data.summaries.monthly} /></div>
            </>
          )}
          {tab === 'inspections' && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                {Object.entries(data.counts).map(([k, v]) => (
                  <div key={k} className="card p-5"><div className="text-sm capitalize text-slate-500">{k}</div><div className="text-3xl font-semibold">{v}</div></div>
                ))}
              </div>
              <div className="card p-5"><h3 className="mb-2 font-semibold">All inspections</h3><Table rows={data.inspections} /></div>
            </>
          )}
          {tab === 'compliance' && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card p-5"><div className="text-sm text-slate-500">Compliance</div><div className="text-3xl font-semibold text-green-600">{data.compliancePercentage}%</div></div>
                <div className="card p-5"><div className="text-sm text-slate-500">Expired</div><div className="text-3xl font-semibold text-red-600">{data.expiredCount}</div></div>
                <div className="card p-5"><div className="text-sm text-slate-500">Upcoming (30d)</div><div className="text-3xl font-semibold text-amber-600">{data.upcomingCount}</div></div>
              </div>
              <div className="card p-5"><h3 className="mb-2 font-semibold">Expired extinguishers</h3><Table rows={data.expired} /></div>
              <div className="card p-5"><h3 className="mb-2 font-semibold">Upcoming expirations</h3><Table rows={data.upcomingExpirations} /></div>
            </>
          )}
          {tab === 'maintenance' && (
            <>
              <div className="card p-5"><h3 className="mb-2 font-semibold">Maintenance frequency</h3><Table rows={data.frequency} /></div>
              <div className="card p-5"><h3 className="mb-2 font-semibold">History</h3><Table rows={data.history} /></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
