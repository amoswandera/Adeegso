import api from '../services/api.js';

// Vendor API functions
const vendorAPI = {
  // Get vendor profile
  getProfile: async () => {
    try {
      const response = await api.get('/vendor/profile/');
      return response;
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      throw error;
    }
  },
  // Get all products for the current vendor
  getProducts: async () => {
    try {
      const response = await api.get('/vendor/products/');
      return response;
    } catch (error) {
      console.error('Error fetching vendor products:', error);
      throw error;
    }
  },

  // Create a new product
  createProduct: async (productData) => {
    try {
      // Handle image upload separately if needed
      if (productData.image && productData.image instanceof File) {
        const formData = new FormData();

        // Add product data to FormData
        Object.keys(productData).forEach(key => {
          if (key === 'image') {
            formData.append('image', productData.image);
          } else if (key === 'tags') {
            // Handle tags array
            if (Array.isArray(productData.tags)) {
              productData.tags.forEach(tag => {
                formData.append('tags[]', tag);
              });
            }
          } else {
            formData.append(key, productData[key]);
          }
        });

        const response = await api.post('/vendor/products/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response;
      } else {
        // Regular JSON request for products without images
        const response = await api.post('/vendor/products/', productData);
        return response;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  // Update an existing product
  updateProduct: async (productId, productData) => {
    try {
      // Handle image upload separately if needed
      if (productData.image && productData.image instanceof File) {
        const formData = new FormData();

        // Add product data to FormData
        Object.keys(productData).forEach(key => {
          if (key === 'image') {
            formData.append('image', productData.image);
          } else if (key === 'tags') {
            // Handle tags array
            if (Array.isArray(productData.tags)) {
              productData.tags.forEach(tag => {
                formData.append('tags[]', tag);
              });
            }
          } else {
            formData.append(key, productData[key]);
          }
        });

        const response = await api.put(`/vendor/products/${productId}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response;
      } else {
        // Regular JSON request for products without images
        const response = await api.put(`/vendor/products/${productId}/`, productData);
        return response;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete a product
  deleteProduct: async (productId) => {
    try {
      const response = await api.delete(`/vendor/products/${productId}/`);
      return response;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Get vendor analytics/stats
  getAnalytics: async () => {
    try {
      const response = await api.get('/vendor/analytics');
      return response;
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      throw error;
    }
  },

  // Get vendor orders
  getOrders: async (status = null) => {
    try {
      const url = status ? `/vendor/orders?status=${status}` : '/vendor/orders';
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.patch(`/vendor/orders/${orderId}/status`, { status });
      return response;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

export default vendorAPI;
