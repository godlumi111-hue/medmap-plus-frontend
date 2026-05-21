'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface CartItem {
  medicineId: number
  nom: string
  pharmacyId: number
  pharmacyNom: string
  prixBase: number
  quantite: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantite'>, quantite?: number) => void
  removeItem: (medicineId: number) => void
  updateQty: (medicineId: number, quantite: number) => void
  clearCart: () => void
  itemCount: number
  totalBase: number
  commission: number
  fraisLivraison: number
  totalAPayer: number
  pharmacyId: number | null
  pharmacyNom: string
}

const CartContext = createContext<CartContextType | null>(null)
const STORAGE_KEY      = 'medmap_cart'
const COMMISSION_RATE  = 0.15
const FRAIS_LIVRAISON  = 700

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'quantite'>, quantite = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.medicineId === item.medicineId)
      if (existing) {
        return prev.map(i => i.medicineId === item.medicineId
          ? { ...i, quantite: i.quantite + quantite }
          : i
        )
      }
      return [...prev, { ...item, quantite }]
    })
  }, [])

  const removeItem = useCallback((medicineId: number) => {
    setItems(prev => prev.filter(i => i.medicineId !== medicineId))
  }, [])

  const updateQty = useCallback((medicineId: number, quantite: number) => {
    if (quantite <= 0) {
      setItems(prev => prev.filter(i => i.medicineId !== medicineId))
    } else {
      setItems(prev => prev.map(i => i.medicineId === medicineId ? { ...i, quantite } : i))
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const totalBase     = items.reduce((s, i) => s + i.prixBase * i.quantite, 0)
  const commission    = Math.round(totalBase * COMMISSION_RATE)
  const fraisLivraison = items.length > 0 ? FRAIS_LIVRAISON : 0
  const totalAPayer   = totalBase + commission + fraisLivraison
  const itemCount     = items.reduce((s, i) => s + i.quantite, 0)
  const pharmacyId    = items[0]?.pharmacyId ?? null
  const pharmacyNom   = items[0]?.pharmacyNom ?? ''

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      itemCount, totalBase, commission, fraisLivraison, totalAPayer, pharmacyId, pharmacyNom,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
