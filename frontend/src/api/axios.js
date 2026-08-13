import axios from 'axios';

/**
 * The one axios instance. Nothing outside api/ imports this — services wrap it,
 * hooks call services, components call hooks.
 *
 * baseURL defaults to the relative /api so the Vite dev proxy (see
 * vite.config.js) keeps the browser on a single origin; the /media image URLs
 * the API returns then resolve without CORS.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const tokens = {
  get access() {
    return localStorage.getItem('access_token');
  },
  get refresh() {
    return localStorage.getItem('refresh_token');
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

/**
 * Broadcast rather than `window.location.href = '/login'`. A hard navigation
 * throws away the router and every bit of React state; AuthContext listens for
 * this and does a soft redirect that remembers where the user was.
 */
export const AUTH_EXPIRED = 'auth:expired';
const announceExpiry = () => window.dispatchEvent(new Event(AUTH_EXPIRED));

api.interceptors.request.use((config) => {
  const token = tokens.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

/**
 * Single-flight refresh. Without this, a page that fires four requests on mount
 * would run four refreshes in parallel and three of them would race a rotated
 * token into localStorage.
 */
let refreshing = null;

function refreshAccessToken() {
  if (refreshing) return refreshing;

  const refresh = tokens.refresh;
  if (!refresh) return Promise.reject(new Error('No refresh token'));

  refreshing = axios
    .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
    .then(({ data }) => {
      tokens.set({ access: data.access, refresh: data.refresh });
      return data.access;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/login/') || original?.url?.includes('/auth/token/refresh/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const access = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        tokens.clear();
        announceExpiry();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
