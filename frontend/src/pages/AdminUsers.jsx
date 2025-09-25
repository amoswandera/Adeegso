import React, { useEffect, useMemo, useState } from 'react'
import { fetchUsers, updateUser, deleteUser } from '../lib/api'
import { Link } from 'react-router-dom'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchUsers()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter(u => (
      String(u.id).includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    ))
  }, [q, users])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Users</h1>
      <div className="mb-3">
        <Link to="/admin/users/new" className="inline-block bg-brand-blue text-white px-3 py-2 rounded text-sm">Create User</Link>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input className="border p-2 rounded w-80" placeholder="Search by id, username, email" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn-primary text-sm" onClick={()=>{
          const headers = ['id','username','email','first_name','last_name']
          const lines = [headers.join(',')]
          filtered.forEach(u => {
            lines.push([
              u.id,
              (u.username||'').replaceAll(',',' '),
              (u.email||'').replaceAll(',',' '),
              (u.first_name||'').replaceAll(',',' '),
              (u.last_name||'').replaceAll(',',' '),
            ].join(','))
          })
          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `users_${Date.now()}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}>Export CSV</button>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Username</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">First</th>
            <th className="p-2 border">Last</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td className="p-2 border">{u.id}</td>
              <td className="p-2 border">{u.username}</td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-56" value={u.email||''} onChange={e=>setUsers(prev=>prev.map(x=>x.id===u.id?{...x,email:e.target.value}:x))} />
              </td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-40" value={u.first_name||''} onChange={e=>setUsers(prev=>prev.map(x=>x.id===u.id?{...x,first_name:e.target.value}:x))} />
              </td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-40" value={u.last_name||''} onChange={e=>setUsers(prev=>prev.map(x=>x.id===u.id?{...x,last_name:e.target.value}:x))} />
              </td>
              <td className="p-2 border">
                <button className="text-sm btn-primary mr-2" disabled={savingId===u.id} onClick={async()=>{
                  setSavingId(u.id)
                  try {
                    await updateUser(u.id, { email: u.email, first_name: u.first_name, last_name: u.last_name })
                  } finally {
                    setSavingId(null)
                  }
                }}>{savingId===u.id?'Saving...':'Save'}</button>
                <button className="text-sm border px-2 py-1 rounded" disabled={deletingId===u.id} onClick={async()=>{
                  if(!confirm('Delete this user?')) return
                  setDeletingId(u.id)
                  try {
                    await deleteUser(u.id)
                    setUsers(prev=>prev.filter(x=>x.id!==u.id))
                  } finally {
                    setDeletingId(null)
                  }
                }}>{deletingId===u.id?'Deleting...':'Delete'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
