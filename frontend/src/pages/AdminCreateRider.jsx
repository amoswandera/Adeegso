import React, { useState } from 'react'
import { createRider } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function AdminCreateRider() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ user_id: '', verified: false })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const payload = {
        user_id: form.user_id ? Number(form.user_id) : undefined,
        verified: !!form.verified,
      }
      await createRider(payload)
      setMessage('Rider created')
      navigate('/admin/riders')
    } catch (err) {
      setMessage('Failed to create rider')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Create Rider</h1>
      <form onSubmit={onSubmit} className="grid gap-3 max-w-md">
        <input className="border p-2 rounded" name="user_id" value={form.user_id} onChange={onChange} placeholder="User ID (required)" required />
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="verified" checked={form.verified} onChange={onChange} />
          <span>Verified</span>
        </label>
        <button disabled={submitting} className="bg-brand-blue text-white px-4 py-2 rounded">
          {submitting ? 'Creating...' : 'Create Rider'}
        </button>
        {message && <div className="text-sm">{message}</div>}
      </form>
    </div>
  )
}
