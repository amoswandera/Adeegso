import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { authAPI } from '../services/api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Failed to parse cart from localStorage', error);
        localStorage.removeItem('cart');
      }
    }

    // If user is authenticated, sync cart with server
    if (isAuthenticated) {
      syncCartWithServer();
    }
  }, [isAuthenticated]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('cart');
    }
  }, [cart]);

  // Sync local cart with server
  const syncCartWithServer = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await authAPI.get('/cart/');
      const serverCart = response.data.items || [];
      console.log('Cart synced with server:', serverCart);
    } catch (error) {
      // Ignore 404 errors (endpoint doesn't exist)
      if (error.response?.status === 404) {
        console.log('Cart endpoint not found, using local storage only')
        return
      }
      console.error('Failed to sync cart with server:', error)
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated])

  // Merge local and server carts
  const mergeCarts = (localCart, serverCart) => {
    const merged = [...localCart];
    
    serverCart.forEach(serverItem => {
      const existingItemIndex = merged.findIndex(
        item => item.product_id === serverItem.product_id && 
               JSON.stringify(item.options) === JSON.stringify(serverItem.options)
      );
      
      if (existingItemIndex >= 0) {
        // If item exists in both, keep the larger quantity
        merged[existingItemIndex].quantity = Math.max(
          merged[existingItemIndex].quantity,
          serverItem.quantity
        );
      } else {
        // Add server item to local cart
        merged.push(serverItem);
      }
    });
    
    return merged;
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const item = {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        quantity,
        options,
        vendor_id: product.vendor_id
      };
      
      // Check if the same product with same options already exists in cart
      const existingItemIndex = cart.findIndex(
        cartItem => cartItem.product_id === item.product_id && 
                   JSON.stringify(cartItem.options) === JSON.stringify(item.options)
      );
      
      let updatedCart;
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += quantity;
      } else {
        // Add new item to cart
        updatedCart = [...cart, item];
      }
      
      setCart(updatedCart);
      
      // If user is authenticated, update server
      if (isAuthenticated) {
        try {
          await authAPI.put('/cart/', { items: updatedCart });
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('Cart endpoint not found, using local storage only')
          } else {
            console.error('Failed to update server cart:', error)
          }
        }
      }
      
      toast.success(`${quantity > 1 ? quantity + ' items' : 'Item'} added to cart`);
      return true;
    } catch (error) {
      console.error('Failed to add to cart', error);
      setError('Failed to add item to cart');
      toast.error('Failed to add item to cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update cart item quantity
  const updateCartItem = async (productId, quantity, options = {}) => {
    try {
      if (quantity < 1) {
        return removeFromCart(productId, options);
      }
      
      const updatedCart = cart.map(item => 
        (item.product_id === productId && 
         JSON.stringify(item.options) === JSON.stringify(options))
          ? { ...item, quantity }
          : item
      );
      
      setCart(updatedCart);
      
      // If user is authenticated, update server
      if (isAuthenticated) {
        try {
          await authAPI.put('/cart/', { items: updatedCart });
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('Cart endpoint not found, using local storage only')
          } else {
            console.error('Failed to update server cart:', error)
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update cart item', error);
      setError('Failed to update cart item');
      return false;
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId, options = {}) => {
    try {
      const updatedCart = cart.filter(
        item => !(item.product_id === productId && 
                 JSON.stringify(item.options) === JSON.stringify(options))
      );
      
      setCart(updatedCart);
      
      // If user is authenticated, update server
      if (isAuthenticated) {
        try {
          await authAPI.put('/cart/', { items: updatedCart });
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('Cart endpoint not found, using local storage only')
          } else {
            console.error('Failed to update server cart:', error)
          }
        }
      }
      
      toast.info('Item removed from cart');
      return true;
    } catch (error) {
      console.error('Failed to remove from cart', error);
      setError('Failed to remove item from cart');
      return false;
    }
  };

  // Clear the entire cart
  const clearCart = async () => {
    try {
      setCart([]);
      
      // If user is authenticated, clear server cart
      if (isAuthenticated) {
        try {
          await authAPI.put('/cart/', { items: [] });
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('Cart endpoint not found, using local storage only')
          } else {
            console.error('Failed to clear server cart:', error)
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to clear cart', error);
      setError('Failed to clear cart');
      return false;
    }
  };

  // Calculate cart total
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Get cart item count
  const getItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Check if cart is empty
  const isCartEmpty = cart.length === 0;

  // Get items by vendor
  const getItemsByVendor = (vendorId) => {
    return cart.filter(item => item.vendor_id === vendorId);
  };

  // Checkout
  const checkout = async (checkoutData) => {
    try {
      setLoading(true);
      
      if (isCartEmpty) {
        throw new Error('Your cart is empty');
      }
      
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        navigate('/login', { state: { from: '/checkout' } });
        return { success: false, requiresLogin: true };
      }
      
      // Create order
      const response = await authAPI.post('/orders/', {
        ...checkoutData,
        items: cart
      });
      
      // Clear cart after successful order
      await clearCart();
      
      // Redirect to order confirmation
      navigate(`/orders/${response.data.id}`, { replace: true });
      
      return { success: true, order: response.data };
    } catch (error) {
      console.error('Checkout failed', error);
      const errorMessage = error.response?.data?.detail || 'Checkout failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Value provided by the context
  const value = {
    cart,
    loading,
    error,
    isCartEmpty,
    cartTotal: getCartTotal(),
    itemCount: getItemCount(),
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getItemsByVendor,
    checkout,
    refreshCart: syncCartWithServer
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
