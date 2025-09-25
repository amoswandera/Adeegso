import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet, useOutletContext } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiPackage, FiBarChart2, FiUsers, FiDollarSign, FiSettings, FiLogOut } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

const VendorLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendorData, setVendorData] = useState(null);
  const [vendorApproved, setVendorApproved] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Check vendor approval status
  const checkVendorApproval = async () => {
    // Skip approval check for testing
    return true;
  };

  useEffect(() => {
    const initializeVendor = async () => {
      // Skip API calls - use mock data for testing
      console.log('Vendor layout - API calls disabled for testing');

      setVendorApproved(true); // Always approved for testing

      // Use mock vendor data
      setVendorData({
        name: 'Test Restaurant',
        description: 'Delicious food delivered fast',
        status: 'active',
        approved: true
      });

      setLoading(false);
    };

    initializeVendor();
  }, []);

  const handleLogout = async () => {
    try {
      // In a real app, you would call a logout API
      localStorage.removeItem('authTokens');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/vendor/dashboard', icon: FiHome },
    { name: 'Products', href: '/vendor/products', icon: FiPackage },
    { name: 'Orders', href: '/vendor/orders', icon: FiBarChart2 },
    { name: 'Analytics', href: '/vendor/analytics', icon: FiBarChart2 },
    { name: 'Customers', href: '/vendor/customers', icon: FiUsers },
    { name: 'Earnings', href: '/vendor/earnings', icon: FiDollarSign },
    { name: 'Settings', href: '/vendor/settings', icon: FiSettings },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  // Show approval pending message if vendor is not approved
  // if (vendorApproved === false) {
  //   // Skip approval check for testing - always show main layout
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       {/* Approval pending content */}
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Adeegso</h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 px-2">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {vendorData?.name || 'My Restaurant'}
            </h2>
            <p className="text-sm text-gray-500">
              {vendorData?.description || 'Restaurant Owner'}
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150
                    ${isActive(item.href)
                      ? 'bg-brand-blue text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
          >
            <FiLogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <FiMenu className="h-6 w-6" />
              </button>

              <div className="flex-1" />

              <div className="flex items-center">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {vendorData?.name || 'My Restaurant'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {vendorData?.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet context={{ vendorData, loading, vendorApproved }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
