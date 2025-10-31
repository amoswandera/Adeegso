import React, { useEffect, useMemo, useState } from 'react'
import { fetchVendors } from '../lib/api'
import { customerAPI } from '../services/api'
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

export default function CustomerHome() {
  const [vendors, setVendors] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState(null) // { lat, lng }
  const [filters, setFilters] = useState({ near: false, rating: false, lowFee: false })
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchVendors()
      .then(setVendors)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setProductsLoading(true)
    customerAPI.getProducts()
      .then(response => setProducts(response.data || response))
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
      .finally(() => setProductsLoading(false))
  }, [])

  const onUseLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      setCoords({ lat: latitude, lng: longitude })
      setAddress('Using current location')
    }, () => setAddress('Location permission denied'))
  }

  const toggle = (name) => setFilters(prev => ({ ...prev, [name]: !prev[name] }))

  const haversineKm = (a, b) => {
    if (!a || !b) return null
    const R = 6371
    const dLat = (b.lat - a.lat) * Math.PI/180
    const dLon = (b.lng - a.lng) * Math.PI/180
    const lat1 = a.lat * Math.PI/180
    const lat2 = b.lat * Math.PI/180
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))
    return R * c
  }

  const sortedAndFiltered = useMemo(() => {
    let list = vendors
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(v => v.name?.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q))
    }
    // Sort by real fields when available
    if (filters.rating) list = [...list].sort((a, b) => (Number(b.rating||0) - Number(a.rating||0)))
    if (filters.lowFee) list = [...list].sort((a, b) => (Number(b.discount_percent||0) - Number(a.discount_percent||0)))
    if (filters.near && coords) {
      list = [...list].sort((a, b) => {
        const da = haversineKm(coords, (a.latitude!=null&&a.longitude!=null)?{lat:Number(a.latitude),lng:Number(a.longitude)}:null) || Infinity
        const db = haversineKm(coords, (b.latitude!=null&&b.longitude!=null)?{lat:Number(b.latitude),lng:Number(b.longitude)}:null) || Infinity
        return da - db
      })
    }
    return list
  }, [vendors, filters, query, coords])

  const badge = (text, color) => (
    <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{text}</span>
  )

  return (
    <div className="space-y-6">
      {/* Address prompt */}
      <div className="bg-white border rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">What\'s your address?</div>
          <input
            value={address}
            onChange={e=>setAddress(e.target.value)}
            placeholder="Type your address"
            className="border rounded px-3 py-2 w-64"
            id="address-input"
            name="address"
          />
          <button onClick={onUseLocation} className="bg-brand-blue text-white text-sm px-3 py-2 rounded">Use current location</button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search vendors"
            className="border rounded px-3 py-2 w-64"
            id="search-input"
            name="search"
          />
        </div>
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={()=>toggle('near')} className={`px-3 py-1 rounded border ${filters.near ? 'bg-brand-blue text-white' : 'bg-white'}`}>Near me</button>
        <button onClick={()=>toggle('rating')} className={`px-3 py-1 rounded border ${filters.rating ? 'bg-brand-blue text-white' : 'bg-white'}`}>Ratings</button>
        <button onClick={()=>toggle('lowFee')} className={`px-3 py-1 rounded border ${filters.lowFee ? 'bg-brand-blue text-white' : 'bg-white'}`}>Delivery fee</button>
      </div>

      {/* Popular Products Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Popular Products</h2>
          <Link
            to="/products"
            className="text-brand-blue hover:text-brand-blue/80 text-sm font-medium"
          >
            View All Products →
          </Link>
        </div>

        {productsLoading ? (
          <div className="text-sm text-gray-500">Loading products...</div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {products.slice(0, 12).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No products available</p>
          </div>
        )}
      </div>

      {/* Vendor grid */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading vendors...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map(v => (
            <Link to={`/shop/${v.id}`} key={v.id} className="block border rounded overflow-hidden bg-white hover:shadow">
              <div className="relative h-40 bg-gray-100">
                {/* Placeholder image area */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {!!v.discount_percent && badge(`-${v.discount_percent}%`, 'bg-yellow-100 text-yellow-900')}
                  {badge(`${Number(v.rating||0).toFixed(1)} (${v.rating_count||0})`, 'bg-white text-gray-900 border')}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-gray-600">
                  {v.location || 'Burgers • Fast food'}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {coords && v.latitude!=null && v.longitude!=null && (
                    badge(`${haversineKm(coords,{lat:Number(v.latitude),lng:Number(v.longitude)}).toFixed(1)} km`, 'bg-blue-50 text-blue-700 border border-blue-200')
                  )}
                  {badge('Fast delivery', 'bg-emerald-100 text-emerald-800')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
