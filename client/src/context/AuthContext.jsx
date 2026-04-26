import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await apiClient.get('/auth/me');
        setUser(data);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (formData) => {
    const { data } = await apiClient.post('/auth/register', formData);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (formData) => {
    const { data } = await apiClient.put('/users/profile', formData);
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
