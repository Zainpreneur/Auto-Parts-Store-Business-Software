import { create } from 'zustand'
import type { Part } from '../types'

export interface CartLine {
  part: Part
  quantity: number
}

interface CartState {
  lines: CartLine[]
  customerId: number | null
  addPart: (part: Part) => void
  incrementLine: (partId: number, delta: number) => void
  removeLine: (partId: number) => void
  setCustomer: (id: number | null) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  customerId: null,
  addPart: (part) => {
    const existing = get().lines.find((l) => l.part.id === part.id)
    if (existing) {
      get().incrementLine(part.id, 1)
      return
    }
    set({ lines: [...get().lines, { part, quantity: 1 }] })
  },
  incrementLine: (partId, delta) => {
    set({
      lines: get()
        .lines.map((l) => (l.part.id === partId ? { ...l, quantity: Math.max(1, Math.min(l.part.quantity, l.quantity + delta)) } : l)),
    })
  },
  removeLine: (partId) => {
    set({ lines: get().lines.filter((l) => l.part.id !== partId) })
  },
  setCustomer: (id) => set({ customerId: id }),
  clear: () => set({ lines: [], customerId: null }),
}))
