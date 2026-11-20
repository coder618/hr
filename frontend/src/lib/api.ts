import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token and active Organization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  const orgSlug = localStorage.getItem('active_org_slug');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (orgSlug) {
    config.headers['X-Organization'] = orgSlug;
  }

  return config;
});

// Response Interceptor: Handle global 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_org');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/install')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
