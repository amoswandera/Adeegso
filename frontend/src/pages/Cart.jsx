import React, { useMemo, useState } from 'react'
import { useCart } from '../cart/CartContext'
import { api } from '../lib/api'

export default function Cart() {
  const { items, vendor, clear } = useCart()
  const [message, setMessage] = useState('')

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0), [items])
  const deliveryFee = 2
  const total = subtotal + deliveryFee

  const checkout = async () => {
    setMessage('')
    try {
      const payload = {
        vendor,
        items: items.map(i => ({ product: i.product.id, quantity: i.quantity })),
        delivery_fee: deliveryFee,
      }
      const { data } = await api.post('/orders/', payload)
      setMessage('Order created #' + data.id)
      clear()
    } catch (e) {
      setMessage('Checkout failed')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
      {items.length === 0 ? <p>Cart is empty</p> : (
        <div className="space-y-2">
          {items.map(i => (
            <div key={i.product.id} className="flex justify-between border p-2 rounded">
              <span>{i.product.name} × {i.quantity}</span>
              <span>${(Number(i.product.price) * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-medium">
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span><span>${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
          <button className="bg-brand-green text-white px-4 py-2 rounded" onClick={checkout}>Checkout</button>
          {message && <div className="text-sm">{message}</div>}
        </div>
      )}
    </div>
  )
}


