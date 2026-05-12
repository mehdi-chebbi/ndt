'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
        <div className="absolute top-full left-0 mt-2 w-52 rounded-lg border border-white/10 bg-[#0f1512] shadow-xl shadow-black/40 py-1.5 z-50">
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2 text-sm transition-colors duration-150 ${
        active ? 'text-green-400 bg-green-500/[0.06]' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
      }`}
      style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
    >
      {children}
    </Link>
  )
}

function DropdownSeparator() {
  return <div className="my-1.5 border-t border-white/[0.06] mx-3" />
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

  // Shared nav items for both auth states
  const sharedNav = (
    <>
      {/* Home */}
      <Link
        href="/"
        className={`text-sm transition-colors duration-200 ${pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
      >
        Home
      </Link>

      {/* LDN in Africa */}
      <Link
        href="/ldn-in-africa"
        className={`text-sm transition-colors duration-200 ${pathname === '/ldn-in-africa' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
      >
        LDN in Africa
      </Link>

      {/* Geoportal dropdown */}
      <NavDropdown label="Geoportal">
        <DropdownLink href="/map" active={pathname === '/map'}>Map</DropdownLink>
        <DropdownLink href="/geoportail" active={pathname === '/geoportail'}>Outline</DropdownLink>
        <DropdownSeparator />
        <DropdownLink href="/contribution" active={pathname === '/contribution'}>Contribution</DropdownLink>
      </NavDropdown>

      {/* Dashboard dropdown */}
      <NavDropdown label="Dashboard">
        <DropdownLink href="/dashboard" active={pathname === '/dashboard'}>Dashboard</DropdownLink>
        <DropdownLink href="/ldn-dashboard" active={pathname === '/ldn-dashboard'}>LDN Dashboard</DropdownLink>
      </NavDropdown>

      {/* Stories dropdown */}
      <NavDropdown label="Stories">
        <DropdownLink href="/story" active={pathname === '/story'}>Data Story · 2024</DropdownLink>
        <DropdownLink href="/success-stories" active={pathname === '/success-stories'}>Success Stories</DropdownLink>
      </NavDropdown>

      {/* Resources */}
      <Link
        href="/resources"
        className={`text-sm transition-colors duration-200 ${pathname === '/resources' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
      >
        Resources
      </Link>
    </>
  )

  return (
    <header className="bg-[#0a0f0d] text-white sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Partner Logos */}
          <div className="flex items-center gap-5">
            <a href="https://www.oss-online.org/" target="_blank" rel="noopener noreferrer">
              <Image
                src="/images/Logo-OSS.png"
                alt="OSS Logo"
                width={240}
                height={112}
                className="h-14 w-auto opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </a>
            <a href="https://www.unccd.int/" target="_blank" rel="noopener noreferrer">
              <Image
                src="/images/Partner-Logo.png"
                alt="Partner Logo"
                width={420}
                height={160}
                className="h-20 w-auto opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </a>
          </div>

          <nav className="flex items-center gap-5">
            {isAuthenticated ? (
              <>
                {sharedNav}

                {/* Admin links - Admin only */}
                {user?.role === 'admin' && (
                  <>
                    <Link
                      href="/admin"
                      className={`text-sm transition-colors duration-200 ${pathname === '/admin' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                      style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/reports"
                      className={`text-sm transition-colors duration-200 ${pathname === '/reports' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                      style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                    >
                      Reports
                    </Link>
                    <Link
                      href="/report-view"
                      className={`text-sm transition-colors duration-200 ${pathname === '/report-view' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                      style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                    >
                      Report View
                    </Link>
                  </>
                )}

                {/* Separator */}
                <div className="w-px h-5 bg-white/10" />

                {/* User menu */}
                <NavDropdown label={user?.name || 'Account'}>
                  <DropdownLink href="/profile" active={pathname === '/profile'}>{t('navbar.profile')}</DropdownLink>
                  <DropdownSeparator />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
                    style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {t('common:signOut')}
                  </button>
                </NavDropdown>

                <LanguageSwitcher />
              </>
            ) : (
              <>
                {sharedNav}

                {/* Separator */}
                <div className="w-px h-5 bg-white/10" />

                {/* Connexion */}
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Connexion
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
