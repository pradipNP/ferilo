import axios from 'axios';
import {
  FALLBACK_ADMIN_STATS,
  FALLBACK_ADMIN_USER,
  FALLBACK_ADMIN_USERS,
  FALLBACK_CATEGORIES,
  FALLBACK_CONVERSATIONS,
  FALLBACK_DEMO_USER,
  FALLBACK_FAVORITE_IDS,
  FALLBACK_MY_LISTINGS,
  FALLBACK_NOTIFICATIONS,
  FALLBACK_OFFERS_INCOMING,
  FALLBACK_OFFERS_MINE,
  FALLBACK_ORDERS_PURCHASES,
  FALLBACK_ORDERS_SALES,
  FALLBACK_PRODUCTS,
  FALLBACK_REPORTS,
  FALLBACK_VERIFICATION,
  filterFallbackProducts,
  getFallbackAreas,
  getFallbackConversation,
  getFallbackFavorites,
  getFallbackOrder,
  getFallbackOrderQuote,
  getFallbackProduct,
  getFallbackUserReviews,
} from './fallbackData.js';

/** Empty in local Vite (proxy). Set VITE_API_URL on Cloudflare Pages, e.g. https://ferilo-api.onrender.com */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const OFFLINE_TOKEN = 'offline-demo-token';
const REQUEST_TIMEOUT_MS = 8000;

let accessToken = null;
let refreshPromise = null;
let dataSource = 'fallback';
const dataSourceListeners = new Set();

export function getDataSource() {
  return dataSource;
}

export function subscribeDataSource(listener) {
  dataSourceListeners.add(listener);
  return () => dataSourceListeners.delete(listener);
}

function setDataSource(next) {
  if (dataSource === next) return;
  dataSource = next;
  dataSourceListeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* ignore listener errors */
    }
  });
}

function markLive() {
  setDataSource('live');
}

function markFallback() {
  setDataSource('fallback');
}

export function isOfflineDemoSession() {
  return accessToken === OFFLINE_TOKEN;
}

function offlineUserForEmail(email = '') {
  const normalized = String(email).toLowerCase();
  if (normalized.includes('admin')) return { ...FALLBACK_ADMIN_USER };
  return { ...FALLBACK_DEMO_USER, email: normalized || FALLBACK_DEMO_USER.email };
}

async function withFallback(liveFn, fallbackFn) {
  try {
    const result = await liveFn();
    if (result === undefined || result === null) {
      throw new Error('Empty live response');
    }
    markLive();
    return result;
  } catch {
    markFallback();
    return fallbackFn();
  }
}

function assertArray(value, label = 'data') {
  if (!Array.isArray(value)) throw new Error(`Expected ${label} array`);
  return value;
}

function offlineWriteError(action = 'save changes') {
  const err = new Error(`Offline preview — connect to the live API to ${action}.`);
  err.code = 'OFFLINE_PREVIEW';
  err.response = {
    data: {
      error: {
        message: `Offline preview — connect to the live API to ${action}.`,
      },
    },
  };
  return err;
}

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
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
      accessToken !== OFFLINE_TOKEN
      && error.response?.status === 401
      && !original._retry
      && !original.url?.includes('/auth/login')
      && !original.url?.includes('/auth/register')
      && !original.url?.includes('/auth/refresh')
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
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return OFFLINE_TOKEN;
  }
  try {
    if (!refreshPromise) {
      refreshPromise = api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
    }
    const { data } = await refreshPromise;
    if (data?.success) {
      setAccessToken(data.data.accessToken);
      markLive();
      return data.data.accessToken;
    }
    throw new Error('Refresh failed');
  } catch (err) {
    markFallback();
    throw err;
  }
}

export async function fetchMe() {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    const raw = sessionStorage.getItem('ferilo_offline_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return { ...FALLBACK_DEMO_USER };
  }
  return withFallback(
    async () => {
      const { data } = await api.get('/auth/me');
      return data.data.user;
    },
    () => {
      setAccessToken(OFFLINE_TOKEN);
      return { ...FALLBACK_DEMO_USER };
    },
  );
}

export async function loginRequest(email, password) {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.data.accessToken);
    markLive();
    return data.data.user;
  } catch (err) {
    // Portfolio: if backend/DB is down, still allow a demo session.
    if (!err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      const user = offlineUserForEmail(email);
      setAccessToken(OFFLINE_TOKEN);
      sessionStorage.setItem('ferilo_offline_user', JSON.stringify(user));
      markFallback();
      return user;
    }
    throw err;
  }
}

