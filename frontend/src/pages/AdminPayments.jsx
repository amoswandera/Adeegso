import React, { useEffect, useState } from 'react'
import { fetchPayments } from '../lib/api'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchPayments()
      setPayments(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Payments</h1>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Order</th>
            <th className="p-2 border">Provider</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Ref</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td className="p-2 border">{p.id}</td>
              <td className="p-2 border">{p.order}</td>
              <td className="p-2 border">{p.provider}</td>
              <td className="p-2 border">${p.amount}</td>
              <td className="p-2 border">{p.status}</td>
              <td className="p-2 border">{p.provider_ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
