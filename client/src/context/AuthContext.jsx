import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('coolair_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.auth.getMe();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (credentials) => {
    const response = await api.auth.login(credentials);
    if (response.success && response.data) {
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('coolair_token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(response.message || 'Login failed');
  };

  const register = async (userData) => {
    const response = await api.auth.register(userData);
    if (response.success && response.data) {
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('coolair_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(response.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('coolair_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isTechnician,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
