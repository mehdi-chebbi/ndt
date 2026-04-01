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

  // Verify token is still valid on mount (user might have been deleted from DB)
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const authPages = ['/login', '/signup', '/forgot-password', '/complete-profile']
    if (authPages.includes(pathname)) return

    fetch('http://localhost:3001/api/admin/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) {
        // Token invalid or user doesn't exist — force logout
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUser(null)
        router.push('/login')
      }
    }).catch(() => {
      // Backend unreachable — leave them alone, might just be loading
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Don't show navbar on auth pages or complete-profile page
  if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/complete-profile') {
    return null
  }

  // If authenticated but profile incomplete, redirect to complete profile
  // (Don't show nav on other pages)
  if (isAuthenticated && user && !user.profile_complete && pathname !== '/complete-profile') {
    return null
  }

  return (
    <header className="bg-[#0a0f0d] text-white sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" stroke="#22c55e" strokeWidth="1.5" />
              <path d="M8 16 Q12 10 16 16 Q20 22 24 16" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="16" cy="16" r="2" fill="#22c55e" />
            </svg>
            <span style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.04em' }} className="text-white font-semibold text-lg tracking-wide">
              AfriGeo<span className="text-green-400">Data</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {/* WaterWatch Africa */}
                <Link
                  href="/waterwatch-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  WaterWatch
                </Link>

                {/* GiniWatch Africa */}
                <Link
                  href="/giniwatch-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  GiniWatch
                </Link>

                {/* Dashboard */}
                <Link
                  href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Dashboard
                </Link>

                {/* Reports - Admin only */}
                {user?.role === 'admin' && (
                  <Link
                    href="/reports"
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                    style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                  >
                    Reports
                  </Link>
                )}

                {/* Map */}
                <Link
                  href="/map"
                  className="text-sm px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Map
                </Link>

                {/* Profile */}
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Profile
                </Link>

                {/* User greeting */}
                <span className="text-sm text-gray-400 hidden sm:block" style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}>
                  Hi, {user?.name}
                </span>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Get Access
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
