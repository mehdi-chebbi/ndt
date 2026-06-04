'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  phone_number?: string
  country?: string
  job_title?: string
  institution?: string
  profile_complete: boolean
  tutorial_completed: boolean
  created_at: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Load auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setIsAuthenticated(true)
        setUser(JSON.parse(userData))
      } catch (error) {
        // Invalid user data, clear everything
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUser(null)
      }
    }
    setLoading(false)
  }, [])

  // Login function
  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setIsAuthenticated(true)
    setUser(user)
  }, [])

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    router.push('/')
  }, [router])

  // Update user fields (merges partial update into current user)
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  // Check auth with backend
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      logout()
      return
    }

    try {
      const response = await fetch('/api/admin/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        logout()
      }
    } catch (error) {
      // Backend unreachable, don't logout (might be loading)
      console.error('Auth check failed:', error)
    }
  }, [logout])

  // Watch for auth changes and redirect to login if needed
  useEffect(() => {
    const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/giniwatch-africa', '/waterwatch-africa', '/geoportail', '/ldn-in-africa', '/resources', '/api-docs']
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/auth/')

    if (!isAuthenticated && !loading && !isPublicPath) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, pathname, router])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
