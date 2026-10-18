import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosInstance.js';
import { therapistToken } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [therapist, setTherapist] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(Boolean(therapistToken.get()));

  const refreshEntitlements = useCallback(async () => {
    const { data } = await api.get('/therapists/me/entitlements');
    setEntitlements(data);
    return data;
  }, []);

  const refreshTherapist = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setTherapist(data.therapist);
    return data.therapist;
  }, []);

  const logout = useCallback(() => {
    therapistToken.clear();
    setTherapist(null);
    setEntitlements(null);
  }, []);

  useEffect(() => {
    if (!therapistToken.get()) return;
    let active = true;
    Promise.all([refreshTherapist(), refreshEntitlements()])
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshTherapist, refreshEntitlements, logout]);

  useEffect(() => {
    const onUnauthorized = (event) => {
      if (event.detail && event.detail.actor === 'therapist') logout();
    };
    window.addEventListener('unfazed:unauthorized', onUnauthorized);
    return () => window.removeEventListener('unfazed:unauthorized', onUnauthorized);
  }, [logout]);

  const startSession = useCallback(
    async (data) => {
      therapistToken.set(data.token);
      setTherapist(data.therapist);
      await refreshEntitlements();
      return data.therapist;
    },
    [refreshEntitlements]
  );

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials, { skipAuthRedirect: true });
    return startSession(data);
  }, [startSession]);

  const register = useCallback(async (details) => {
    const { data } = await api.post('/auth/register', details, { skipAuthRedirect: true });
    return startSession(data);
  }, [startSession]);

  const value = useMemo(
    () => ({ therapist, setTherapist, entitlements, loading, login, register, logout, refreshEntitlements, refreshTherapist }),
    [therapist, entitlements, loading, login, register, logout, refreshEntitlements, refreshTherapist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
