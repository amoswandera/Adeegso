import React, { useEffect, useState, useCallback } from 'react'
import { fetchOrders, fetchPayments } from '../lib/api'
import { Link } from 'react-router-dom'
import { connectAdminDashboard } from '../lib/ws'
import api from '../services/api'

export default function Admin() {
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch analytics summary data
      const analyticsResponse = await api.get('/admin/analytics/summary/')
      setAnalytics(analyticsResponse.data)

      // Also fetch recent orders and payments for detailed views
      const [ordersData, paymentsData] = await Promise.all([
        fetchOrders().catch(err => []),
        fetchPayments().catch(err => [])
      ])

      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setPayments(Array.isArray(paymentsData) ? paymentsData : [])

    } catch (error) {
      console.error('Error loading admin data:', error)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    loadAnalyticsData()

    // WebSocket connection for real-time updates
    const ws = connectAdminDashboard((data) => {
      if (data.type === 'analytics_update') {
        setAnalytics(data.data)
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message)
      }
    })

    // Cleanup function
    return () => {
      if (ws) ws.close()
    }
  }, [loadAnalyticsData])

  const refreshData = () => {
    loadAnalyticsData()
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={refreshData}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <button
          onClick={refreshData}
          className="btn-primary text-sm"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link to="/admin/orders" className="btn-primary text-sm">Orders</Link>
        <Link to="/admin/products" className="btn-primary text-sm">Products</Link>
        <Link to="/admin/vendors" className="btn-primary text-sm">Vendors</Link>
        <Link to="/admin/riders" className="btn-primary text-sm">Riders</Link>
        <Link to="/admin/payments" className="btn-primary text-sm">Payments</Link>
        <Link to="/admin/users" className="btn-primary text-sm">Users</Link>
      </div>

      {/* Real-time Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm">Orders Today</div>
          <div className="text-3xl font-semibold">{analytics?.orders_today || 0}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm">GMV Today</div>
          <div className="text-3xl font-semibold">${(analytics?.gmv_today || 0).toFixed(2)}</div>
        </div>
        <div className="border rounded p-4 bg-white">
          <div className="text-gray-500 text-sm mb-2">By Status</div>
          <div className="flex flex-wrap gap-2">
            {analytics?.status_counts && Object.entries(analytics.status_counts).map(([k,v]) => (
              <span key={k} className={`chip ${k==='delivered'?'bg-brand-green text-white border-brand-green':k==='pending'?'bg-yellow-50 text-yellow-800 border-yellow-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 7-day trend */}
      <div className="border rounded p-4 bg-white mb-6">
        <div className="font-medium mb-2">Last 7 days</div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
          {analytics?.last_7_days && analytics.last_7_days.map((day) => (
            <div key={day.date} className="text-center">
              <div className="text-gray-500">{day.date.slice(5)}</div>
              <div className="text-xl font-semibold">{day.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="border rounded p-4 bg-white mb-6">
        <div className="font-medium mb-2">Recent Activity</div>
        <ul className="space-y-2 text-sm">
          {analytics?.recent_activity && analytics.recent_activity.length > 0 ? (
            analytics.recent_activity.map((event) => (
              <li key={`${event.type}-${event.id}-${event.timestamp}`} className="flex items-center justify-between">
                <span>{event.description}</span>
                <span className="text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-500">No recent activity</li>
          )}
        </ul>
      </div>

      {/* Overall Statistics */}
      {analytics?.total_stats && (
        <div className="border rounded p-4 bg-white">
          <div className="font-medium mb-4">Platform Overview</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500">Total Orders</div>
              <div className="text-2xl font-semibold">{analytics.total_stats.total_orders}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Total Revenue</div>
              <div className="text-2xl font-semibold">${analytics.total_stats.total_revenue.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Total Users</div>
              <div className="text-2xl font-semibold">{analytics.total_stats.total_users}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Active Vendors</div>
              <div className="text-2xl font-semibold">{analytics.total_stats.active_vendors}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">Active Riders</div>
              <div className="text-2xl font-semibold">{analytics.total_stats.active_riders}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


