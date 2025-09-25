import axios from 'axios';
import { getAuthTokens, setAuthTokens, clearAuthTokens } from '../utils/auth';

// Log environment variables for debugging
console.log('API Service - Environment Variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL
});

// Use Vite environment variables with fallbacks
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable credentials for CORS requests
  withCredentials: true, // Important for cookies, authorization headers with HTTPS
  validateStatus: (status) => status < 500, // Reject only if the status code is greater than or equal to 500
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { access } = getAuthTokens();
    console.log('DEBUG: API Request Interceptor');
    console.log('DEBUG: Access token exists:', !!access);
    console.log('DEBUG: Request URL:', config.url);
    console.log('DEBUG: Request headers before:', config.headers);

    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
      console.log('DEBUG: Authorization header added');
    } else {
      console.log('DEBUG: No access token, no Authorization header added');
    }

    console.log('DEBUG: Final request headers:', config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error status is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refresh } = getAuthTokens();
        if (!refresh) {
          // No refresh token, redirect to login
          clearAuthTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh,
        });

        const { access } = response.data;
        setAuthTokens({ access, refresh });
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (error) {
        // Refresh token failed, log the user out
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/token/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  requestPasswordReset: (email) => api.post('/auth/password/reset/', { email }),
  resetPassword: (data) => api.post('/auth/password/reset/confirm/', data),
  refresh: (refreshToken) => api.post('/auth/refresh/', refreshToken),
  getUsers: (params) => api.get('/users/', { params }),
  get: (url, config) => api.get(url, config), // Add generic get method
  post: (url, data, config) => api.post(url, data, config), // Add generic post method
  patch: (url, data, config) => api.patch(url, data, config), // Add generic patch method
  delete: (url, config) => api.delete(url, config), // Add generic delete method
};

// General Orders API functions (must be declared before vendorAPI object)
export async function fetchOrders(params = {}) {
  try {
    const response = await api.get('/orders/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export async function fetchPayments(params) {
  const { data } = await api.get('/payments/', { params })
  return data
}

export const setOrderStatus = async (orderId, status) => {
  try {
    const response = await api.post(`/orders/${orderId}/set-status/`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// End of general API

// Vendor API
export const vendorAPI = {
  getVendorProfile: () => api.get('/vendor/profile/'),
  updateVendorProfile: (data) => api.patch('/vendor/profile/', data),

  // Vendor Products
  getProducts: (params) => api.get('/vendor/products/', { params }),
  createProduct: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else if (key === 'tags' && Array.isArray(data[key])) {
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/vendor/products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateProduct: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else if (key === 'tags' && Array.isArray(data[key])) {
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.patch(`/vendor/products/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteProduct: (id) => api.delete(`/vendor/products/${id}/`),

  // Vendor Orders
  getOrders: (params) => api.get('/vendor/orders/', { params }),
  updateOrderStatus: (id, status) => api.patch(`/vendor/orders/${id}/`, { status }),

  // Vendor Analytics
  getAnalytics: (params) => api.get('/vendor/analytics/', { params }),
  getEarnings: (params) => api.get('/vendor/earnings/', { params }),

  // Vendor Settings
  updateSettings: (data) => api.patch('/vendor/settings/', data),
  getSettings: () => api.get('/vendor/settings/'),

  // Vendor Notifications
  getNotifications: (params) => api.get('/vendor/notifications/', { params }),
  markNotificationRead: (id) => api.patch(`/vendor/notifications/${id}/`, { read: true }),

  // Vendor KYC
  submitKYC: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] && data[key] instanceof File) {
        formData.append(key, data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/vendor/kyc/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getKYCStatus: () => api.get('/vendor/kyc/'),
};

// WebSocket service
class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {
      onOrderCreated: [],
      onOrderUpdated: [],
      onOrderStatusChanged: [],
    };
    this.wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';
  }

  connect() {
    if (this.socket) return;
    
    const { access } = getAuthTokens();
    if (!access) return;

    // Use the configured WebSocket URL
    const wsUrl = this.wsUrl;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate with the token
      this.socket.send(JSON.stringify({
        type: 'auth',
        token: access,
      }));
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.socket = null;
      // Try to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'order_created':
        this.callbacks.onOrderCreated.forEach(callback => callback(data.order));
        break;
      case 'order_updated':
        this.callbacks.onOrderUpdated.forEach(callback => callback(data.order));
        break;
      case 'order_status_changed':
        this.callbacks.onOrderStatusChanged.forEach(callback => 
          callback(data.order_id, data.status)
        );
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }
}

