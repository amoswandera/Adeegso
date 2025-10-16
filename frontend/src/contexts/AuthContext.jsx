import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    // Try to get tokens from sessionStorage on initial load
    const storedTokens = sessionStorage.getItem('authTokens');
    return storedTokens ? JSON.parse(storedTokens) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Set up axios interceptors when tokens change
  useEffect(() => {
    // Set the auth token for API requests if we have stored tokens
    const storedTokens = sessionStorage.getItem('authTokens');
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens);
        if (parsedTokens.access) {
          setTokens(parsedTokens);
          // Set the auth token for API requests
          import('../lib/api').then(({ setAuthToken }) => {
            setAuthToken(parsedTokens.access);
          }).catch(err => {
            console.error('Error setting auth token:', err);
          });
        }
      } catch (error) {
        console.error('Error parsing stored tokens:', error);
      }
    }
  }, []);

  // Fetch user profile when tokens are available
  useEffect(() => {
    if (tokens?.access && !user) {
      fetchUserData();
    }
  }, [tokens, user]);

  // Function to fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('DEBUG: Fetching user profile...');

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

      // If we get a 401 (unauthorized), clear invalid tokens
      if (error.response?.status === 401) {
        console.log('DEBUG: 401 error, clearing invalid tokens');
        sessionStorage.removeItem('authTokens');
        setTokens(null);
        setUser(null);
      }
    }

    setLoading(false);
  }, [tokens]);

  // Function to log in a user
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      console.log('DEBUG: Attempting login...');
      const response = await authAPI.login({ username, password });
      console.log('DEBUG: Login response:', response);

      if (response.data) {
        const { access, refresh, user: userData } = response.data;

        // Store tokens
        const tokenData = { access, refresh };
        sessionStorage.setItem('authTokens', JSON.stringify(tokenData));
        setTokens(tokenData);

        // Set auth token for API requests
        import('../lib/api').then(({ setAuthToken }) => {
          setAuthToken(access);
        });

        // Set user data
        setUser(userData);

        // Redirect based on role
        const redirectPath = getRedirectPath(userData.role);
        navigate(redirectPath);

        setLoading(false);
        return { success: true };
      }
    } catch (error) {
      console.error('DEBUG: Login failed:', error);
      setError(error.response?.data?.detail || 'Login failed');
      setLoading(false);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  // Function to register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      console.log('DEBUG: Attempting registration...');
      const response = await authAPI.register(userData);
      console.log('DEBUG: Register response:', response);

      if (response.data) {
        // Registration successful - user should login now
        setLoading(false);
        return { success: true, message: 'Registration successful. Please login.' };
      }
    } catch (error) {
      console.error('DEBUG: Registration failed:', error);
      setError(error.response?.data?.detail || 'Registration failed');
      setLoading(false);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  // Function to log out a user
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear session storage and state
      sessionStorage.removeItem('authTokens');
      setTokens(null);
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  // Function to refresh the access token
  const refreshToken = useCallback(async () => {
    try {
      if (!tokens?.refresh) {
        throw new Error('No refresh token available');
      }

      const response = await authAPI.refresh({ refresh: tokens.refresh });

      const { access } = response.data;
      const newTokens = { ...tokens, access };

      // Update stored tokens
      sessionStorage.setItem('authTokens', JSON.stringify(newTokens));
      setTokens(newTokens);

      // Update API interceptor
      import('../lib/api').then(({ setAuthToken }) => {
        setAuthToken(access);
      });

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

  // Helper function to get redirect path based on role
  const getRedirectPath = (role) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'vendor':
        return '/vendor/dashboard';
      case 'rider':
        return '/rider';
      default:
        return '/';
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!tokens?.access;

  // Check if user has a specific role
  const hasRole = (role) => {
    return user?.role === role;
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
