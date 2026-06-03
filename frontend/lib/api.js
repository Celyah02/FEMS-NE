'use client';

/**
 * Thin API client for the FEMS gateway.
 * - Stores access/refresh tokens in localStorage.
 * - Transparently retries once on 401 by refreshing the access token.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const store = {
  get access() { return typeof window !== 'undefined' ? localStorage.getItem('fems_access') : null; },
  get refresh() { return typeof window !== 'undefined' ? localStorage.getItem('fems_refresh') : null; },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem('fems_access', accessToken);
    if (refreshToken) localStorage.setItem('fems_refresh', refreshToken);
  },
  clear() {
    localStorage.removeItem('fems_access');
    localStorage.removeItem('fems_refresh');
    localStorage.removeItem('fems_user');
  },
};

async function refreshAccess() {
  const refreshToken = store.refresh;
  if (!refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  store.set({ accessToken: data.accessToken });
  return true;
}

async function request(path, { method = 'GET', body, raw = false, _retried = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (store.access) headers['Authorization'] = `Bearer ${store.access}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_retried && store.refresh && !path.startsWith('/auth/')) {
    const ok = await refreshAccess();
    if (ok) return request(path, { method, body, raw, _retried: true });
  }

  if (raw) {
    if (!res.ok) throw await toError(res);
    return res; // caller handles blob/text (used for exports)
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data?.error?.details;
    throw err;
  }
  return data;
}

async function toError(res) {
  let msg = `Request failed (${res.status})`;
  try { const j = await res.json(); msg = j?.error?.message || msg; } catch (_) {}
  const e = new Error(msg); e.status = res.status; return e;
}

export const api = {
  store,
  base: BASE,
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),

  // Auth helpers
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } });
    store.set(data);
    localStorage.setItem('fems_user', JSON.stringify(data.user));
    return data.user;
  },
  async logout() {
    try { await request('/auth/logout', { method: 'POST', body: { refreshToken: store.refresh } }); }
    catch (_) {}
    store.clear();
  },
  currentUser() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('fems_user');
    return raw ? JSON.parse(raw) : null;
  },

  /** Download a report export as a file. */
  async download(path, filename) {
    const res = await request(path, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};
