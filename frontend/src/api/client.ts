import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// ---------------------------------------------------------------------------
// Request interceptor — attach the Bearer token if present.
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 by attempting a single token refresh.
// ---------------------------------------------------------------------------
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request and only on 401.
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is already in-flight — bail so the queue can
        // retry after it resolves.  This avoids stampeding refresh calls.
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token — force login.
        isRefreshing = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('/api/auth/refresh/', {
          refresh: refreshToken,
        });

        // The backend wraps responses in an envelope — handle both shapes.
        const tokens = data?.data ?? data;
        const newAccess: string | undefined = tokens?.access;
        const newRefresh: string | undefined = tokens?.refresh;

        if (!newAccess) throw new Error('No access token in refresh response');

        localStorage.setItem('access_token', newAccess);
        if (newRefresh) {
          localStorage.setItem('refresh_token', newRefresh);
        }

        // Retry the original request with the new token.
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear everything and redirect.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
