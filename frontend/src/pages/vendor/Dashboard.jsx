import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { FiDollarSign, FiShoppingBag, FiUsers, FiClock, FiAlertCircle, FiCheckCircle, FiPackage, FiPlus } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';
import { useState, useEffect } from 'react';

const StatCard = ({ title, value, icon: Icon, trend, trendText, className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <p className={`mt-1 flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? (
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(trend)}% {trendText}
          </p>
        )}
      </div>
      <div className="p-3 rounded-full bg-brand-blue/10 text-brand-blue">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const RecentOrderItem = ({ order }) => (
  <div className="flex items-center px-4 py-3 hover:bg-gray-50">
    <div className="flex-shrink-0">
      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
        <FiShoppingBag className="h-5 w-5 text-gray-500" />
      </div>
    </div>
    <div className="ml-4 flex-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Order #{order.id}</h3>
        <p className="text-sm font-medium text-gray-900">${order.amount}</p>
      </div>
      <p className="text-sm text-gray-500">{order.items} items • {order.time} ago</p>
    </div>
    <div>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        order.status === 'Completed' ? 'bg-green-100 text-green-800' :
        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        {order.status}
      </span>
    </div>
  </div>
);

const Dashboard = () => {
  const outletContext = useOutletContext();
  const vendorData = outletContext?.vendorData || {
    name: 'Test Restaurant',
    approved: true
  };
  const loading = outletContext?.loading || false;

  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Check if vendor is approved
  const isApproved = true; // Always approved for testing

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setStatsLoading(true);

        // Temporarily disable API calls - show mock data instead
        console.log('Vendor dashboard - API calls disabled for testing');

        // Show mock data for testing
        setStats([
          {
            title: 'Total Orders',
            value: 25,
            icon: <FiShoppingBag className="h-6 w-6" />,
            color: 'bg-blue-500'
          },
          {
            title: 'Pending Orders',
            value: 3,
            icon: <FiClock className="h-6 w-6" />,
            color: 'bg-yellow-500'
          },
          {
            title: 'Completed Orders',
            value: 22,
            icon: <FiCheckCircle className="h-6 w-6" />,
            color: 'bg-green-500'
          },
          {
            title: 'Total Revenue',
            value: '$1,250.00',
            icon: <FiDollarSign className="h-6 w-6" />,
            color: 'bg-purple-500'
          }
        ])

        // Mock recent orders
        setRecentOrders([
          {
            id: 1,
            customer: 'John Doe',
            status: 'completed',
            total: 45.99,
            items: 3
          },
          {
            id: 2,
            customer: 'Jane Smith',
            status: 'pending',
            total: 32.50,
            items: 2
          },
          {
            id: 3,
            customer: 'Mike Johnson',
            status: 'completed',
            total: 67.25,
            items: 4
          }
        ])

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Fallback to mock data on error
        setStats([
          {
            title: 'Total Orders',
            value: 0,
            icon: <FiShoppingBag className="h-6 w-6" />,
            color: 'bg-blue-500'
          },
          {
            title: 'Pending Orders',
            value: 0,
            icon: <FiClock className="h-6 w-6" />,
            color: 'bg-yellow-500'
          },
          {
            title: 'Completed Orders',
            value: 0,
            icon: <FiCheckCircle className="h-6 w-6" />,
            color: 'bg-green-500'
          },
          {
            title: 'Total Revenue',
            value: '$0.00',
            icon: <FiDollarSign className="h-6 w-6" />,
            color: 'bg-purple-500'
          }
        ])
        setRecentOrders([])
      } finally {
        setStatsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, Test Restaurant! Manage your restaurant operations.
          </p>
        </div>
      </div>

      {/* Approval Warning Banner */}
      {!isApproved && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiClock className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Account Pending Approval
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Your vendor account is pending approval from our administrators.
                  You can view your dashboard, but vendor functions like managing products and orders are limited until approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
        </div>
        <div className="p-4">
          {!isApproved ? (
            <div className="text-center py-8">
              <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Order Management Unavailable</h3>
              <p className="mt-1 text-sm text-gray-500">
                Order management features will be available once your account is approved.
              </p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your recent orders will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <p className="text-sm font-medium text-gray-900 mt-1">${order.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      {/* Menu Management Preview */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Menu Management</h2>
          <Link
            to="/vendor/products"
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            Manage Menu
            <FiPackage className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-brand-blue/10 rounded-lg p-3 inline-flex">
                <FiShoppingBag className="h-6 w-6 text-brand-blue" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Total Items</h3>
              <p className="text-2xl font-semibold text-gray-900">3</p>
              <p className="text-xs text-gray-500">Active menu items</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-lg p-3 inline-flex">
                <FiCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">In Stock</h3>
              <p className="text-2xl font-semibold text-gray-900">3</p>
              <p className="text-xs text-gray-500">Available for orders</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 rounded-lg p-3 inline-flex">
                <FiAlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Categories</h3>
              <p className="text-2xl font-semibold text-gray-900">3</p>
              <p className="text-xs text-gray-500">Menu categories</p>
            </div>
          </div>

          {/* Quick Menu Items Preview */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Menu Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Grilled Chicken Burger</h4>
                    <p className="text-xs text-gray-500">Main Course</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">$12.99</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    In Stock
                  </span>
                  <button className="text-xs text-brand-blue hover:text-brand-blue/80">
                    Edit
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Caesar Salad</h4>
                    <p className="text-xs text-gray-500">Appetizers</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">$8.99</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    In Stock
                  </span>
                  <button className="text-xs text-brand-blue hover:text-brand-blue/80">
                    Edit
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Chocolate Lava Cake</h4>
                    <p className="text-xs text-gray-500">Desserts</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">$6.99</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    In Stock
                  </span>
                  <button className="text-xs text-brand-blue hover:text-brand-blue/80">
                    Edit
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/vendor/products"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
              >
                <FiPlus className="mr-2 h-4 w-4" />
                Add New Item
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Action Required Section */}
      <div className="bg-amber-50 overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-6 w-6 text-amber-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-amber-800">Action Required</h3>
              <p className="mt-1 text-sm text-amber-700">
                Your menu is missing important details. Complete your setup to get more orders.
              </p>
              <div className="mt-4">
                <a
                  href="/vendor/setup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  Complete Setup
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
