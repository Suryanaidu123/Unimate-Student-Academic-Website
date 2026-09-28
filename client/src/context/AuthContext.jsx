import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('unimate_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data.data))
      .catch(() => {
        localStorage.removeItem('unimate_token');
        localStorage.removeItem('unimate_user');
      })
      .finally(() => setLoading(false));
  }, []);

  function persist(token, u) {
    localStorage.setItem('unimate_token', token);
    localStorage.setItem('unimate_user', JSON.stringify(u));
    setUser(u);
  }

  function loginAs(data) {
    persist(data.accessToken, data.user);
  }

  function logout() {
    localStorage.removeItem('unimate_token');
    localStorage.removeItem('unimate_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginAs, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}