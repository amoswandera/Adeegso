import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    // Try to get tokens from localStorage on initial load
    const storedTokens = localStorage.getItem('authTokens');
    return storedTokens ? JSON.parse(storedTokens) : null;
  });
  const [loading, setLoading] = useState(false); // Start with false
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Set up axios interceptors when tokens change
  useEffect(() => {
    // Skip authentication for now - allow access to all pages
    setLoading(false);

    // Set user role based on current path
    const path = location.pathname;
    let userRole = 'customer';

    if (path.startsWith('/admin')) {
      userRole = 'admin';
    } else if (path.startsWith('/vendor')) {
      userRole = 'vendor';
    } else if (path.startsWith('/rider')) {
      userRole = 'rider';
    }

    setUser({
      id: 1,
      email: 'guest@example.com',
      username: 'guest',
      role: userRole
    });

    // Set the auth token for API requests
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens);
        if (parsedTokens.access) {
          setTokens(parsedTokens);
          // Set the auth token for API requests
          import('../lib/api').then(({ setAuthToken }) => {
            setAuthToken(parsedTokens.access);
          });
        }
      } catch (error) {
        console.error('Error parsing stored tokens:', error);
      }
    }
  }, [location.pathname]);

  // Set auth token when tokens change - run only once on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens);
        if (parsedTokens.access) {
          setTokens(parsedTokens);
          // Set the auth token for API requests
          import('../lib/api').then(({ setAuthToken }) => {
            setAuthToken(parsedTokens.access);
          });
        }
      } catch (error) {
        console.error('Error parsing stored tokens:', error);
      }
    }
  }, []); // Empty dependency array - run only once

  // Handle redirection when user data is loaded
  useEffect(() => {
    // Skip redirection for now - allow access to all pages
    setLoading(false);
  }, [user, tokens, loading, navigate, location.pathname]);

  // Function to fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('DEBUG: Fetching user profile...');
      console.log('DEBUG: Tokens:', tokens);

      // Only try to fetch profile if we have a valid access token
      if (!tokens?.access) {
        console.log('DEBUG: No access token available, skipping profile fetch');
        setLoading(false);
        return;
      }

      // Try to get user profile data
      const response = await authAPI.getProfile();
      console.log('DEBUG: Profile API response:', response);
      if (response.data) {
        console.log('DEBUG: Profile data received:', response.data);
        setUser(response.data);
        setError(null);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('DEBUG: Failed to fetch user profile:', error);
      console.error('DEBUG: Error response:', error.response);
      console.error('DEBUG: Error status:', error.response?.status);
      console.error('DEBUG: Error data:', error.response?.data);

      // If we get a 401 (unauthorized), clear any invalid tokens
      if (error.response?.status === 401) {
        console.log('DEBUG: 401 error, clearing invalid tokens');
        localStorage.removeItem('authTokens');
        setTokens(null);
      }
    }

    // Fallback: try to decode JWT token for user info
    try {
      if (tokens?.access) {
        console.log('DEBUG: Trying JWT token decode fallback');
        const tokenParts = tokens.access.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('DEBUG: JWT payload:', payload);
          const userRole = payload.role || 'customer'; // Ensure role has a default
          const userData = {
            id: payload.user_id,
            email: payload.email || 'user@example.com',
            username: payload.username || 'user',
            role: userRole,
            phone_number: payload.phone_number || '',
            is_verified: payload.is_verified || false
          };
          console.log('DEBUG: Setting user from JWT:', userData);
          setUser(userData);
          setError(null);
          setLoading(false);
          return;
        }
      }
    } catch (decodeError) {
      console.error('DEBUG: Failed to decode JWT token:', decodeError);
    }

    // Final fallback: create a basic user object if we have tokens but couldn't get user data
    if (tokens?.access) {
      console.log('DEBUG: Using fallback user object');
      const path = location.pathname;
      let userRole = 'customer';

      if (path.startsWith('/admin')) {
        userRole = 'admin';
      } else if (path.startsWith('/vendor')) {
        userRole = 'vendor';
      } else if (path.startsWith('/rider')) {
        userRole = 'rider';
      }

      setUser({
        id: 1,
        email: 'user@example.com',
        username: 'user',
        role: userRole
      });
      setError(null);
    }

    setLoading(false);
  }, [tokens, location.pathname]);

  // Function to log in a user
  const login = async (email, password) => {
    // Skip actual login for now - just set user as logged in with proper role
    const path = location.pathname;
    let userRole = 'customer';

    if (path.startsWith('/admin')) {
      userRole = 'admin';
    } else if (path.startsWith('/vendor')) {
      userRole = 'vendor';
    } else if (path.startsWith('/rider')) {
      userRole = 'rider';
    }

    setUser({
      id: 1,
      email: email || 'guest@example.com',
      username: email || 'guest',
      role: userRole
    });
    setTokens({
      access: 'mock-access-token-for-' + userRole,
      refresh: 'mock-refresh-token'
    });
    localStorage.setItem('authTokens', JSON.stringify({
      access: 'mock-access-token-for-' + userRole,
      refresh: 'mock-refresh-token'
    }));
    setLoading(false);
    return { success: true };
  };

  // Function to register a new user
  const register = async (userData) => {
    // Skip actual registration for now - just set user as logged in
    const path = location.pathname;
    let userRole = 'customer';

    if (path.startsWith('/admin')) {
      userRole = 'admin';
    } else if (path.startsWith('/vendor')) {
      userRole = 'vendor';
    } else if (path.startsWith('/rider')) {
      userRole = 'rider';
    }

    setUser({
      id: 1,
      email: userData.email || 'guest@example.com',
      username: userData.username || 'guest',
      role: userRole
    });
    setTokens({
      access: 'mock-access-token-for-' + userRole,
      refresh: 'mock-refresh-token'
    });
    localStorage.setItem('authTokens', JSON.stringify({
      access: 'mock-access-token-for-' + userRole,
      refresh: 'mock-refresh-token'
    }));
    setLoading(false);
    return { success: true };
  };

  // Function to log out a user
  const logout = useCallback(() => {
    // Don't actually log out for now - keep user logged in
    console.log('Logout called but authentication disabled');
  }, [navigate]);

  // Function to refresh the access token
  const refreshToken = useCallback(async () => {
    try {
      if (!tokens?.refresh) {
        throw new Error('No refresh token available');
      }
      
      const response = await authAPI.refresh({
        refresh: tokens.refresh
      });
      
      const { access } = response.data;
      const newTokens = { ...tokens, access };
      
      // Update stored tokens
      localStorage.setItem('authTokens', JSON.stringify(newTokens));
      setTokens(newTokens);
      
      return access;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      throw error;
    }
  }, [tokens, logout]);

  // Function to update user data
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!tokens?.access;

  // Check if user has a specific role
  const hasRole = (role) => {
    // For now, allow access to all roles
    return true;
  };

  // Value provided by the context
  const value = {
    user,
    tokens,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
