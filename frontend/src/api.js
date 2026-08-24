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

export async function updateProfile(payload) {
  const { data } = await api.patch('/users/me/profile', payload);
  return data.data.user;
}

export async function fetchVerificationStatus() {
  const { data } = await api.get('/verification/status');
  return data.data;
}

export async function submitVerification(formData) {
  const { data } = await api.post('/verification/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function fetchAdminVerifications() {
  const { data } = await api.get('/admin/verifications');
  return data.data;
}

export async function approveVerification(id) {
  const { data } = await api.patch(`/admin/verifications/${id}/approve`);
  return data.data;
}

export async function rejectVerification(id, reason) {
  const { data } = await api.patch(`/admin/verifications/${id}/reject`, { reason });
  return data.data;
}

export async function fetchProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return { products: data.data, meta: data.meta };
}

export async function fetchProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data.data;
}

export async function fetchMyProduct(id) {
  const { data } = await api.get(`/products/mine/${id}`);
  return data.data;
}

export async function fetchMyProducts() {
  const { data } = await api.get('/products/mine');
  return data.data;
}

export async function createProduct(payload) {
  const { data } = await api.post('/products', payload);
  return data.data;
}

export async function updateProduct(id, payload) {
  const { data } = await api.patch(`/products/${id}`, payload);
  return data.data;
}

export async function publishProduct(id) {
  const { data } = await api.post(`/products/${id}/publish`);
  return data.data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data.data;
}

export async function uploadProductImages(id, files) {
  const formData = new FormData();
  for (const file of files) formData.append('images', file);
  const { data } = await api.post(`/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteProductImage(productId, imageId) {
  const { data } = await api.delete(`/products/${productId}/images/${imageId}`);
  return data.data;
}

export async function fetchCategories() {
  const { data } = await api.get('/categories');
  return data.data;
}
