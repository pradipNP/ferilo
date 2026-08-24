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

export async function fetchCategoryBySlug(slug) {
  const { data } = await api.get(`/categories/${slug}`);
  return data.data;
}

export async function fetchFavoriteIds() {
  const { data } = await api.get('/favorites/ids');
  return data.data;
}

export async function fetchFavorites() {
  const { data } = await api.get('/favorites');
  return data.data;
}

export async function addFavorite(productId) {
  const { data } = await api.post(`/favorites/${productId}`);
  return data.data;
}

export async function removeFavorite(productId) {
  const { data } = await api.delete(`/favorites/${productId}`);
  return data.data;
}

export async function fetchMyOffers() {
  const { data } = await api.get('/offers/mine');
  return data.data;
}

export async function fetchIncomingOffers() {
  const { data } = await api.get('/offers/incoming');
  return data.data;
}

export async function createOffer(payload) {
  const { data } = await api.post('/offers', payload);
  return data.data;
}

export async function acceptOffer(id) {
  const { data } = await api.patch(`/offers/${id}/accept`);
  return data.data;
}

export async function rejectOffer(id) {
  const { data } = await api.patch(`/offers/${id}/reject`);
  return data.data;
}

export async function counterOffer(id, payload) {
  const { data } = await api.patch(`/offers/${id}/counter`, payload);
  return data.data;
}

export async function cancelOffer(id) {
  const { data } = await api.patch(`/offers/${id}/cancel`);
  return data.data;
}

export async function fetchConversations() {
  const { data } = await api.get('/conversations');
  return data.data;
}

export async function startConversation(productId, otherUserId) {
  const { data } = await api.post('/conversations', { productId, otherUserId });
  return data.data;
}

export async function fetchConversation(id) {
  const { data } = await api.get(`/conversations/${id}`);
  return data.data;
}

export async function sendMessage(conversationId, body) {
  const { data } = await api.post(`/conversations/${conversationId}/messages`, { body });
  return data.data;
}

export async function markConversationRead(conversationId) {
  const { data } = await api.patch(`/conversations/${conversationId}/read`);
  return data.data;
}

export async function fetchOrderQuote(productId, toCity) {
  const { data } = await api.get('/orders/quote', { params: { productId, toCity } });
  return data.data;
}

export async function fetchMyOrders() {
  const { data } = await api.get('/orders/mine');
  return data.data;
}

export async function fetchSalesOrders() {
  const { data } = await api.get('/orders/sales');
  return data.data;
}

export async function fetchOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.data;
}

export async function createOrder(payload) {
  const { data } = await api.post('/orders', payload);
  return data.data;
}

export async function confirmOrder(id) {
  const { data } = await api.patch(`/orders/${id}/confirm`);
  return data.data;
}

export async function updateOrderStatus(id, payload) {
  const { data } = await api.patch(`/orders/${id}/status`, payload);
  return data.data;
}

export async function completeOrder(id) {
  const { data } = await api.patch(`/orders/${id}/complete`);
  return data.data;
}

export async function cancelOrder(id, reason) {
  const { data } = await api.patch(`/orders/${id}/cancel`, { reason });
  return data.data;
}

export async function fetchOrderReviews(orderId) {
  const { data } = await api.get(`/orders/${orderId}/reviews`);
  return data.data;
}

export async function createReview(orderId, payload) {
  const { data } = await api.post(`/orders/${orderId}/reviews`, payload);
  return data.data;
}

export async function fetchUserReviews(userId) {
  const { data } = await api.get(`/users/${userId}/reviews`);
  return data.data;
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return data.data;
}

export async function fetchUnreadNotificationCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.unreadCount;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data.data;
}
