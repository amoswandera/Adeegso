import React, { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiMenu, FiX, FiLogOut, FiSettings, FiPieChart, FiPackage, FiShoppingBag, FiUsers, FiDollarSign, FiTag, FiHome } from 'react-icons/fi'
import { vendorAPI } from '../services/api'

export default function VendorLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [vendorData, setVendorData] = useState(null)
  const [loading, setLoading] = useState(true)

  const isActive = (path) => location.pathname.startsWith(path)

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch vendor data
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setLoading(true)
        // Get vendor profile - filter by current user
        const vendorsResponse = await vendorAPI.getVendors()
        const vendor = vendorsResponse.data.find(v => v.owner === user?.id)
        
        if (vendor) {
          // Get order stats for pending orders count
          const ordersResponse = await vendorAPI.getOrders({ status: 'pending' })
          const pendingOrders = ordersResponse.data.length
          
          setVendorData({
            name: vendor.name,
            status: vendor.approved ? 'Active' : 'Pending Approval',
            rating: vendor.rating || 0,
            totalOrders: 0, // TODO: Get from analytics
            pendingOrders: pendingOrders
          })
        } else {
          // Fallback to mock data if vendor not found
          setVendorData({
            name: 'My Restaurant',
            status: 'Active',
            rating: 4.5,
            totalOrders: 124,
            pendingOrders: 3
          })
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error)
        // Fallback to mock data if API fails
        setVendorData({
          name: 'My Restaurant',
          status: 'Active',
          rating: 4.5,
          totalOrders: 124,
          pendingOrders: 3
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchVendorData()
    }
  }, [user])

  const navigation = [
    { name: 'Dashboard', path: '/vendor', icon: <FiHome className="mr-3" /> },
    { name: 'Orders', path: '/vendor/orders', icon: <FiShoppingBag className="mr-3" /> },
    { name: 'Products', path: '/vendor/products', icon: <FiPackage className="mr-3" /> },
    { name: 'Analytics', path: '/vendor/analytics', icon: <FiPieChart className="mr-3" /> },
    { name: 'Discounts', path: '/vendor/discounts', icon: <FiTag className="mr-3" /> },
    { name: 'Customers', path: '/vendor/customers', icon: <FiUsers className="mr-3" /> },
    { name: 'Earnings', path: '/vendor/earnings', icon: <FiDollarSign className="mr-3" /> },
    { name: 'Settings', path: '/vendor/settings', icon: <FiSettings className="mr-3" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                type="button"
                className="md:hidden text-gray-500 hover:text-gray-900 focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
              <div className="flex-shrink-0 flex items-center ml-4 md:ml-0">
                <span className="text-xl font-bold text-brand-blue">Adeegso <span className="text-gray-500">Vendor</span></span>
              </div>
            </div>
            
            <div className="flex items-center">
              {vendorData && (
                <div className="hidden md:flex items-center mr-6">
                  <div className="text-right mr-3">
                    <p className="text-sm font-medium text-gray-900">{vendorData.name}</p>
                    <p className="text-xs text-gray-500">{vendorData.status} • {vendorData.rating}★</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-brand-blue text-white flex items-center justify-center">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                title="Logout"
              >
                <FiLogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 overflow-y-auto`}>
          <div className="p-4 border-b border-gray-200">
            {vendorData ? (
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-xl">
                  {vendorData.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{vendorData.name}</p>
                  <p className="text-xs text-gray-500">{vendorData.status} • {vendorData.rating}★</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            )}
          </div>
          
          <nav className="mt-2 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md ${
                  isActive(item.path)
                    ? 'bg-brand-blue/10 text-brand-blue'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                {item.name}
                {item.name === 'Orders' && vendorData?.pendingOrders > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-4 text-white bg-red-500 rounded-full">
                    {vendorData.pendingOrders}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <Outlet context={{ vendorData, loading }} />
          </div>
        </main>
      </div>
    </div>
  )
}
