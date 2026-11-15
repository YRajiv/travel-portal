import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : undefined),
});

api.interceptors.request.use((config) => {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    return Promise.reject(new Error('VITE_API_URL is not configured for this deployment.'));
  }

  const token = localStorage.getItem('travel-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
