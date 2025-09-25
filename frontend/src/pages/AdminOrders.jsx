import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '../lib/api'
import { connectOrders } from '../lib/ws'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    let active = true
    const poll = async () => {
      const params = {}
      if (status) params.status = status
      if (from) params.from = from
      if (to) params.to = to
      const data = await fetchOrders(params)
      if (active) setOrders(data)
    }
    poll()
    const id = setInterval(poll, 3000)
    // WS subscribe for instant updates
    const ws = connectOrders(() => {
      // when any order changes, refetch with current params
      poll()
    })
    return () => { active = false; clearInterval(id) }
  }, [status, from, to])

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

  // Derived filtered list
  const filtered = React.useMemo(() => {
    const fromD = from ? new Date(from) : null
    const toD = to ? new Date(to) : null
    return orders.filter(o => {
      if (status && o.status !== status) return false
      const created = o.created_at ? new Date(o.created_at) : null
      if (fromD && created && created < fromD) return false
      if (toD && created && created > new Date(toD.getTime() + 24*60*60*1000 - 1)) return false
      return true
    })
  }, [orders, status, from, to])

  const exportCSV = (rows) => {
    const headers = ['id','customer','vendor','status','total','created_at']
    const lines = [headers.join(',')]
    rows.forEach(o => {
      lines.push([
        o.id,
        (o.customer?.username||'').replaceAll(',',' '),
        o.vendor,
        o.status,
        o.total_amount,
        o.created_at||''
      ].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin Orders</h1>
      {/* Quick filters */}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <label className="text-sm">Status
          <select className="border ml-2 p-1 rounded" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="accepted">accepted</option>
            <option value="assigned">assigned</option>
            <option value="on_way">on_way</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <label className="text-sm">From
          <input type="date" className="border ml-2 p-1 rounded" value={from} onChange={e=>setFrom(e.target.value)} />
        </label>
        <label className="text-sm">To
          <input type="date" className="border ml-2 p-1 rounded" value={to} onChange={e=>setTo(e.target.value)} />
        </label>
        <button className="btn-primary text-sm" onClick={() => exportCSV(filtered)}>
          Export CSV
        </button>
      </div>
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Customer</th>
            <th className="p-2 border">Vendor</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id}>
              <td className="p-2 border"><Link to={`/orders/${o.id}`} className="text-brand-blue underline">#{o.id}</Link></td>
              <td className="p-2 border">{o.customer?.username}</td>
              <td className="p-2 border">{o.vendor}</td>
              <td className="p-2 border">{statusChip(o.status)}</td>
              <td className="p-2 border">${o.total_amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


