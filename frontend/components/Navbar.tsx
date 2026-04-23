'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  const pathname = usePathname()
  const { isAuthenticated, user, logout, checkAuth } = useAuth()
  const { t } = useTranslation()

  // Verify token is still valid on mount (user might have been deleted from DB)
  useEffect(() => {
    if (!isAuthenticated) return

    const authPages = ['/login', '/signup', '/forgot-password', '/complete-profile']
    if (authPages.includes(pathname)) return

    checkAuth()
  }, [isAuthenticated, pathname, checkAuth])

  const handleLogout = () => {
    logout()
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

          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {/* WaterWatch Africa */}
                <Link
                  href="/waterwatch-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.waterWatch')}
                </Link>

                {/* GiniWatch Africa */}
                <Link
                  href="/giniwatch-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.giniWatch')}
                </Link>

                {/* Dashboard */}
                <Link
                  href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.dashboard')}
                </Link>

                {/* Reports - Admin only */}
                {user?.role === 'admin' && (
                  <Link
                    href="/reports"
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                    style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                  >
                    {t('navbar.reports')}
                  </Link>
                )}

                {/* Map */}
                <Link
                  href="/map"
                  className="text-sm px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.map')}
                </Link>

                {/* Profile */}
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.profile')}
                </Link>

                {/* User greeting */}
                <span className="text-sm text-gray-400 hidden sm:block" style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}>
                  {t('navbar.greeting')} {user?.name}
                </span>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('common:signOut')}
                </button>
                <LanguageSwitcher />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('common:signIn')}
                </Link>
                <Link
                  href="/signup"
                  className="text-sm px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('navbar.getAccess')}
                </Link>
                <LanguageSwitcher />
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
