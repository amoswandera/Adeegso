import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * This component protects routes that require authentication and optionally specific user roles.
 * If the user is not authenticated, they will be redirected to the login page.
 * If the user doesn't have the required role, they will be redirected to the appropriate dashboard.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string|null} [props.requiredRole=null] - Required role to access the route (e.g., 'vendor', 'admin')
 * @param {boolean} [props.isOutlet=false] - Whether this is being used with React Router's Outlet
 * @returns {React.ReactNode}
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  isOutlet = false 
}) => {
  const { isAuthenticated, user, loading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} state={{ from: location }} replace />;
  }

  // If specific role is required and user doesn't have it, redirect to appropriate page
  if (requiredRole && !hasRole(requiredRole)) {
    const redirectPath = getRedirectPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  // If using with React Router v6 Outlet
  if (isOutlet) {
    return <Outlet />;
  }

  // Otherwise render children
  return children;
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

/**
 * HOC for protecting components with authentication and role-based access
 * 
 * @param {React.ComponentType} Component - The component to protect
 * @param {Object} options - Protection options
 * @param {string|null} options.requiredRole - Required role to access the component
 * @returns {React.ComponentType} Protected component
 */
const withProtection = (Component, { requiredRole = null } = {}) => {
  const WrappedComponent = (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  // Copy static properties from the original component
  WrappedComponent.displayName = `withProtection(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
};

export { ProtectedRoute, withProtection };

export default ProtectedRoute;
