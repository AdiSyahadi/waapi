import axios from 'axios';

// API Base URL - connects to backend on port 3000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      console.log('[API Interceptor] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
      console.log('[API Interceptor] Request URL:', config.url);
      console.log('[API Interceptor] All localStorage keys:', Object.keys(localStorage));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API Interceptor] Authorization header added');
      } else {
        console.warn('[API Interceptor] NO TOKEN FOUND IN LOCALSTORAGE!');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle token refresh in browser environment
    if (typeof window !== 'undefined' && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('[API Interceptor] Attempting token refresh with:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NULL');
        
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        console.log('[API Interceptor] Refresh response:', data);
        
        // Handle nested token structure
        const newAccessToken = data?.data?.tokens?.accessToken || data?.data?.accessToken || data?.accessToken;
        
        if (!newAccessToken) {
          console.error('[API Interceptor] No access token in refresh response');
          throw new Error('Invalid refresh response');
        }
        
        localStorage.setItem('accessToken', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        console.log('[API Interceptor] Token refreshed, retrying original request');
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API Interceptor] Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  getProfile: () => apiClient.get('/auth/profile'),

  updateProfile: (data: { name: string; email: string }) =>
    apiClient.put('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', data),

  enable2FA: () => apiClient.post('/auth/2fa/enable'),

  disable2FA: () => apiClient.post('/auth/2fa/disable'),

  deleteAccount: () => apiClient.delete('/auth/account'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post('/auth/reset-password', data),
};

// Sessions API
export const sessionsAPI = {
  list: () => apiClient.get('/sessions'),
  
  get: (sessionId: string) => apiClient.get(`/sessions/${sessionId}`),
  
  create: (data: { name: string; phone_number?: string; use_pairing?: boolean }) =>
    apiClient.post('/sessions', data),

  getQR: (sessionId: string) =>
    apiClient.get(`/sessions/${sessionId}/qr`),

  delete: (sessionId: string) =>
    apiClient.delete(`/sessions/${sessionId}`),

  reconnect: (sessionId: string) =>
    apiClient.post(`/sessions/${sessionId}/reconnect`),

  disconnect: (sessionId: string) =>
    apiClient.post(`/sessions/${sessionId}/disconnect`),
};

// Messages API
export const messagesAPI = {
  sendText: (data: { sessionId: string; to: string; message: string }) =>
    apiClient.post(`/messages/${data.sessionId}/send/text`, { phone: data.to, message: data.message }),

  sendMedia: (sessionId: string, formData: FormData) =>
    apiClient.post(`/messages/${sessionId}/send/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  history: (sessionId: string, params?: any) =>
    apiClient.get(`/messages/${sessionId}/messages`, { params }),
};

// API Keys API (User endpoints)
export const apiKeysAPI = {
  list: () => apiClient.get('/api-keys'),
  
  create: (data: { name: string }) =>
    apiClient.post('/api-keys', data),

  revoke: (keyId: string) =>
    apiClient.delete(`/api-keys/${keyId}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),

  getMessageStats: (params?: any) =>
    apiClient.get('/analytics/messages', { params }),

  getApiStats: (params?: any) =>
    apiClient.get('/analytics/api', { params }),
};

// Admin API
export const adminAPI = {
  getDashboard: () => apiClient.get('/analytics/admin/dashboard'),

  getStats: () => apiClient.get('/admin/stats'),

  getUsers: (params?: any) =>
    apiClient.get('/admin/users', { params }),

  getUserDetails: (userId: string) =>
    apiClient.get(`/admin/users/${userId}`),

  updateUser: (userId: string, data: any) =>
    apiClient.put(`/admin/users/${userId}`, data),

  suspendUser: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/suspend`),

  activateUser: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/activate`),

  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`),

  getApiKeys: () => apiClient.get('/admin/api-keys'),

  createApiKey: (data: { name: string }) =>
    apiClient.post('/admin/api-keys', data),

  revokeApiKey: (keyId: string) =>
    apiClient.delete(`/admin/api-keys/${keyId}`),

  getSystemMetrics: () =>
    apiClient.get('/analytics/admin/system'),

  getPlans: () =>
    apiClient.get('/admin/plans'),

  activateSubscriptionManually: (data: {
    user_id: string;
    plan_id: string;
    payment_method?: string;
    amount_paid?: number;
    payment_reference?: string;
    transfer_proof_url?: string;
    notes?: string;
    duration_days?: number;
  }) => apiClient.post('/admin/subscriptions/activate-manual', data),
};

// Billing API
export const billingAPI = {
  getPlans: () => apiClient.get('/billing/plans'),

  getCurrentPlan: () => apiClient.get('/billing/current-plan'),

  getSubscription: () => apiClient.get('/billing/subscription'),

  createCheckoutSession: (data: { planId: string; successUrl: string; cancelUrl: string }) =>
    apiClient.post('/billing/create-checkout-session', data),

  getInvoices: () => apiClient.get('/billing/invoices'),

  cancelSubscription: () =>
    apiClient.post('/billing/cancel-subscription'),
};
