import axios from 'axios';
import { therapistToken, clientToken } from '../utils/storage.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const actor = config.actor || 'therapist';
  const token = actor === 'client' ? clientToken.get() : therapistToken.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response && error.response.status;
    const data = (error.response && error.response.data) || {};
    const actor = (error.config && error.config.actor) || 'therapist';

    if (status === 403 && data.code === 'UPGRADE_REQUIRED') {
      window.dispatchEvent(new CustomEvent('unfazed:upgrade', { detail: data }));
    }
    if (status === 401 && !(error.config && error.config.skipAuthRedirect)) {
      window.dispatchEvent(new CustomEvent('unfazed:unauthorized', { detail: { actor } }));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error && error.response && error.response.data && error.response.data.message) return error.response.data.message;
  if (error && error.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  if (error && error.message === 'Network Error') return 'Could not reach the server. Check your connection.';
  return fallback;
}

export function isUpgradeError(error) {
  return Boolean(error && error.response && error.response.data && error.response.data.code === 'UPGRADE_REQUIRED');
}

export default api;
