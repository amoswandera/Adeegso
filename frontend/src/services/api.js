import axios from 'axios';
import { getAuthTokens, setAuthTokens, clearAuthTokens } from '../utils/auth';

// Log environment variables for debugging
console.log('API Service - Environment Variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL
});

// Use Vite environment variables with fallbacks - use relative URLs for proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
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

// Export the axios instance as default
export default api;

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
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  requestPasswordReset: (email) => api.post('/auth/password/reset/', { email }),
  resetPassword: (data) => api.post('/auth/password/reset/confirm/', data),
  refresh: (refreshToken) => api.post('/auth/refresh/', refreshToken),
  logout: () => api.get('/auth/logout/'),
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

// Rider Profile API
export const riderProfileAPI = {
  getProfile: () => api.get('/rider/profile/'),
  updateProfile: (data) => {
    console.log('Updating profile with data:', data);
    return api.patch('/rider/profile/', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};

// Vendor API
export const vendorAPI = {
  getVendorProfile: () => api.get('/vendor/profile/'),
  updateVendorProfile: (data) => api.put('/vendor/profile/', data),

  // Vendor Products - Use vendor-specific endpoints
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
    return api.put(`/vendor/products/${id}/`, formData, {
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
      onAuthSuccess: [],
      onAuthError: [],
    };
    this.wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';
    this.userRole = null;
    this.userId = null;
  }

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  showNotification(title, body, url = '/') {
    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: url,
        });
      });
    } else if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        data: url,
      });
    }
  }

  connect(userRole = 'customer', userId = null) {
    if (this.socket) return;

    this.userRole = userRole;
    this.userId = userId;

    const { access } = getAuthTokens();
    if (!access) return;

    // Choose WebSocket endpoint based on user role
    let endpoint = '';
    switch (userRole) {
      case 'admin':
        endpoint = '/ws/admin/dashboard/';
        break;
      case 'customer':
        endpoint = '/ws/customer/orders/';
        break;
      case 'vendor':
        endpoint = '/ws/vendor/orders/';
        break;
      case 'rider':
        endpoint = '/ws/rider/orders/';
        break;
      default:
        endpoint = '/ws/customer/orders/';
    }

    // Use the configured WebSocket URL
    const wsUrl = `${this.wsUrl}${endpoint}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log(`WebSocket connected for ${userRole}`);
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
      console.log(`WebSocket disconnected for ${userRole}`);
      this.socket = null;
      // Try to reconnect after 5 seconds
      setTimeout(() => this.connect(userRole, userId), 5000);
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
        if (this.requestNotificationPermission()) {
          this.showNotification('Order Created', `New order #${data.order.id} has been placed.`, `/orders/${data.order.id}`);
        }
        break;
      case 'order_updated':
        this.callbacks.onOrderUpdated.forEach(callback => callback(data.order));
        break;
      case 'order_status_changed':
        this.callbacks.onOrderStatusChanged.forEach(callback =>
          callback(data.order_id, data.status)
        );
        if (this.requestNotificationPermission()) {
          this.showNotification('Order Status Updated', `Order #${data.order_id} status changed to ${data.status}.`, `/orders/${data.order_id}`);
        }
        break;
      case 'auth_success':
        this.callbacks.onAuthSuccess.forEach(callback => callback(data));
        break;
      case 'auth_error':
        this.callbacks.onAuthError.forEach(callback => callback(data));
        break;
      case 'analytics_update':
        // Handle admin analytics updates
        this.callbacks.onOrderUpdated.forEach(callback => callback(data));
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

// Export a singleton instance
export const webSocketService = new WebSocketService();
// General Products API for customers
export const customerAPI = {
  getProducts: (params) => {
    console.log('Fetching products for customers with params:', params)
    return api.get('/products/', { params })
      .then(response => {
        console.log('Products fetched successfully:', response.data)
        return response
      })
      .catch(error => {
        console.error('Failed to fetch products:', error.response?.status, error.response?.data)
        throw error
      })
  },
  getProduct: (id) => {
    console.log('Fetching product details for ID:', id)
    return api.get(`/products/${id}/`)
      .then(response => {
        console.log('Product details fetched successfully:', response.data)
        return response
      })
      .catch(error => {
        console.error('Failed to fetch product details:', error.response?.status, error.response?.data)
        throw error
      })
  },
};

// Rider Wallet API
export const riderWalletAPI = {
  getBalance: () => api.get('/rider/wallet/balance/'),
  getTransactions: () => api.get('/rider/wallet/transactions/'),
  requestWithdrawal: (amount) => api.post('/rider/wallet/withdraw/', { amount }),
};

// Rider Delivery API
export const riderDeliveryAPI = {
  getAvailableDeliveries: () => api.get('/rider/deliveries/'),
  getMyDeliveries: () => api.get('/rider/deliveries/my_deliveries/'),
  acceptDelivery: (deliveryId) => api.post(`/rider/deliveries/${deliveryId}/accept/`),
  rejectDelivery: (deliveryId) => api.post(`/rider/deliveries/${deliveryId}/reject/`),
  updateDeliveryStatus: (deliveryId, status) => api.post(`/rider/deliveries/${deliveryId}/update_status/`, { status }),
  updateLocation: (location) => api.post('/rider/deliveries/update_location/', location),
  setOnlineStatus: (data) => api.post('/rider/deliveries/set_online_status/', data),
};

// Vendor KYC API
export const vendorKYCAPI = {
  submitKYC: (kycData) => api.post('/vendor/kyc/submit/', kycData),
  getKYCStatus: () => api.get('/vendor/kyc/status/'),
  getPendingKYC: () => api.get('/admin/kyc/pending/'),
  getKYCDetail: (kycId) => api.get(`/admin/kyc/${kycId}/`),
  approveKYC: (kycId) => api.post(`/admin/kyc/${kycId}/approve/`),
  rejectKYC: (kycId, reason) => api.post(`/admin/kyc/${kycId}/reject/`, { reason }),
  requestKYCChanges: (kycId, notes) => api.post(`/admin/kyc/${kycId}/request-changes/`, { notes }),
};

// Rider KYC API
export const riderKYCAPI = {
  submitKYC: (kycData) => api.post('/rider/kyc/submit/', kycData),
  getKYCStatus: () => api.get('/rider/kyc/status/'),
  getPendingKYC: () => api.get('/admin/rider-kyc/pending/'),
  getKYCDetail: (kycId) => api.get(`/admin/rider-kyc/${kycId}/`),
  approveKYC: (kycId) => api.post(`/admin/rider-kyc/${kycId}/approve/`),
  rejectKYC: (kycId, reason) => api.post(`/admin/rider-kyc/${kycId}/reject/`, { reason }),
  requestKYCChanges: (kycId, notes) => api.post(`/admin/rider-kyc/${kycId}/request-changes/`, { notes }),
};