export async function registerRequest(email, password, displayName) {
  try {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    setAccessToken(data.data.accessToken);
    markLive();
    return data.data.user;
  } catch (err) {
    if (!err.response || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      const user = {
        ...FALLBACK_DEMO_USER,
        email,
        displayName: displayName || FALLBACK_DEMO_USER.displayName,
        verificationStatus: 'UNVERIFIED',
      };
      setAccessToken(OFFLINE_TOKEN);
      sessionStorage.setItem('ferilo_offline_user', JSON.stringify(user));
      markFallback();
      return user;
    }
    throw err;
  }
}

export async function logoutRequest() {
  try {
    if (accessToken !== OFFLINE_TOKEN) await api.post('/auth/logout');
  } finally {
    clearAccessToken();
    sessionStorage.removeItem('ferilo_offline_user');
  }
}

export async function updateProfile(payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update profile');
  const { data } = await api.patch('/users/me/profile', payload);
  return data.data.user;
}

export async function fetchVerificationStatus() {
  return withFallback(
    async () => {
      const { data } = await api.get('/verification/status');
      return data.data;
    },
    () => ({ ...FALLBACK_VERIFICATION }),
  );
}

export async function submitVerification(formData) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('submit verification');
  const { data } = await api.post('/verification/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function fetchAdminVerifications() {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/verifications');
      return data.data;
    },
    () => [],
  );
}

export async function approveVerification(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('approve verification');
  const { data } = await api.patch(`/admin/verifications/${id}/approve`);
  return data.data;
}

export async function rejectVerification(id, reason) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('reject verification');
  const { data } = await api.patch(`/admin/verifications/${id}/reject`, { reason });
  return data.data;
}

export async function fetchProducts(params = {}) {
  return withFallback(
    async () => {
      const { data } = await api.get('/products', { params });
      if (!data?.success || !Array.isArray(data.data)) throw new Error('Invalid products response');
      return { products: data.data, meta: data.meta || { page: 1, limit: 24, total: data.data.length } };
    },
    () => filterFallbackProducts(params),
  );
}

export async function fetchProduct(id) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/products/${id}`);
      if (!data?.success || !data.data?.id) throw new Error('Invalid product response');
      return data.data;
    },
    () => getFallbackProduct(id),
  );
}

export async function fetchMyProduct(id) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/products/mine/${id}`);
      return data.data;
    },
    () => FALLBACK_MY_LISTINGS.find((p) => p.id === id) || FALLBACK_MY_LISTINGS[0],
  );
}

export async function fetchMyProducts() {
  return withFallback(
    async () => {
      const { data } = await api.get('/products/mine');
      if (!data?.success) throw new Error('Invalid my products response');
      return assertArray(data.data, 'myProducts');
    },
    () => [...FALLBACK_MY_LISTINGS],
  );
}

export async function createProduct(payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('create listings');
  const { data } = await api.post('/products', payload);
  return data.data;
}

export async function updateProduct(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update listings');
  const { data } = await api.patch(`/products/${id}`, payload);
  return data.data;
}

export async function publishProduct(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('publish listings');
  const { data } = await api.post(`/products/${id}/publish`);
  return data.data;
}

export async function deleteProduct(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('delete listings');
  const { data } = await api.delete(`/products/${id}`);
  return data.data;
}

export async function uploadProductImages(id, files) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('upload images');
  const formData = new FormData();
  for (const file of files) formData.append('images', file);
  const { data } = await api.post(`/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteProductImage(productId, imageId) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('delete images');
  const { data } = await api.delete(`/products/${productId}/images/${imageId}`);
  return data.data;
}

export async function fetchCategories() {
  return withFallback(
    async () => {
      const { data } = await api.get('/categories');
      if (!data?.success) throw new Error('Invalid categories response');
      return assertArray(data.data, 'categories');
    },
    () => [...FALLBACK_CATEGORIES],
  );
}

export async function fetchCategoryBySlug(slug) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/categories/${slug}`);
      if (!data?.success || !data.data?.slug) throw new Error('Invalid category response');
      return data.data;
    },
    () => FALLBACK_CATEGORIES.find((c) => c.slug === slug) || FALLBACK_CATEGORIES[0],
  );
}

export async function fetchFavoriteIds() {
  return withFallback(
    async () => {
      const { data } = await api.get('/favorites/ids');
      if (!data?.success) throw new Error('Invalid favorite ids response');
      return assertArray(data.data, 'favoriteIds');
    },
    () => [...FALLBACK_FAVORITE_IDS],
  );
}

