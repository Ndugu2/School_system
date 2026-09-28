import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { roleHome } from '../config/permissions';

const AuthContext = createContext(null);

const buildUser = (data, fallbackRole) => {
  const role = data.role || fallbackRole || 'student';
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role,
    avatar: data.avatar,
    isActive: data.isActive !== undefined ? data.isActive : true,
    landing: data.landing || roleHome(role),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inactive, setInactive] = useState(false);

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setInactive(false);
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.get('/auth/me');
          setUser(buildUser(userData, userData.role));
        } catch (error) {
          console.error('Session check failed:', error);
          if (error.status === 403) {
            setInactive(true);
          }
          logout();
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setInactive(false);
    try {
      const data = await api.post('/auth/login', { email, password });
      const nextUser = buildUser(data, data.role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
      return data;
    } catch (err) {
      if (err.status === 403) setInactive(true);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role = 'admin') => {
    setLoading(true);
    setInactive(false);
    try {
      const data = await api.post('/auth/demo-login', { role });
      const nextUser = buildUser(data, role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
      return data;
    } catch (err) {
      if (err.status === 403) setInactive(true);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setInactive(false);
    try {
      const data = await api.post('/auth/register', { name, email, password, role });
      // If it is the first user, we might log them in automatically
      if (data.token) {
        const nextUser = buildUser(data, role);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(nextUser));
        setUser(nextUser);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, inactive, login, demoLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);