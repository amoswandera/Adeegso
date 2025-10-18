import React, { useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth, AuthContext } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './styles.css';

// Auth & Core
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CustomerHome from './pages/CustomerHome';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Shop from './pages/Shop';
import OrderTracking from './pages/OrderTracking';

// Admin
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/Admin';
import AdminOrders from './pages/AdminOrders';
import AdminVendors from './pages/AdminVendors';
import AdminRiders from './pages/AdminRiders';
import AdminPayments from './pages/AdminPayments';
import AdminCreateVendor from './pages/AdminCreateVendor';
import AdminCreateRider from './pages/AdminCreateRider';
import AdminUsers from './pages/AdminUsers';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminProfile from './pages/AdminProfile';

// Vendor
import VendorLayout from './pages/vendor/VendorLayout';
import VendorDashboard from './pages/vendor/Dashboard';
import VendorProducts from './pages/vendor/Products';
import VendorOrders from './pages/vendor/Orders';
import VendorAnalytics from './pages/vendor/Analytics';
import VendorCustomers from './pages/vendor/VendorCustomers';
import VendorEarnings from './pages/vendor/VendorEarnings';
import VendorSettings from './pages/vendor/VendorSettings';

// Rider
import RiderLayout from './pages/RiderLayout';
import RiderDashboard from './pages/Rider';
import RiderOrders from './pages/Rider';

// Public
import Vendors from './pages/Vendors';
import PageNotFound from './pages/PageNotFound';

// Main layout component
function Layout({ children }) {
  const { user: currentUser, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-brand-blue hover:text-brand-blue/80">
                Adeegso
              </Link>
            </div>
            <div className="flex items-center">
              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-8 mr-8">
                <Link
                  to="/"
                  className={`text-sm font-medium ${location.pathname === '/' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-700 hover:text-brand-blue'}`}
                >
                  Home
                </Link>
                <Link
                  to="/vendors"
                  className={`text-sm font-medium ${location.pathname === '/vendors' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-700 hover:text-brand-blue'}`}
                >
                  Browse Restaurants
                </Link>

                {/* Show admin link only for admin users */}
                {isAuthenticated && currentUser?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`text-sm font-medium ${location.pathname.startsWith('/admin') ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-700 hover:text-brand-blue'}`}
                  >
                    Admin
                  </Link>
                )}

                {/* Show vendor link only for vendor users */}
                {isAuthenticated && currentUser?.role === 'vendor' && (
                  <Link
                    to="/vendor/dashboard"
                    className={`text-sm font-medium ${location.pathname.startsWith('/vendor') ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-700 hover:text-brand-blue'}`}
                  >
                    Vendor Dashboard
                  </Link>
                )}

                {/* Show rider link only for rider users */}
                {isAuthenticated && currentUser?.role === 'rider' && (
                  <Link
                    to="/rider"
                    className={`text-sm font-medium ${location.pathname.startsWith('/rider') ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-700 hover:text-brand-blue'}`}
                  >
                    Rider Dashboard
                  </Link>
                )}
              </nav>

              {/* Authentication buttons */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {currentUser?.first_name || currentUser?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-brand-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-blue/90"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Adeegso. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Vendor Routes
function VendorRoutes() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <VendorLayout>
        <Outlet />
      </VendorLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Layout><CustomerHome /></Layout>} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/products" element={<Layout><Products /></Layout>} />
              <Route path="/vendors" element={<Layout><Vendors /></Layout>} />
              <Route path="/shop/:vendorId" element={<Layout><Shop /></Layout>} />
              <Route path="/orders/:orderId" element={<Layout><OrderTracking /></Layout>} />
              <Route path="/cart" element={<Layout><Cart /></Layout>} />
              
              {/* Auth Routes */}
              <Route path="/login" element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              } />
              <Route path="/register" element={
                <AuthRedirect>
                  <Register />
                </AuthRedirect>
              } />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="vendors" element={<AdminVendors />} />
                <Route path="vendors/new" element={<AdminCreateVendor />} />
                <Route path="riders" element={<AdminRiders />} />
                <Route path="riders/new" element={<AdminCreateRider />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/new" element={<AdminCreateUser />} />
                <Route path="profile" element={<AdminProfile />} />
              </Route>
              
              {/* Vendor Routes */}
              <Route path="/vendor" element={<VendorRoutes />}>
                <Route index element={<VendorDashboard />} />
                <Route path="dashboard" element={<VendorDashboard />} />
                <Route path="products" element={<VendorProducts />} />
                <Route path="orders" element={<VendorOrders />} />
                <Route path="analytics" element={<VendorAnalytics />} />
                <Route path="customers" element={<VendorCustomers />} />
                <Route path="earnings" element={<VendorEarnings />} />
                <Route path="settings" element={<VendorSettings />} />
              </Route>
              
              {/* Rider Routes */}
              <Route path="/rider" element={
                <ProtectedRoute requiredRole="rider">
                  <RiderLayout />
                </ProtectedRoute>
              }>
                <Route index element={<RiderDashboard />} />
                <Route path="dashboard" element={<RiderDashboard />} />
                <Route path="orders" element={<RiderOrders />} />
              </Route>
              
              {/* 404 - Not Found */}
              <Route path="*" element={<Layout><PageNotFound /></Layout>} />
            </Routes>
          </CartProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Component to redirect authenticated users away from auth pages
function AuthRedirect({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // If user is authenticated, redirect to appropriate dashboard
  if (isAuthenticated && user) {
    const redirectPath = getRedirectPath(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById('root')).render(<App />)