export async function fetchFavorites() {
  return withFallback(
    async () => {
      const { data } = await api.get('/favorites');
      if (!data?.success) throw new Error('Invalid favorites response');
      return assertArray(data.data, 'favorites');
    },
    () => getFallbackFavorites(),
  );
}

export async function addFavorite(productId) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return { productId };
  }
  const { data } = await api.post(`/favorites/${productId}`);
  return data.data;
}

export async function removeFavorite(productId) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return { productId };
  }
  const { data } = await api.delete(`/favorites/${productId}`);
  return data.data;
}

export async function fetchMyOffers() {
  return withFallback(
    async () => {
      const { data } = await api.get('/offers/mine');
      if (!data?.success) throw new Error('Invalid offers response');
      return assertArray(data.data, 'offers');
    },
    () => [...FALLBACK_OFFERS_MINE],
  );
}

export async function fetchIncomingOffers() {
  return withFallback(
    async () => {
      const { data } = await api.get('/offers/incoming');
      if (!data?.success) throw new Error('Invalid incoming offers response');
      return assertArray(data.data, 'incomingOffers');
    },
    () => [...FALLBACK_OFFERS_INCOMING],
  );
}

export async function createOffer(payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('send offers');
  const { data } = await api.post('/offers', payload);
  return data.data;
}

export async function acceptOffer(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update offers');
  const { data } = await api.patch(`/offers/${id}/accept`);
  return data.data;
}

export async function rejectOffer(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update offers');
  const { data } = await api.patch(`/offers/${id}/reject`);
  return data.data;
}

export async function counterOffer(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update offers');
  const { data } = await api.patch(`/offers/${id}/counter`, payload);
  return data.data;
}

export async function cancelOffer(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update offers');
  const { data } = await api.patch(`/offers/${id}/cancel`);
  return data.data;
}

export async function fetchConversations() {
  return withFallback(
    async () => {
      const { data } = await api.get('/conversations');
      if (!data?.success) throw new Error('Invalid conversations response');
      return assertArray(data.data, 'conversations');
    },
    () => [...FALLBACK_CONVERSATIONS],
  );
}

export async function startConversation(productId, otherUserId) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return FALLBACK_CONVERSATIONS[0];
  }
  const { data } = await api.post('/conversations', { productId, otherUserId });
  return data.data;
}

export async function fetchConversation(id) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/conversations/${id}`);
      return data.data;
    },
    () => getFallbackConversation(id),
  );
}

export async function sendMessage(conversationId, body) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return {
      id: `fb-msg-local-${Date.now()}`,
      conversationId,
      senderId: FALLBACK_DEMO_USER.id,
      body,
      createdAt: new Date().toISOString(),
      isRead: true,
    };
  }
  const { data } = await api.post(`/conversations/${conversationId}/messages`, { body });
  return data.data;
}

export async function markConversationRead(conversationId) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return { ok: true };
  }
  const { data } = await api.patch(`/conversations/${conversationId}/read`);
  return data.data;
}

export async function fetchOrderQuote(productId, toCity) {
  return withFallback(
    async () => {
      const { data } = await api.get('/orders/quote', { params: { productId, toCity } });
      return data.data;
    },
    () => getFallbackOrderQuote(),
  );
}

export async function fetchMyOrders() {
  return withFallback(
    async () => {
      const { data } = await api.get('/orders/mine');
      if (!data?.success) throw new Error('Invalid orders response');
      return assertArray(data.data, 'orders');
    },
    () => [...FALLBACK_ORDERS_PURCHASES],
  );
}

export async function fetchSalesOrders() {
  return withFallback(
    async () => {
      const { data } = await api.get('/orders/sales');
      if (!data?.success) throw new Error('Invalid sales orders response');
      return assertArray(data.data, 'salesOrders');
    },
    () => [...FALLBACK_ORDERS_SALES],
  );
}

export async function fetchOrder(id) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data.data;
    },
    () => getFallbackOrder(id),
  );
}

export async function createOrder(payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('place orders');
  const { data } = await api.post('/orders', payload);
  return data.data;
}

export async function confirmOrder(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update orders');
  const { data } = await api.patch(`/orders/${id}/confirm`);
  return data.data;
}

export async function updateOrderStatus(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update orders');
  const { data } = await api.patch(`/orders/${id}/status`, payload);
  return data.data;
}

export async function completeOrder(id) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('complete orders');
  const { data } = await api.patch(`/orders/${id}/complete`);
  return data.data;
}

export async function cancelOrder(id, reason) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('cancel orders');
  const { data } = await api.patch(`/orders/${id}/cancel`, { reason });
  return data.data;
}

export async function fetchOrderReviews(orderId) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/orders/${orderId}/reviews`);
      return data.data;
    },
    () => [],
  );
}

