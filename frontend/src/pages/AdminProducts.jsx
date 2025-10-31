import React, { useState, useEffect } from 'react'
import { fetchProducts, approveProduct, rejectProduct, toggleProductActive } from '../lib/api'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await fetchProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      setMessage('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (productId) => {
    try {
      setActionLoading(productId)
      await approveProduct(productId)
      setMessage('Product approved successfully')
      loadProducts() // Reload products
    } catch (error) {
      setMessage('Failed to approve product')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (productId) => {
    if (!rejectReason.trim()) {
      setMessage('Please provide a reason for rejection')
      return
    }

    try {
      setActionLoading(productId)
      await rejectProduct(productId, rejectReason)
      setMessage('Product rejected successfully')
      setRejectReason('')
      loadProducts() // Reload products
    } catch (error) {
      setMessage('Failed to reject product')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleActive = async (productId) => {
    try {
      setActionLoading(productId)
      await toggleProductActive(productId)
      setMessage('Product active status updated successfully')
      loadProducts() // Reload products
    } catch (error) {
      setMessage('Failed to update product active status')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (product) => {
    const status = product.approval_status
    const active = product.active

    if (status === 'approved' && active) {
      return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Approved & Active</span>
    } else if (status === 'approved' && !active) {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Approved (Inactive)</span>
    } else if (status === 'rejected') {
      return <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Rejected</span>
    } else {
      return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Pending</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Product Management</h1>
        <button
          onClick={loadProducts}
          className="bg-brand-blue text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Failed') || message.includes('Please') ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
          {message}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    {getStatusBadge(product)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Price:</span> ${product.price}
                    </div>
                    <div>
                      <span className="font-medium">Stock:</span> {product.stock}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {product.category || 'Uncategorized'}
                    </div>
                    <div>
                      <span className="font-medium">Vendor:</span> {product.vendor?.name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Active/Inactive Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleToggleActive(product.id)}
                    disabled={actionLoading === product.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 ${
                      product.active
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        product.active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-gray-700 mb-4">{product.description}</p>
              )}

              {/* Approval Actions for Pending Products */}
              {product.approval_status === 'pending' && (
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(product.id)}
                    disabled={actionLoading === product.id}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading === product.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>

                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Reason for rejection (required)"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="border border-gray-300 px-3 py-2 rounded-lg text-sm flex-1 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleReject(product.id)}
                      disabled={actionLoading === product.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {actionLoading === product.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Rejection Reason Display */}
              {product.approval_status === 'rejected' && product.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Rejection reason:</strong> {product.rejection_reason}
                  </p>
                </div>
              )}

              {/* Approval Info */}
              {product.approved_by && (
                <div className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  Approved by {product.approved_by} on {product.approved_at ? new Date(product.approved_at).toLocaleDateString() : 'Unknown date'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
