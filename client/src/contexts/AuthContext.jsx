import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.auth.getProfile();
      setUser(data.user || data);
    } catch (err) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    if (data.requires_2fa) {
      return { requires_2fa: true, temp_token: data.temp_token, user: data.user };
    }
    const t = data.token;
    const u = data.user;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    showToast('Login successful!');
    return u;
  };

  const verify2FA = async (tempToken, code) => {
    const data = await api.auth.verify2FALogin({ temp_token: tempToken, code });
    const t = data.token;
    const u = data.user;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    showToast('Two-factor verification successful!');
    return u;
  };

  const register = async (username, email, password) => {
    const data = await api.auth.register({ username, email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    showToast('Registration successful!');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    const data = await api.auth.updateProfile(profileData);
    setUser(data.user || data);
    showToast('Profile updated successfully!');
    return data;
  };

  const regenerateApiKey = async () => {
    const res = await api.auth.regenerateApiKey();
    const newKey = res.data?.api_key || res.api_key;
    setUser(prev => prev ? { ...prev, api_key: newKey } : null);
    showToast('API key regenerated successfully!');
    return newKey;
  };

  const value = {
    user,
    token,
    loading,
    login,
    verify2FA,
    register,
    logout,
    updateProfile,
    regenerateApiKey,
    fetchProfile,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    toast,
    showToast,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
