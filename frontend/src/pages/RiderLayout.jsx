import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export default function RiderLayout() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="p-4 bg-emerald-600 text-white">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-bold">Rider • Adeegso</span>
          <Link to="/home" className="text-sm underline hover:no-underline">Back to site</Link>
        </div>
      </header>
      <div className="container mx-auto flex">
        <aside className="w-60 p-4 border-r bg-white">
          <nav className="grid gap-2">
            <Link to="/rider" className={`px-3 py-2 rounded ${isActive('/rider') ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>Dashboard</Link>
            <Link to="/rider/orders" className={`px-3 py-2 rounded ${isActive('/rider/orders') ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>Orders</Link>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
