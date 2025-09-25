import React, { useEffect, useState, useMemo } from 'react'
import { fetchRiders, updateRider } from '../lib/api'
import { Link } from 'react-router-dom'

export default function AdminRiders() {
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState('')
  const [searchQ, setSearchQ] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchRiders()
      setRiders(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Refetch from backend on filter change
  useEffect(() => {
    const loadFiltered = async () => {
      const params = {}
      if (verified) params.verified = verified
      if (searchQ.trim()) params.q = searchQ.trim()
      const data = await fetchRiders(params)
      setRiders(data)
    }
    loadFiltered()
  }, [verified, searchQ])

  const filtered = useMemo(() => {
    const s = searchQ.trim().toLowerCase()
    if (!s) return riders
    return riders.filter(r => (
      String(r.id).includes(s) ||
      r.user?.username?.toLowerCase().includes(s)
    ))
  }, [searchQ, riders])

  const toggleVerify = async (rider) => {
    await updateRider(rider.id, { verified: !rider.verified })
    await load()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Riders</h1>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Link to="/admin/riders/new" className="inline-block bg-brand-blue text-white px-3 py-2 rounded text-sm">Create Rider</Link>
        <label className="text-sm">Verified
          <select className="border ml-2 p-1 rounded" value={verified} onChange={e=>setVerified(e.target.value)}>
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <input className="border p-2 rounded" placeholder="Search username" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
        <button className="btn-primary text-sm" onClick={()=>{
          const headers = ['id','username','verified','wallet_balance']
          const lines = [headers.join(',')]
          filtered.forEach(r => {
            lines.push([
              r.id,
              (r.user?.username||'').replaceAll(',',' '),
              r.verified ? 'yes' : 'no',
              r.wallet_balance||0,
            ].join(','))
          })
          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `riders_${Date.now()}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}>Export CSV</button>
      </div>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Username</th>
            <th className="p-2 border">Verified</th>
            <th className="p-2 border">Wallet</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(rider => (
            <tr key={rider.id}>
              <td className="p-2 border">{rider.id}</td>
              <td className="p-2 border">{rider.user?.username}</td>
              <td className="p-2 border">{rider.verified ? 'Yes' : 'No'}</td>
              <td className="p-2 border">{rider.wallet_balance}</td>
              <td className="p-2 border">
                <button className="text-sm bg-brand-blue text-white px-2 py-1 rounded" onClick={() => toggleVerify(rider)}>
                  {rider.verified ? 'Unverify' : 'Verify'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
