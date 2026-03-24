'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setUserName(user.name || 'User')
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white overflow-x-hidden" style={{ fontFamily: "'Georgia', serif" }}>

      {/* Ambient background grid */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          width: '100%',
          height: '100%',
        }} />
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '10%', left: '5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '30%',
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#22c55e" strokeWidth="1.5" />
            <path d="M8 16 Q12 10 16 16 Q20 22 24 16" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="2" fill="#22c55e" />
          </svg>
          <span style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.04em' }} className="text-white font-semibold text-lg tracking-wide">
            AfriGeo<span className="text-green-400">Data</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-400" style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}>
                Hi, {userName}
              </span>
              <Link
                href="/map"
                className="text-sm px-4 py-2 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
              >
                Go to Map
              </Link>
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
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors duration-200" style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}>
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
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="pt-20 pb-16 lg:pt-28 lg:pb-24">

          {/* Eyebrow label */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={{ fontFamily: 'system-ui, sans-serif' }}>
              54+ African Countries · Live Data
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] mb-8 max-w-4xl" style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.02em' }}>
            The{' '}
            <span style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              geospatial lens
            </span>{' '}
            on Africa's development.
          </h1>

          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Explore water access, income inequality, and development indicators across the continent — with interactive maps, 20-year trend data, and country-level analytics built for researchers and policymakers.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-24">
            {isAuthenticated ? (
              <>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#0a0f0d',
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  Explore the Map
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em' }}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#0a0f0d',
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  Explore the Map
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em' }}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-10 mb-24 pt-6 border-t border-white/5">
            {[
              { value: '54+', label: 'Countries covered' },
              { value: '2000–2023', label: 'Data range' },
              { value: '3', label: 'Core dashboards' },
              { value: '5+', label: 'Map layer types' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest" style={{ fontFamily: 'system-ui, sans-serif' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <h2 className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Platform capabilities
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Interactive Map */}
            <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-green-500/20 hover:bg-white/[0.04] transition-all duration-300 lg:col-span-1">
              <div className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>Interactive Map</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Explore geospatial layers for all 54+ countries. Compare views side-by-side, draw custom polygons, switch between satellite, terrain, and dark styles.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Polygon draw', 'Side-by-side', 'Export'].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-green-500/20 text-green-400/60" style={{ fontFamily: 'system-ui, sans-serif' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* WaterWatch */}
            <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-green-500/20 hover:bg-white/[0.04] transition-all duration-300">
              <div className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h1m20 0h1M4.22 19.778l.707-.707M18.364 5.636l.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>WaterWatch Africa</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Track water access progress from 2000–2023. See country rankings, urban vs rural gaps, and multi-decade trend charts across the continent.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['2000–2023', 'Urban/Rural', 'Rankings'].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-green-500/20 text-green-400/60" style={{ fontFamily: 'system-ui, sans-serif' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* GiniWatch */}
            <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all duration-300">
              <div className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>GiniWatch Africa</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Track income inequality (Gini index) from 2000–2023. Compare equality levels, see which countries improved or worsened, and explore statistical trends.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['2000–2023', 'Gini Index', 'Trends'].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-purple-500/20 text-purple-400/60" style={{ fontFamily: 'system-ui, sans-serif' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Statistical Analysis */}
            <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-green-500/20 hover:bg-white/[0.04] transition-all duration-300">
              <div className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>Statistical Analysis</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Draw any region on the map and instantly get detailed statistics, data breakdowns, and measurements for that custom area.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Custom area', 'Instant stats', 'Breakdowns'].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-green-500/20 text-green-400/60" style={{ fontFamily: 'system-ui, sans-serif' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Data Reporting */}
            <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="mb-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Georgia', serif" }}>Data Reporting</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Flag incorrect data directly on the map, add contextual comments, and track when issues are resolved — keeping the dataset trustworthy.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Flag issues', 'Comments', 'Track fixes'].map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-purple-500/20 text-purple-400/60" style={{ fontFamily: 'system-ui, sans-serif' }}>{tag}</span>
                ))}
              </div>
            </div>

          </div>

          {/* Audience callout */}
          <div className="mt-16 rounded-xl border border-white/5 bg-white/[0.02] p-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-300 leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <span className="text-white font-medium">Built for researchers, policymakers, and development organizations</span> — working at the intersection of data and impact across the African continent.
              </p>
            </div>
            <div className="md:ml-auto flex-shrink-0">
              {isAuthenticated ? (
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em' }}
                >
                  Go to Dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em' }}
                >
                  Request access
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" stroke="#22c55e" strokeWidth="1.5" opacity="0.5"/>
              <path d="M8 16 Q12 10 16 16 Q20 22 24 16" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
            </svg>
            <span className="text-xs text-gray-600" style={{ fontFamily: 'system-ui, sans-serif' }}>
              © 2025 AfriGeoData. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6">
            {['About', 'Documentation', 'Contact'].map(link => (
              <Link key={link} href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors duration-200" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {link}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}