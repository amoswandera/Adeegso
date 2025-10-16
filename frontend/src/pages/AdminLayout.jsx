import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiMenu, FiX } from 'react-icons/fi'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white text-gray-900">
      <header className="p-4 bg-brand-blue text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md hover:bg-brand-blue/80"
            >
              {sidebarOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
            <span className="font-bold">Admin • Adeegso</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/vendors" className="text-sm underline hover:no-underline">Back to site</Link>
            <button
              onClick={handleLogout}
              className="text-sm underline hover:no-underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto flex flex-col md:flex-row">
        <aside className={`w-full md:w-60 p-4 border-r bg-brand-white ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
          <nav className="grid gap-2">
            <Link to="/admin" className={`px-3 py-2 rounded ${isActive('/admin') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Dashboard</Link>
            <Link to="/admin/orders" className={`px-3 py-2 rounded ${isActive('/admin/orders') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Orders</Link>
            <Link to="/admin/vendors" className={`px-3 py-2 rounded ${isActive('/admin/vendors') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Vendors</Link>
            <Link to="/admin/riders" className={`px-3 py-2 rounded ${isActive('/admin/riders') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Riders</Link>
            <Link to="/admin/payments" className={`px-3 py-2 rounded ${isActive('/admin/payments') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Payments</Link>
            <Link to="/admin/profile" className={`px-3 py-2 rounded ${isActive('/admin/profile') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`} onClick={() => setSidebarOpen(false)}>Profile</Link>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
