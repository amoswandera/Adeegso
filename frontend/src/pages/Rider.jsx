import React, { useEffect, useState } from 'react'
import { fetchOrders, setOrderStatus } from '../services/api'

export default function Rider() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchOrders()
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const update = async (id, status) => {
    await setOrderStatus(id, status)
    await load()
  }

  const statusChip = (s) => {
    const map = {
      pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      accepted: 'bg-blue-50 text-blue-700 border-blue-200',
      assigned: 'bg-blue-50 text-blue-700 border-blue-200',
      on_way: 'bg-brand-blue text-white border-brand-blue',
      delivered: 'bg-brand-green text-white border-brand-green',
      cancelled: 'bg-gray-200 text-gray-700 border-gray-300',
    }
    const cls = map[s] || 'bg-gray-100 text-gray-700 border-gray-200'
    return <span className={`chip ${cls}`}>{s}</span>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Rider Dashboard</h1>
      <p className="text-sm text-gray-600 mb-3">Orders assigned to you</p>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="border rounded p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">Order #{o.id}</div>
              {statusChip(o.status)}
            </div>
            <div className="mt-2 space-x-2">
              {/* Accept/Reject semantics: from assigned -> on_way or back to accepted */}
              <button className="text-sm btn-success" onClick={() => update(o.id, 'on_way')}>Accept & Go</button>
              <button className="text-sm border px-2 py-1 rounded" onClick={() => update(o.id, 'accepted')}>Reject</button>
              <button className="text-sm bg-brand-blue text-white px-2 py-1 rounded" onClick={() => update(o.id, 'delivered')}>Delivered</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
