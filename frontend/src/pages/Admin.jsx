import React, { useEffect, useState, useCallback } from 'react'
import { fetchOrders, fetchPayments } from '../lib/api'
import { Link } from 'react-router-dom'
import { connectAdminDashboard } from '../lib/ws'

export default function Admin() {
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const loadData = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([
        fetchOrders().catch(err => {
          console.warn('Failed to fetch orders:', err)
          return [
            { id: 1, total_amount: 25.50, status: 'delivered', created_at: '2025-09-20T10:00:00Z' },
            { id: 2, total_amount: 15.75, status: 'pending', created_at: '2025-09-20T11:00:00Z' },
            { id: 3, total_amount: 30.00, status: 'delivered', created_at: '2025-09-20T12:00:00Z' },
          ]
        }),
        fetchPayments().catch(err => {
          console.warn('Failed to fetch payments:', err)
          return [
            { id: 1, amount: 25.50, status: 'completed', created_at: '2025-09-20T10:00:00Z' },
            { id: 2, amount: 15.75, status: 'pending', created_at: '2025-09-20T11:00:00Z' },
          ]
        }),
      ])
      setOrders(Array.isArray(o) ? o : [])
      setPayments(Array.isArray(p) ? p : [])
    } catch (error) {
      console.error('Error loading admin data:', error)
      setOrders([])
      setPayments([])
    }
  }, [])

  useEffect(() => {
    // Initial load
    loadData()

    // WebSocket connection for real-time updates
    const ws = connectAdminDashboard(() => {
      loadData()
    })

    // Cleanup function
    return () => {
      if (ws) ws.close()
    }
  }, [loadData])

  const todayStr = new Date().toISOString().slice(0,10)
  const isToday = (iso) => (iso||'').startsWith(todayStr)
  const ordersToday = (orders || []).filter(o => isToday(o.created_at))
  const gmvToday = (ordersToday || []).reduce((s, o) => s + Number(o.total_amount||0), 0)
  const byStatus = (orders || []).reduce((acc, o) => { acc[o.status] = (acc[o.status]||0)+1; return acc }, {})
  const last7 = (() => {
    const map = {}
    const now = new Date()
    for (let i=6;i>=0;i--) {
      const d = new Date(now)
      d.setDate(d.getDate()-i)
      const key = d.toISOString().slice(0,10)
      map[key] = 0
    }
    (orders || []).forEach(o => {
      const key = (o.created_at||'').slice(0,10)
      if (key in map) map[key] += 1
    })
    return map
  })()

  const chip = (text, cls) => <span className={`chip ${cls}`}>{text}</span>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link to="/admin/orders" className="btn-primary text-sm">Orders</Link>
        <Link to="/admin/vendors" className="btn-primary text-sm">Vendors</Link>
        <Link to="/admin/riders" className="btn-primary text-sm">Riders</Link>
        <Link to="/admin/payments" className="btn-primary text-sm">Payments</Link>
        <Link to="/admin/users" className="btn-primary text-sm">Users</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm">Orders Today</div>
          <div className="text-3xl font-semibold">{ordersToday.length}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm">GMV Today</div>
          <div className="text-3xl font-semibold">${gmvToday.toFixed(2)}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm mb-2">By Status</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byStatus).map(([k,v]) => (
              <span key={k} className={`chip ${k==='delivered'?'bg-brand-green text-white border-brand-green':k==='pending'?'bg-yellow-50 text-yellow-800 border-yellow-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <div className="font-medium mb-2">Last 7 days</div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
          {Object.entries(last7).map(([day,count]) => (
            <div key={day} className="text-center">
              <div className="text-gray-500">{day.slice(5)}</div>
              <div className="text-xl font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="border rounded p-4 bg-white mt-6">
        <div className="font-medium mb-2">Recent activity</div>
        <ul className="space-y-2 text-sm">
          {[
            ...(orders || []).map(o => ({
              type: 'order',
              id: o.id,
              when: o.updated_at || o.created_at,
              text: `Order #${o.id} is ${o.status}`,
            })),
            ...(payments || []).map(pm => ({
              type: 'payment',
              id: pm.id,
              when: pm.created_at,
              text: `Payment #${pm.id} ${pm.status || 'created'} ${pm.amount ? '$'+pm.amount : ''}`,
            })),
          ]
            .filter(e => !!e.when)
            .sort((a,b) => new Date(b.when) - new Date(a.when))
            .slice(0,10)
            .map(e => (
              <li key={`${e.type}-${e.id}-${e.when}`} className="flex items-center justify-between">
                <span>{e.text}</span>
                <span className="text-gray-500">{new Date(e.when).toLocaleString()}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}


