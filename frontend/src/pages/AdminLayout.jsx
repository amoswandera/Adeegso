import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export default function AdminLayout() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-brand-white text-gray-900">
      <header className="p-4 bg-brand-blue text-white">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-bold">Admin • Adeegso</span>
          <Link to="/vendors" className="text-sm underline hover:no-underline">Back to site</Link>
        </div>
      </header>
      <div className="container mx-auto flex">
        <aside className="w-60 p-4 border-r bg-brand-white">
          <nav className="grid gap-2">
            <Link to="/admin" className={`px-3 py-2 rounded ${isActive('/admin') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Dashboard</Link>
            <Link to="/admin/orders" className={`px-3 py-2 rounded ${isActive('/admin/orders') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Orders</Link>
            <Link to="/admin/vendors" className={`px-3 py-2 rounded ${isActive('/admin/vendors') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Vendors</Link>
            <Link to="/admin/riders" className={`px-3 py-2 rounded ${isActive('/admin/riders') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Riders</Link>
            <Link to="/admin/payments" className={`px-3 py-2 rounded ${isActive('/admin/payments') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Payments</Link>
            <Link to="/admin/users" className={`px-3 py-2 rounded ${isActive('/admin/users') ? 'bg-brand-blue text-white' : 'text-brand-blue hover:bg-brand-white'}`}>Users</Link>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
