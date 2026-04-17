// client/src/utils/api.js

let token = null;

export function setToken(newToken) {
  token = newToken;
}

export function onUnauthorized(callback) {
  window.onUnauthorized = callback;
}

// Wrapper fetch avec token
async function fetchWithAuth(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    if (window.onUnauthorized) window.onUnauthorized();
    throw new Error('Token manquant ou invalide');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur ${response.status}`);
  }

  return response.json();
}

// Download helper
export function downloadBlob(data, filename, type = 'application/octet-stream') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// API complète
export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  me: () => fetchWithAuth('/api/auth/me'),
  logout: () => fetchWithAuth('/api/auth/logout', { method: 'POST' }),

  changePassword: (newPassword) =>
    fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // ── Invitations ───────────────────────────────────────────────────────────
  invite: (data) =>
    fetchWithAuth('/api/auth/invite', { method: 'POST', body: JSON.stringify(data) }),

  getInvitations: () => fetchWithAuth('/api/auth/invitations'),

  cancelInvitation: (id) =>
    fetchWithAuth(`/api/auth/invitations/${id}`, { method: 'DELETE' }),

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  getUsers: () => fetchWithAuth('/api/users'),

  createUser: (data) =>
    fetchWithAuth('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id, data) =>
    fetchWithAuth(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUser: (id) =>
    fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' }),

  // ── Bases ─────────────────────────────────────────────────────────────────
  getBases: () => fetchWithAuth('/api/bases'),
  createBase: (name) =>
    fetchWithAuth('/api/bases', { method: 'POST', body: JSON.stringify({ name }) }),

  // ── Articles ──────────────────────────────────────────────────────────────
  getItems: (baseId, params = {}) => {
    const q = new URLSearchParams({ base_id: baseId, ...params });
    return fetchWithAuth(`/api/items?${q.toString()}`);
  },

  createItem: (data) =>
    fetchWithAuth('/api/items', { method: 'POST', body: JSON.stringify(data) }),

  updateItem: (id, data) =>
    fetchWithAuth(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteItem: (id) =>
    fetchWithAuth(`/api/items/${id}`, { method: 'DELETE' }),

  getItemStats: () => fetchWithAuth('/api/items/stats'),

  // ── Colonnes ──────────────────────────────────────────────────────────────
  getColumns: (baseId) => fetchWithAuth(`/api/bases/${baseId}/columns`),

  // ── Alertes ───────────────────────────────────────────────────────────────
  getAlerts: () => fetchWithAuth('/api/items/alerts'),

  // ── Paramètres ────────────────────────────────────────────────────────────
  getSettings: () => fetchWithAuth('/api/settings'),
  saveSettings: (data) =>
    fetchWithAuth('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // ── Historique ────────────────────────────────────────────────────────────
  getHistory: (params = {}) => {
    const q = new URLSearchParams(params);
    return fetchWithAuth(`/api/history?${q.toString()}`);
  },

  // ── Mouvements ────────────────────────────────────────────────────────────
  getMouvements: (params = {}) => {
    const q = new URLSearchParams(params);
    return fetchWithAuth(`/api/mouvements?${q.toString()}`);
  },

  // ── Génériques (pour extensions futures) ─────────────────────────────────
  get: (path) => fetchWithAuth(`/api${path}`),
  post: (path, data) =>
    fetchWithAuth(`/api${path}`, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) =>
    fetchWithAuth(`/api${path}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => fetchWithAuth(`/api${path}`, { method: 'DELETE' }),
};

