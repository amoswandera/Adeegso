// Save tokens to local storage
export const setAuthTokens = ({ access, refresh }) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }
  }
};

// Get tokens from local storage
export const getAuthTokens = () => {
  if (typeof window !== 'undefined') {
    return {
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token'),
    };
  }
  return { access: null, refresh: null };
};

// Clear tokens from local storage
export const clearAuthTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
};

// Check if user has vendor role
export const isVendor = (user) => {
  return user?.role === 'vendor' || user?.is_vendor;
};

// Check if user has admin role
export const isAdmin = (user) => {
  return user?.role === 'admin' || user?.is_staff || user?.is_superuser;
};

// Get user data from token
export const getUserFromToken = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Get current user
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const { access } = getAuthTokens();
  return getUserFromToken(access);
};

// Check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  const user = getUserFromToken(token);
  if (!user || !user.exp) return true;
  return Date.now() >= user.exp * 1000;
};

// Check if user needs to refresh token
export const shouldRefreshToken = () => {
  if (typeof window === 'undefined') return false;
  const { access, refresh } = getAuthTokens();
  if (!access || !refresh) return false;
  
  const user = getUserFromToken(access);
  if (!user || !user.exp) return true;
  
  // Refresh if token expires in less than 5 minutes
  const expiresIn = (user.exp * 1000 - Date.now()) / 1000 / 60;
  return expiresIn < 5;
};

// Format user data
export const formatUserData = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name || user.firstName || '',
  lastName: user.last_name || user.lastName || '',
  fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email,
  role: user.role || (user.is_staff ? 'admin' : user.is_vendor ? 'vendor' : 'customer'),
  avatar: user.avatar || user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + ' ' + user.last_name)}&background=random`,
  phone: user.phone || user.phone_number || '',
  isVendor: user.is_vendor || user.role === 'vendor',
  isAdmin: user.is_staff || user.is_superuser || user.role === 'admin',
  ...user,
});
