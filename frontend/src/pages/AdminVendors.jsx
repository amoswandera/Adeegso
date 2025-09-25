import React, { useEffect, useState } from 'react'
import { fetchVendors, updateVendor } from '../lib/api'
import { Link, useLocation } from 'react-router-dom'

export default function AdminVendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, vendor: null })
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [approved, setApproved] = useState('')
  const [hasNewVendor, setHasNewVendor] = useState(false)

  const location = useLocation()

  const load = async () => {
    // Don't reload if we have a newly created vendor - preserve it
    if (hasNewVendor) {
      console.log('Skipping initial load to preserve newly created vendor')
      return
    }

    setLoading(true)
    try {
      console.log('Fetching vendors from API...')
      const data = await fetchVendors()
      console.log('Vendors API response:', data)

      if (Array.isArray(data) && data.length > 0) {
        console.log(`Found ${data.length} vendors`)
        setVendors(data)
      } else {
        console.log('No vendors returned from API, using fallback data')
        setVendors([
          {
            id: 1,
            name: 'Burger Palace',
            approved: true,
            commission_rate: 15,
            rating: 4.5,
            rating_count: 25,
            discount_percent: 10,
            latitude: 40.7128,
            longitude: -74.0060,
            owner: 2
          },
          {
            id: 2,
            name: 'Pizza Corner',
            approved: false,
            commission_rate: 12,
            rating: 4.2,
            rating_count: 18,
            discount_percent: 5,
            latitude: 40.7589,
            longitude: -73.9851,
            owner: 1
          },
          {
            id: 3,
            name: 'Green Garden',
            approved: true,
            commission_rate: 18,
            rating: 4.8,
            rating_count: 32,
            discount_percent: 15,
            latitude: 40.7282,
            longitude: -73.7949,
            owner: 1
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      console.log('Using fallback mock data due to error')
      // Fallback to mock data if API fails
      setVendors([
        {
          id: 1,
          name: 'Burger Palace',
          approved: true,
          commission_rate: 15,
          rating: 4.5,
          rating_count: 25,
          discount_percent: 10,
          latitude: 40.7128,
          longitude: -74.0060,
          owner: 2
        },
        {
          id: 2,
          name: 'Pizza Corner',
          approved: false,
          commission_rate: 12,
          rating: 4.2,
          rating_count: 18,
          discount_percent: 5,
          latitude: 40.7589,
          longitude: -73.9851,
          owner: 1
        },
        {
          id: 3,
          name: 'Green Garden',
          approved: true,
          commission_rate: 18,
          rating: 4.8,
          rating_count: 32,
          discount_percent: 15,
          latitude: 40.7282,
          longitude: -73.7949,
          owner: 1
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check for newly created vendor first
    if (location.state?.newVendor) {
      console.log('Found newly created vendor in location state:', location.state.newVendor)
      setVendors(prev => {
        const exists = prev.some(v => v.id === location.state.newVendor.id)
        if (exists) return prev
        setHasNewVendor(true)
        return [...prev, location.state.newVendor]
      })
    }
  }, [location.state])

  useEffect(() => {
    // Only load if we don't have a newly created vendor
    if (!hasNewVendor && !location.state?.newVendor) {
      load()
    }
  }, [hasNewVendor, location.state])

  const refreshVendors = async () => {
    setHasNewVendor(false)
    await load()
  }

  const onFieldChange = (id, field, value) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  const saveRow = async (v) => {
    const payload = {
      rating: v.rating ?? 0,
      rating_count: v.rating_count ?? 0,
      discount_percent: v.discount_percent ?? 0,
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
    }
    await updateVendor(v.id, payload)
    await refreshVendors()
  }

  const toggleApprove = async (vendor) => {
    await updateVendor(vendor.id, { approved: !vendor.approved })
    await refreshVendors()
  }

  const openLocationModal = (vendor) => {
    setSearchQ('')
    setResults([])
    setModal({ open: true, vendor })
  }

  const closeModal = () => setModal({ open: false, vendor: null })

  const searchGeocode = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=5`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      setResults(data)
    } catch (_) {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const applyLocation = async (lat, lon) => {
    if (!modal.vendor) return
    await updateVendor(modal.vendor.id, { latitude: Number(lat), longitude: Number(lon) })
    await refreshVendors()
    closeModal()
  }

  // Refetch from backend on filter change (but preserve new vendors)
  useEffect(() => {
    const loadFiltered = async () => {
      // Don't reload if we have a newly created vendor - preserve it
      if (hasNewVendor) {
        console.log('Skipping reload to preserve newly created vendor')
        return
      }

      // Don't reload if we already have vendors and no filters are active
      if (vendors.length > 0 && !approved && !searchQ.trim()) {
        console.log('Skipping reload - already have vendors and no active filters')
        return
      }

      const params = {}
      if (approved) params.approved = approved
      if (searchQ.trim()) params.q = searchQ.trim()
      try {
        const data = await fetchVendors(params)
        setVendors(data)
      } catch (error) {
        console.error('Error fetching filtered vendors:', error)
        // Keep existing vendors if filter fails
      }
    }
    loadFiltered()
  }, [approved, searchQ, hasNewVendor, vendors.length])

  const exportCSV = () => {
    const headers = ['id','name','approved','commission_rate','rating','discount_percent','latitude','longitude']
    const lines = [headers.join(',')]
    vendors.forEach(v => {
      lines.push([
        v.id,
        (v.name||'').replaceAll(',',' '),
        v.approved ? 'yes' : 'no',
        v.commission_rate,
        v.rating||0,
        v.discount_percent||0,
        v.latitude||'',
        v.longitude||'',
      ].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendors_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin • Vendors</h1>
      {hasNewVendor && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Vendor Created Successfully!</h3>
              <div className="mt-1 text-sm text-green-700">
                <p>Your new vendor has been added to the list. Use the "Refresh" button to update from the server if needed.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Vendor Management</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Create and manage vendor accounts. Click "Create Vendor" to add new vendors, or use the "Refresh" button to update the list.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Link to="/admin/vendors/new" className="inline-block bg-brand-blue text-white px-3 py-2 rounded text-sm">Create Vendor</Link>
        <label className="text-sm">Approved
          <select className="border ml-2 p-1 rounded" value={approved} onChange={e=>setApproved(e.target.value)}>
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <input className="border p-2 rounded" placeholder="Search name or location" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
        <button className="btn-primary text-sm" onClick={exportCSV}>Export CSV</button>
        <button
          className="text-sm bg-gray-500 text-white px-3 py-2 rounded"
          onClick={refreshVendors}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
      <div className="mb-2 text-sm text-gray-600">
        {loading ? 'Loading vendors...' :
         vendors.length > 0 ? `Showing ${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}` :
         'No vendors found'
        }
        {hasNewVendor && ' (includes newly created vendor)'}
        {vendors.length > 0 && vendors.length <= 3 && ' (Demo data - create vendors to see real data)'}
      </div>
      {vendors.length === 0 && !loading && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first vendor.</p>
          <div className="mt-6">
            <Link
              to="/admin/vendors/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Vendor
            </Link>
          </div>
        </div>
      )}
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Approved</th>
            <th className="p-2 border">Commission</th>
            <th className="p-2 border">Rating</th>
            <th className="p-2 border">Discount %</th>
            <th className="p-2 border">Lat</th>
            <th className="p-2 border">Lng</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map(v => (
            <tr key={v.id}>
              <td className="p-2 border">{v.id}</td>
              <td className="p-2 border">{v.name}</td>
              <td className="p-2 border">{v.approved ? 'Yes' : 'No'}</td>
              <td className="p-2 border">{v.commission_rate}%</td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-20" value={v.rating ?? ''} onChange={e=>onFieldChange(v.id,'rating', e.target.value)} />
                <div className="text-xxs text-gray-500">{v.rating_count||0} ratings</div>
              </td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-24" value={v.discount_percent ?? ''} onChange={e=>onFieldChange(v.id,'discount_percent', e.target.value)} />
              </td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-28" value={v.latitude ?? ''} onChange={e=>onFieldChange(v.id,'latitude', e.target.value)} />
              </td>
              <td className="p-2 border">
                <input className="border p-1 rounded w-28" value={v.longitude ?? ''} onChange={e=>onFieldChange(v.id,'longitude', e.target.value)} />
              </td>
              <td className="p-2 border">
                <button className="text-sm bg-brand-blue text-white px-2 py-1 rounded mr-2" onClick={() => toggleApprove(v)}>
                  {v.approved ? 'Revoke' : 'Approve'}
                </button>
                <button className="text-sm bg-brand-green text-white px-2 py-1 rounded mr-2" onClick={() => saveRow(v)}>Save</button>
                <button className="text-sm border px-2 py-1 rounded" onClick={() => openLocationModal(v)}>Set Location</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Location modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Set Vendor Location • {modal.vendor?.name}</div>
              <button onClick={closeModal} className="text-gray-600">✕</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input className="border p-2 rounded flex-1" placeholder="Search address (city, area)" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              <button className="bg-brand-blue text-white px-3 py-2 rounded" onClick={searchGeocode} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
            </div>
            <div className="max-h-64 overflow-auto border rounded">
              {results.length === 0 && <div className="p-3 text-sm text-gray-500">No results yet. Try a search.</div>}
              {results.map(r => (
                <div key={`${r.lat}-${r.lon}-${r.place_id}`} className="p-3 border-b text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.display_name}</div>
                    <div className="text-xs text-gray-600">Lat: {r.lat} • Lng: {r.lon} • <a className="underline" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=16/${r.lat}/${r.lon}`} target="_blank" rel="noreferrer">View on map</a></div>
                  </div>
                  <button className="bg-brand-green text-white px-2 py-1 rounded" onClick={() => applyLocation(r.lat, r.lon)}>Use</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button className="border px-3 py-2 rounded" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
