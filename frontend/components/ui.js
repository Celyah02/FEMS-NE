'use client';

/** Small reusable UI primitives. */

export function StatusBadge({ value }) {
  const map = {
    active: 'bg-green-100 text-green-700',
    maintenance: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    decommissioned: 'bg-slate-200 text-slate-600',
    pending: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-200 text-slate-600',
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    needs_maintenance: 'bg-amber-100 text-amber-700',
    admin: 'bg-purple-100 text-purple-700',
    inspector: 'bg-blue-100 text-blue-700',
    user: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${map[value] || 'bg-slate-100 text-slate-600'}`}>{String(value ?? '—').replace(/_/g, ' ')}</span>;
}

export function Stat({ label, value, sub, accent = 'text-slate-900' }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-ghost px-2 py-1" onClick={onClose}>✕</button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const cls = kind === 'error'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Spinner() {
  return <div className="py-10 text-center text-slate-400">Loading…</div>;
}

export function EmptyState({ children }) {
  return <div className="py-10 text-center text-slate-400">{children}</div>;
}
