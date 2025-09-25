import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchOrder } from '../lib/api'
import { connectOrderDetail } from '../lib/ws'

export default function OrderTracking() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchOrder(orderId)
      setOrder(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    const ws = connectOrderDetail(orderId, () => {
      load()
    })
    return () => clearInterval(id)
  }, [orderId])

  const Step = ({ name, active }) => (
    <div className={`flex items-center gap-2 ${active ? 'text-brand-blue' : 'text-gray-400'}`}>
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-brand-blue' : 'bg-gray-300'}`}></span>
      <span>{name}</span>
    </div>
  )

  if (!order) return <div>Loading...</div>

  const steps = ['pending','accepted','assigned','on_way','delivered']
  const reached = (s) => steps.indexOf(order.status) >= steps.indexOf(s)

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
    return <span className={`chip ${cls}`}>{s.replace('_',' ')}</span>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Order Tracking #{order.id}</h1>
        {statusChip(order.status)}
      </div>
      <div className="mb-4 text-sm text-gray-600">Vendor: {order.vendor} • Total: ${order.total_amount}</div>
      <div className="grid gap-2 mb-6">
        {steps.map(s => <Step key={s} name={s.replace('_',' ')} active={reached(s)} />)}
      </div>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Created at</div><div className="font-medium">{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</div></div>
        <div className="border rounded p-3 bg-white"><div className="text-gray-500">Last updated</div><div className="font-medium">{order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}</div></div>
      </div>
      {!!order.events?.length && (
        <div className="mb-6">
          <div className="font-medium mb-2">Events</div>
          <ul className="space-y-2 text-sm">
            {order.events.map((e, idx) => (
              <li key={idx} className="flex items-center justify-between border rounded p-2 bg-white">
                <div className="flex items-center gap-2">
                  {statusChip(e.status)}
                  <span className="text-gray-700">{e.note || e.status.replace('_',' ')}</span>
                </div>
                <span className="text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <Link to="/home" className="btn-primary text-sm">Back to Home</Link>
        <Link to="/vendors" className="border px-3 py-2 rounded text-sm">Browse Vendors</Link>
      </div>
    </div>
  )
}
