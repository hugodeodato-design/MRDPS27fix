// src/hooks/useAuth.js — Hook d'authentification
import { useState, useCallback, useEffect } from 'react';
import { api, setToken, onUnauthorized } from '../utils/api.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Restaurer la session depuis localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('mrdp_token');
    if (savedToken) {
      setToken(savedToken);
      api.me()
        .then(u => {
          setUser(u);
          setMustChangePassword(!!u.must_change_password);
        })
        .catch(() => {
          localStorage.removeItem('mrdp_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Si token expiré côté serveur → déconnexion auto
    onUnauthorized(() => {
      setUser(null);
      setMustChangePassword(false);
    });
  }, []);

  const login = useCallback(async (userId, password) => {
    const data = await api.login(userId, password);
    localStorage.setItem('mrdp_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setMustChangePassword(data.user.mustChangePassword);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem('mrdp_token');
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.changePassword({ currentPassword, newPassword });
    setMustChangePassword(false);
    // Mettre à jour l'objet user
    setUser(u => u ? { ...u, must_change_password: 0 } : u);
  }, []);

  return { user, loading, mustChangePassword, login, logout, changePassword };
}
