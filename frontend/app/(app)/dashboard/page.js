'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Stat, Spinner, StatusBadge } from '@/components/ui';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/summary').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time overview of fire safety equipment.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Extinguishers" value={data.totalExtinguishers} />
        <Stat label="Compliance" value={`${data.compliance.compliancePercentage}%`}
          accent={data.compliance.compliancePercentage >= 80 ? 'text-green-600' : 'text-amber-600'}
          sub={`${data.compliance.expiredCount} expired`} />
        <Stat label="Pending Inspections" value={data.inspections.pending}
          sub={`${data.inspections.overdue} overdue`}
          accent={data.inspections.overdue > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Upcoming Expirations" value={data.compliance.upcomingCount} sub="next 30 days" accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Extinguishers by status</h2>
          <div className="space-y-2">
            {data.extinguishersByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <StatusBadge value={s.status} />
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Extinguishers by type</h2>
          <div className="space-y-2">
            {data.extinguishersByType.map((t) => (
              <div key={t.type} className="flex items-center justify-between">
                <span className="text-sm capitalize">{t.type.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${(t.count / data.totalExtinguishers) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm font-medium">{t.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Inspection status</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.inspections).map(([k, v]) => (
              <div key={k} className="rounded-md bg-slate-50 p-3">
                <div className="text-xs uppercase text-slate-400">{k}</div>
                <div className="text-2xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Recent maintenance</h2>
          <div className="space-y-2">
            {data.maintenance.recent.length === 0 && <p className="text-sm text-slate-400">No recent maintenance.</p>}
            {data.maintenance.recent.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0">
                <div>
                  <span className="font-medium">{m.serial_number}</span>
                  <span className="text-slate-500"> — {m.action_taken}</span>
                </div>
                <span className="text-xs text-slate-400">{m.maintenance_date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
