'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

/* ── Dropdown component ──────────────────────────────────────── */
function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on route change
  const pathname = usePathname()
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1"
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 rounded-lg border border-white/10 bg-[#0f1512] shadow-xl shadow-black/40 py-2 z-50">
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
      style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
    >
      {children}
    </Link>
  )
}

/* ── Navbar ───────────────────────────────────────────────────── */
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
                {/* LDN in Africa */}
                <Link
                  href="/ldn-in-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  LDN in Africa
                </Link>

                {/* Geo dropdown: Map + Geoportal */}
                <NavDropdown label="Geo">
                  <DropdownLink href="/map">{t('navbar.map')}</DropdownLink>
                  <DropdownLink href="/geoportail">Geoportal</DropdownLink>
                </NavDropdown>

                {/* Africa Watch dropdown: WaterWatch + GiniWatch */}
                <NavDropdown label="Africa Watch">
                  <DropdownLink href="/waterwatch-africa">{t('navbar.waterWatch')}</DropdownLink>
                  <DropdownLink href="/giniwatch-africa">{t('navbar.giniWatch')}</DropdownLink>
                </NavDropdown>

                {/* Stories */}
                <Link
                  href="/story"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Stories
                </Link>

                {/* Resources */}
                <Link
                  href="/resources"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Resources
                </Link>

                {/* API Docs */}
                <Link
                  href="/api-docs"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  API
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
                {/* LDN in Africa */}
                <Link
                  href="/ldn-in-africa"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  LDN in Africa
                </Link>

                {/* Geo dropdown: Map + Geoportal */}
                <NavDropdown label="Geo">
                  <DropdownLink href="/map">{t('navbar.map')}</DropdownLink>
                  <DropdownLink href="/geoportail">Geoportal</DropdownLink>
                </NavDropdown>

                {/* Africa Watch dropdown: WaterWatch + GiniWatch */}
                <NavDropdown label="Africa Watch">
                  <DropdownLink href="/waterwatch-africa">{t('navbar.waterWatch')}</DropdownLink>
                  <DropdownLink href="/giniwatch-africa">{t('navbar.giniWatch')}</DropdownLink>
                </NavDropdown>

                {/* Stories */}
                <Link
                  href="/story"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Stories
                </Link>

                {/* Resources */}
                <Link
                  href="/resources"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Resources
                </Link>

                {/* API Docs */}
                <Link
                  href="/api-docs"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  API
                </Link>

                {/* Sign In */}
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('common:signIn')}
                </Link>

                {/* Get Access */}
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
