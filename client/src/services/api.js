import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const api = axios.create({ baseURL });

export const tokens = {
  get access() { return localStorage.getItem('accessToken'); },
  get refresh() { return localStorage.getItem('refreshToken'); },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true;
      try {
        refreshing ||= axios.post(`${baseURL}/auth/refresh`, { refreshToken: tokens.refresh }).finally(() => (refreshing = null));
        const { data } = await refreshing;
        tokens.set(data.data);
        return api(original);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (err) =>
  err.response?.data?.errors?.map((e) => `${e.field}: ${e.message}`).join(', ') ||
  err.response?.data?.message ||
  err.message ||
  'Something went wrong';

export default api;
