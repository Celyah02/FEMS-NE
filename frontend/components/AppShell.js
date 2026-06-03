'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'inspector', 'user'] },
  { href: '/extinguishers', label: 'Extinguishers', icon: '🧯', roles: ['admin', 'inspector', 'user'] },
  { href: '/inspections', label: 'Inspections', icon: '🗓️', roles: ['admin', 'inspector', 'user'] },
  { href: '/maintenance', label: 'Maintenance', icon: '🔧', roles: ['admin', 'inspector', 'user'] },
  { href: '/reports', label: 'Reports', icon: '📑', roles: ['admin', 'inspector', 'user'] },
  { href: '/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { href: '/profile', label: 'Profile', icon: '👤', roles: ['admin', 'inspector', 'user'] },
];

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });

  async function load() {
    try { setData(await api.get('/notifications')); } catch (_) {}
  }
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  async function markAll() {
    await api.post('/notifications/read-all');
    load();
  }

  return (
    <div className="relative">
      <button className="btn-ghost relative px-2 py-1" onClick={() => setOpen(!open)}>
        🔔
        {data.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] text-white">
            {data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <button className="text-xs text-brand-600 hover:underline" onClick={markAll}>Mark all read</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {data.notifications.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No notifications</p>}
            {data.notifications.map((n) => (
              <div key={n.id} className={`rounded-md border p-2 text-sm ${n.isRead ? 'border-slate-100' : 'border-brand-200 bg-brand-50'}`}>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-slate-500">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const nav = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="font-bold text-brand-700">TZW FEMS</div>
            <div className="text-xs text-slate-400">Fire Safety</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span>{n.icon}</span>{n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xl">🔥</span><span className="font-bold text-brand-700">FEMS</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
                <div className="text-xs"><StatusBadge value={user.role} /></div>
              </div>
            </div>
            <button className="btn-secondary py-1.5" onClick={logout}>Logout</button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${pathname === n.href ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}>
              {n.icon} {n.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
