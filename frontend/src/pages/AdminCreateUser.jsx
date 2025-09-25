import React, { useState } from 'react'
import { createUser } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function AdminCreateUser() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'customer',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const payload = { ...form }
      await createUser(payload)
      setMessage('User created')
      navigate('/admin/users')
    } catch (err) {
      const detail = err?.response?.data
      const detailText = typeof detail === 'string' ? detail : JSON.stringify(detail)
      setError(`Failed to create user: ${detailText}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Create User</h1>
      <form onSubmit={onSubmit} className="grid gap-3 max-w-md">
        <input name="username" value={form.username} onChange={onChange} className="border p-2 rounded" placeholder="Username" required />
        <input type="password" name="password" value={form.password} onChange={onChange} className="border p-2 rounded" placeholder="Password (min 6)" required />
        <input name="email" value={form.email} onChange={onChange} className="border p-2 rounded" placeholder="Email" />
        <div className="grid grid-cols-2 gap-3">
          <input name="first_name" value={form.first_name} onChange={onChange} className="border p-2 rounded" placeholder="First name" />
          <input name="last_name" value={form.last_name} onChange={onChange} className="border p-2 rounded" placeholder="Last name" />
        </div>
        <input name="phone_number" value={form.phone_number} onChange={onChange} className="border p-2 rounded" placeholder="Phone number (for Account)" />
        <select name="role" value={form.role} onChange={onChange} className="border p-2 rounded">
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="rider">Rider</option>
          <option value="admin">Admin</option>
        </select>
        <button disabled={submitting} className="bg-brand-blue text-white px-4 py-2 rounded">
          {submitting ? 'Creating...' : 'Create User'}
        </button>
        {message && <div className="text-sm text-green-700">{message}</div>}
        {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}
      </form>
    </div>
  )
}
