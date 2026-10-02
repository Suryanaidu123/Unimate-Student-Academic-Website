import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const BadgeContext = createContext(null);

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const [badges, setBadges] = useState({});

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'STUDENT') { setBadges({}); return; }
    try {
      const r = await api.get('/badges');
      setBadges(r.data.data || {});
    } catch {
      setBadges({});
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const markRead = useCallback(async (section) => {
    if (!user || user.role !== 'STUDENT') return;
    try {
      await api.post(`/badges/${section}/read`);
      setBadges((prev) => ({ ...prev, [section]: 0 }));
    } catch {}
  }, [user]);

  return (
    <BadgeContext.Provider value={{ badges, refresh, markRead }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges must be inside BadgeProvider');
  return ctx;
}