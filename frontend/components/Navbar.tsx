'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Re-check auth state when pathname changes
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    setIsAuthenticated(!!token)
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    router.push('/')
  }

  if (!mounted) {
    return null
  }

  // Don't show navbar on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Platform
          </Link>

          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="text-gray-700 hover:text-gray-900 transition"
                >
                  Dashboard
                </Link>
                  {user?.role === 'admin' && (
                  <Link
                    href="/reports"
                    className="text-gray-700 hover:text-gray-900 transition"
                  >
                    Reports
                  </Link>
                )}
                <Link
                  href="/map"
                  className="text-gray-700 hover:text-gray-900 transition"
                >
                  Map
                </Link>
                <span className="text-gray-600">Hello, {user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
