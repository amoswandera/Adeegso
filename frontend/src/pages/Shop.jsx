import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchProducts, createOrder } from '../lib/api'
import { useCart } from '../cart/CartContext'

export default function Shop() {
  const { vendorId } = useParams()
  const [products, setProducts] = useState([])
  const { items, addItem, removeItem, clear } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts().then(ps => setProducts(ps.filter(p => String(p.vendor?.id||p.vendor) === vendorId)))
  }, [vendorId])

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
  const deliveryFee = 1.5 // MVP flat fee; replace with distance-based later
  const total = subtotal + (items.length ? deliveryFee : 0)

  const checkout = async () => {
    if (!items.length) return
    const payload = {
      vendor: Number(vendorId),
      items: items.map(i => ({ product: i.product.id, quantity: i.quantity })),
      delivery_fee: deliveryFee,
    }
    try {
      const order = await createOrder(payload)
      alert(`Order #${order.id} created`) // MVP feedback
      clear()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      alert('Failed to create order')
    }
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Shop</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="border rounded p-4">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-600">${p.price}</div>
            <button className="mt-2 text-sm bg-brand-blue text-white px-2 py-1 rounded" onClick={() => addItem(p, 1)}>Add to cart</button>
          </div>
        ))}
      </div>

      {/* Bottom-sheet cart */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t shadow-lg">
          <div className="container mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold mb-2">Your cart</div>
                <div className="max-h-36 overflow-auto space-y-2">
                  {items.map(i => (
                    <div key={i.product.id} className="flex items-center justify-between text-sm">
                      <span>{i.product.name} × {i.quantity}</span>
                      <div className="flex items-center gap-3">
                        <span>${(Number(i.product.price) * i.quantity).toFixed(2)}</span>
                        <button className="text-red-600" onClick={() => removeItem(i.product.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-80">
                <div className="border rounded p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Delivery fee</span><span>${deliveryFee.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-lg pt-1 border-t mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 bg-brand-blue text-white px-3 py-2 rounded" onClick={checkout}>Checkout</button>
                    <button className="px-3 py-2 rounded border" onClick={clear}>Clear</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


