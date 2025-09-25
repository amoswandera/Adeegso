import React, { useState } from 'react'
import { createProduct } from '../lib/api'

export default function Vendor() {
  const [name, setName] = useState('Sample Product')
  const [price, setPrice] = useState('9.99')
  const [stock, setStock] = useState('10')
  const [vendorId, setVendorId] = useState('1')
  const [message, setMessage] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      await createProduct({ vendor_id: Number(vendorId), name, price, stock })
      setMessage('Product created')
    } catch (e) {
      setMessage('Failed to create product')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Vendor Dashboard</h1>
      <form onSubmit={onSubmit} className="grid gap-3 max-w-md">
        <input className="border p-2 rounded" value={vendorId} onChange={e=>setVendorId(e.target.value)} placeholder="Vendor ID" />
        <input className="border p-2 rounded" value={name} onChange={e=>setName(e.target.value)} placeholder="Product name" />
        <input className="border p-2 rounded" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" />
        <input className="border p-2 rounded" value={stock} onChange={e=>setStock(e.target.value)} placeholder="Stock" />
        <button className="bg-brand-green text-white px-4 py-2 rounded">Create</button>
        {message && <div className="text-sm">{message}</div>}
      </form>
    </div>
  )
}


