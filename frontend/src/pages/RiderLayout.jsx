import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FiMenu, FiX } from 'react-icons/fi'

export default function RiderLayout() {
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="p-4 bg-emerald-600 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md hover:bg-emerald-700"
            >
              {sidebarOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
            <span className="font-bold">Rider • Adeegso</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/home" className="text-sm underline hover:no-underline">Back to site</Link>
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
        <aside className={`w-full md:w-60 p-4 border-r bg-white ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
          <nav className="grid gap-2">
            <Link to="/rider" className={`px-3 py-2 rounded ${isActive('/rider') ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`} onClick={() => setSidebarOpen(false)}>Dashboard</Link>
            <Link to="/rider/orders" className={`px-3 py-2 rounded ${isActive('/rider/orders') ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`} onClick={() => setSidebarOpen(false)}>Orders</Link>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
