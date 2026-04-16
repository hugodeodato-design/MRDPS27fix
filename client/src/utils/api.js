// client/src/utils/api.js
let token = null;

export function setToken(newToken) {
  token = newToken;
}

// Fonction pour gérer les erreurs 401 (token expiré)
export function onUnauthorized(callback) {
  // Cette fonction sera appelée par le fetch wrapper quand on reçoit 401
  window.onUnauthorized = callback;
}

// Wrapper fetch avec token automatique
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

// API principale
export const api = {
  // Auth
  me: () => fetchWithAuth('/api/auth/me'),
  logout: () => fetchWithAuth('/api/auth/logout', { method: 'POST' }),
  
  // Changement de mot de passe (premier login)
  changePassword: (newPassword) => 
    fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Bases
  getBases: () => fetchWithAuth('/api/bases'),
  createBase: (name) => 
    fetchWithAuth('/api/bases', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  // Items (Stock)
  getItems: (baseId, params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.etat) query.append('etat', params.etat);
    const url = `/api/items?base_id=${baseId}&${query.toString()}`;
    return fetchWithAuth(url);
  },

  createItem: (data) => 
    fetchWithAuth('/api/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (id, data) => 
    fetchWithAuth(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteItem: (id) => 
    fetchWithAuth(`/api/items/${id}`, { method: 'DELETE' }),

  getColumns: (baseId) => fetchWithAuth(`/api/bases/${baseId}/columns`),

  // Alertes
  getAlerts: () => fetchWithAuth('/api/items/alerts'),

  // Autres
  getSettings: () => fetchWithAuth('/api/settings'),
  saveSettings: (data) => 
    fetchWithAuth('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Mouvements
  getMouvements: (params = {}) => {
    const query = new URLSearchParams(params);
    return fetchWithAuth(`/api/mouvements?${query.toString()}`);
  },
};

export { fetchWithAuth };