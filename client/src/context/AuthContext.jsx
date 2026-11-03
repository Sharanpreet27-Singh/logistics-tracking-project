import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { tokens } from '../services/api.js';
import { closeSocket } from '../services/socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokens.access));

  const logout = useCallback(() => {
    tokens.clear();
    closeSocket();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!tokens.access) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => tokens.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokens.set(data.data);
    setUser(data.data.user);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