export async function createReview(orderId, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('leave reviews');
  const { data } = await api.post(`/orders/${orderId}/reviews`, payload);
  return data.data;
}

export async function fetchUserReviews(userId) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/users/${userId}/reviews`);
      return data.data;
    },
    () => getFallbackUserReviews(userId),
  );
}

export async function fetchNotifications(params = {}) {
  return withFallback(
    async () => {
      const { data } = await api.get('/notifications', { params });
      return data.data;
    },
    () => ({
      notifications: [...FALLBACK_NOTIFICATIONS.notifications],
      unreadCount: FALLBACK_NOTIFICATIONS.unreadCount,
    }),
  );
}

export async function fetchUnreadNotificationCount() {
  return withFallback(
    async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.data.unreadCount;
    },
    () => FALLBACK_NOTIFICATIONS.unreadCount,
  );
}

export async function markNotificationRead(id) {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return { unreadCount: Math.max(0, FALLBACK_NOTIFICATIONS.unreadCount - 1) };
  }
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead() {
  if (accessToken === OFFLINE_TOKEN) {
    markFallback();
    return { unreadCount: 0 };
  }
  const { data } = await api.patch('/notifications/read-all');
  return data.data;
}

export async function createReport(payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('submit reports');
  const { data } = await api.post('/reports', payload);
  return data.data;
}

export async function fetchMyReports() {
  return withFallback(
    async () => {
      const { data } = await api.get('/reports/mine');
      return data.data;
    },
    () => [...FALLBACK_REPORTS],
  );
}

export async function fetchAdminStats() {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/stats');
      return data.data;
    },
    () => ({ ...FALLBACK_ADMIN_STATS }),
  );
}

export async function fetchAdminUsers(q) {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/users', { params: q ? { q } : {} });
      return data.data;
    },
    () => {
      const needle = String(q || '').toLowerCase();
      if (!needle) return [...FALLBACK_ADMIN_USERS];
      return FALLBACK_ADMIN_USERS.filter(
        (u) => u.email.includes(needle) || u.displayName.toLowerCase().includes(needle),
      );
    },
  );
}

export async function updateAdminUserStatus(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update users');
  const { data } = await api.patch(`/admin/users/${id}/status`, payload);
  return data.data;
}

export async function fetchAdminProducts(status = 'ACTIVE') {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/products', { params: { status } });
      return data.data;
    },
    () => FALLBACK_PRODUCTS.filter((p) => !status || p.status === status),
  );
}

export async function updateAdminProductStatus(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update listings');
  const { data } = await api.patch(`/admin/products/${id}/status`, payload);
  return data.data;
}

export async function fetchAdminOrders() {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/orders');
      return data.data;
    },
    () => [...FALLBACK_ORDERS_PURCHASES, ...FALLBACK_ORDERS_SALES],
  );
}

export async function fetchAdminReports(status = 'OPEN') {
  return withFallback(
    async () => {
      const { data } = await api.get('/admin/reports', { params: { status } });
      return data.data;
    },
    () => FALLBACK_REPORTS.filter((r) => !status || r.status === status),
  );
}

export async function updateAdminReport(id, payload) {
  if (accessToken === OFFLINE_TOKEN) throw offlineWriteError('update reports');
  const { data } = await api.patch(`/admin/reports/${id}`, payload);
  return data.data;
}

/** Public homepage helpers (also used before auth). */
export async function fetchCategoriesPublic() {
  return fetchCategories();
}

export async function fetchAreasPublic() {
  return withFallback(
    async () => {
      const { data } = await axios.get(`${API_ORIGIN}/api/v1/areas`, { timeout: REQUEST_TIMEOUT_MS });
      if (data?.success && Array.isArray(data.data)) return data.data;
      throw new Error('No areas returned');
    },
    () => getFallbackAreas(),
  );
}

export async function fetchFeaturedProductsPublic() {
  return withFallback(
    async () => {
      const { data } = await axios.get(`${API_ORIGIN}/api/v1/products`, {
        timeout: REQUEST_TIMEOUT_MS,
        params: { sort: 'popular', limit: 8 },
      });
      if (data?.success && Array.isArray(data.data)) return data.data;
      throw new Error('No featured products returned');
    },
    () => filterFallbackProducts({ sort: 'popular', limit: 8 }).products,
  );
}
