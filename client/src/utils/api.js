// src/utils/api.js — Client HTTP centralisé
const BASE = '/api';

let _token = null;
let _onUnauthorized = null;

export function setToken(token) { _token = token; }
export function getToken() { return _token; }
export function onUnauthorized(cb) { _onUnauthorized = cb; }

async function request(method, path, body = null, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
    ...options,
  });

  if (res.status === 401) {
    _token = null;
    localStorage.removeItem('mrdp_token');
    if (_onUnauthorized) _onUnauthorized();
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  // Réponses sans body (204)
  if (res.status === 204) return null;

  // Réponses binaires (export xlsx)
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/vnd') || ct.includes('octet-stream')) {
    return res.blob();
  }

  return res.json();
}

export const api = {
  get:    (path)         => request('GET', path),
  post:   (path, body)   => request('POST', path, body),
  put:    (path, body)   => request('PUT', path, body),
  delete: (path)         => request('DELETE', path),

  // Auth
  login:          (userId, password) => request('POST', '/auth/login', { userId, password }),
  logout:         ()                 => request('POST', '/auth/logout'),
  me:             ()                 => request('GET', '/auth/me'),
  changePassword: (data)             => request('POST', '/auth/change-password', data),

  // Users
  getUsers:    ()        => request('GET', '/users'),
  createUser:  (data)    => request('POST', '/users', data),
  updateUser:  (id, data)=> request('PUT', `/users/${id}`, data),
  deleteUser:  (id)      => request('DELETE', `/users/${id}`),

  // Bases
  getBases:       ()          => request('GET', '/bases'),
  createBase:     (name)      => request('POST', '/bases', { name }),
  updateBase:     (id, name)  => request('PUT', `/bases/${id}`, { name }),
  deleteBase:     (id)        => request('DELETE', `/bases/${id}`),
  getColumns:     (baseId)    => request('GET', `/bases/${baseId}/columns`),
  saveColumns:    (baseId, c) => request('PUT', `/bases/${baseId}/columns`, c),

  // Items
  getItems:    (baseId, params = {}) => {
    const q = new URLSearchParams({ base_id: baseId, ...params });
    return request('GET', `/items?${q}`);
  },
  getAlerts:   ()             => request('GET', '/items/alerts'),
  createItem:  (data)         => request('POST', '/items', data),
  updateItem:  (id, data)     => request('PUT', `/items/${id}`, data),
  deleteItem:  (id)           => request('DELETE', `/items/${id}`),
  bulkImport:  (baseId, items)=> request('POST', '/items/bulk', { base_id: baseId, items }),

  // History
  getHistory:  (params = {}) => {
    const q = new URLSearchParams(params);
    return request('GET', `/history?${q}`);
  },

  // Settings
  getSettings:  ()     => request('GET', '/settings'),
  saveSettings: (data) => request('PUT', '/settings', data),

  // Export (renvoie un Blob)
  exportBase: (id)   => request('GET', `/export/base/${id}`),
  exportAll:  ()     => request('GET', '/export/all'),
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
