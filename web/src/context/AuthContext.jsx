import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.get('/auth/me');
          setUser(userData);
        } catch (error) {
          console.error('Session expired or invalid token', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      const safeRole = data.role || 'student';
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, role: safeRole }));
      setUser({ id: data.id, name: data.name, email: data.email, role: safeRole, avatar: data.avatar });
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role = 'admin') => {
    setLoading(true);
    try {
      const data = await api.post('/auth/demo-login', { role });
      const safeRole = data.role || role || 'admin';
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, role: safeRole }));
      setUser({ id: data.id, name: data.name, email: data.email, role: safeRole, avatar: data.avatar });
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { name, email, password, role });
      // If it is the first user, we might log them in automatically
      if (data.token) {
        const safeRole = data.role || role || 'admin';
        localStorage.setItem('token', data.token);
        setUser({ id: data.id, name: data.name, email: data.email, role: safeRole });
      }
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, demoLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
