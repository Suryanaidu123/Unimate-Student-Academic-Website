import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try {
      const r = await api.get('/notifications/unread-count');
      setUnread(r.data.data.count || 0);
    } catch {
      setUnread(0);
    }
  }, [user]);

  useEffect(() => {
    refreshUnread();
    // Poll every 60s as a fallback
    const t = setInterval(refreshUnread, 60_000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  return (
    <NotificationContext.Provider value={{ unread, refreshUnread, setUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
}