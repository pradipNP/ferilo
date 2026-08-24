import axios from 'axios';

let accessToken = null;
let refreshPromise = null;

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/register') &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      try {
        await refreshAccessToken();
        return api(original);
      } catch {
        clearAccessToken();
      }
    }
    return Promise.reject(error);
  },
);

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  const { data } = await refreshPromise;
  if (data?.success) {
    setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  }
  throw new Error('Refresh failed');
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}

export async function loginRequest(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function registerRequest(email, password, displayName) {
  const { data } = await api.post('/auth/register', { email, password, displayName });
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
}
