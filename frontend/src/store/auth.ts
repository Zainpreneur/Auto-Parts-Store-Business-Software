import { create } from 'zustand'
import type { AuthUser } from '../types'

const STORAGE_KEY = 'autoparts.auth'

interface Persisted {
  token: string
  user: AuthUser
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const persisted = loadPersisted()

export const useAuthStore = create<AuthState>((set) => ({
  token: persisted?.token ?? null,
  user: persisted?.user ?? null,
  login: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null, user: null })
  },
}))
