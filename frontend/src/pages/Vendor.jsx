import React, { useState, useEffect } from 'react'
import { createVendorProduct, fetchVendorProducts, approveVendorProduct, rejectVendorProduct } from '../lib/api'

export default function Vendor() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('')
  const [message, setMessage] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('products')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await fetchVendorProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      setMessage('Failed to load products')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      setLoading(true)
      await createVendorProduct({
        name,
        price: parseFloat(price),
        description,
        category,
        stock: parseInt(stock)
      })
      setMessage('Product created successfully')
      setName('')
      setPrice('')
      setDescription('')
      setCategory('')
      setStock('')
      setShowCreateForm(false)
      loadProducts() // Reload products
    } catch (error) {
      setMessage('Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (productId) => {
    try {
      setActionLoading(productId)
      await approveVendorProduct(productId)
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
      await rejectVendorProduct(productId, rejectReason)
      setMessage('Product rejected successfully')
      setRejectReason('')
      loadProducts() // Reload products
    } catch (error) {
      setMessage('Failed to reject product')
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
      return <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Pending Approval</span>
    }
  }

  const pendingProducts = products.filter(p => p.approval_status === 'pending')
  const approvedProducts = products.filter(p => p.approval_status === 'approved')
  const rejectedProducts = products.filter(p => p.approval_status === 'rejected')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-brand-green text-white px-6 py-2 rounded-lg hover:bg-brand-green/90 transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">{approvedProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-semibold text-gray-900">{rejectedProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approval ({pendingProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved ({approvedProducts.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Create Product Form */}
          {showCreateForm && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Create New Product</h3>
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Product name"
                  required
                />
                <input
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Price"
                  type="number"
                  step="0.01"
                  required
                />
                <textarea
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent md:col-span-2"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                <input
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Category"
                />
                <input
                  className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="Stock quantity"
                  type="number"
                  required
                />
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-brand-green text-white px-6 py-3 rounded-lg hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Success/Error Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.includes('Failed') || message.includes('Please') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              {message}
            </div>
          )}

          {/* Products List */}
          <div className="space-y-4">
            {(activeTab === 'products' ? products :
              activeTab === 'pending' ? pendingProducts :
              activeTab === 'approved' ? approvedProducts : []).map(product => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      {getStatusBadge(product)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
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
                        <span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <p className="text-sm text-gray-700 mb-4">{product.description}</p>
                )}

                {/* Approval Actions */}
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

          {/* Empty States */}
          {(activeTab === 'products' && products.length === 0) ||
           (activeTab === 'pending' && pendingProducts.length === 0) ||
           (activeTab === 'approved' && approvedProducts.length === 0) ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'products' ? 'No products yet' :
                 activeTab === 'pending' ? 'No pending products' :
                 'No approved products'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'products' ? 'Create your first product to get started.' :
                 activeTab === 'pending' ? 'All your products have been reviewed.' :
                 'Products will appear here once approved.'}
              </p>
              {activeTab === 'products' && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-green/90 transition-colors"
                  >
                    + Add Your First Product
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}


