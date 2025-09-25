import React, { createContext, useContext, useMemo, useState } from 'react'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [vendor, setVendor] = useState(null)
  const [items, setItems] = useState([]) // {product, quantity}

  const addItem = (product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
      }
      return [...prev, { product, quantity }]
    })
    if (!vendor) setVendor(product.vendor?.id || product.vendor)
  }

  const removeItem = (productId) => setItems(prev => prev.filter(i => i.product.id !== productId))
  const clear = () => { setItems([]); setVendor(null) }

  const value = useMemo(() => ({ vendor, items, addItem, removeItem, clear }), [vendor, items])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() { return useContext(CartContext) }


