import React, { useEffect, useState, useMemo } from 'react'
import { fetchProducts } from '../lib/api'
import { Link } from 'react-router-dom'

const ProductCard = ({ product }) => {
  return (
    <Link
      to={`/shop/${product.vendor?.id || product.vendor}`}
      className="block bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center text-gray-400 ${product.image ? 'hidden' : ''}`}
        >
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
        <p className="text-brand-blue font-semibold text-sm mt-1">${product.price}</p>
        <p className="text-xs text-gray-500 mt-1">
          {product.vendor?.name || 'Restaurant'}
        </p>
      </div>
    </Link>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchProducts()
      .then(setProducts)
      .catch((error) => {
        console.error('Error fetching products:', error)
        // Fallback to mock data if API fails
        setProducts([
          {
            id: 1,
            name: 'Grilled Chicken Burger',
            description: 'Juicy grilled chicken breast with fresh lettuce, tomato, and our special sauce on a toasted bun.',
            category: 'Main Course',
            price: 12.99,
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 1, name: 'Burger Palace' }
          },
          {
            id: 2,
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with parmesan cheese, croutons, and our homemade Caesar dressing.',
            category: 'Appetizers',
            price: 8.99,
            image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 2, name: 'Green Garden' }
          },
          {
            id: 3,
            name: 'Chocolate Lava Cake',
            description: 'Warm chocolate cake with a molten center, served with vanilla ice cream.',
            category: 'Desserts',
            price: 6.99,
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 3, name: 'Sweet Dreams' }
          },
          {
            id: 4,
            name: 'Margherita Pizza',
            description: 'Classic pizza with fresh mozzarella, tomato sauce, and basil leaves.',
            category: 'Main Course',
            price: 14.99,
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 1, name: 'Burger Palace' }
          },
          {
            id: 5,
            name: 'Fish and Chips',
            description: 'Crispy battered fish served with golden fries and tartar sauce.',
            category: 'Main Course',
            price: 11.99,
            image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 4, name: 'Ocean Fresh' }
          },
          {
            id: 6,
            name: 'Chicken Wings',
            description: 'Spicy buffalo wings served with celery sticks and blue cheese dip.',
            category: 'Appetizers',
            price: 9.99,
            image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop&crop=center',
            vendor: { id: 1, name: 'Burger Palace' }
          }
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse all available products from our vendors
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No products are currently available.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
