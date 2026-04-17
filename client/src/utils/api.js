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
  me: () => fetchWithAuth('/api/auth/me'),
  logout: () => fetchWithAuth('/api/auth/logout', { method: 'POST' }),

  changePassword: (newPassword) =>
    fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  getBases: () => fetchWithAuth('/api/bases'),
  createBase: (name) => fetchWithAuth('/api/bases', { method: 'POST', body: JSON.stringify({ name }) }),

  getItems: (baseId, params = {}) => {
    const q = new URLSearchParams({ base_id: baseId, ...params });
    return fetchWithAuth(`/api/items?${q.toString()}`);
  },

  createItem: (data) => fetchWithAuth('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => fetchWithAuth(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => fetchWithAuth(`/api/items/${id}`, { method: 'DELETE' }),

  getColumns: (baseId) => fetchWithAuth(`/api/bases/${baseId}/columns`),

  getAlerts: () => fetchWithAuth('/api/items/alerts'),

  getSettings: () => fetchWithAuth('/api/settings'),
  saveSettings: (data) => fetchWithAuth('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getHistory: (params = {}) => {
    const q = new URLSearchParams(params);
    return fetchWithAuth(`/api/history?${q.toString()}`);
  },

  getMouvements: (params = {}) => {
    const q = new URLSearchParams(params);
    return fetchWithAuth(`/api/mouvements?${q.toString()}`);
  },
};

export { downloadBlob };