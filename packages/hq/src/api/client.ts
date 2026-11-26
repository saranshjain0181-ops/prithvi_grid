import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().user?.token || localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
