'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AfricaMap from '@/components/AfricaMap'
import { useAuth } from '@/contexts/AuthContext'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

export default function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation('landing')
  const [mounted, setMounted] = useState(false)

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        setContactStatus('success')
        setContactForm({ name: '', email: '', subject: '', message: '' })
      } else {
        setContactStatus('error')
      }
    } catch {
      setContactStatus('error')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white overflow-x-hidden" style={serif}>

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

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="pt-20 pb-16 lg:pt-28 lg:pb-24">

          {/* Eyebrow label */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
              {t('hero.eyebrow')}
            </span>
          </div>

          {/* Headline with Africa Map */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:items-start mb-10">
            <div className="flex-1">
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] mb-2 max-w-4xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
                {t('hero.headline.prefix')}{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {t('hero.headline.highlight')}
                </span>{' '}
                {t('hero.headline.suffix')}
              </h1>
              <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-6 leading-relaxed" style={sans}>
                {t('hero.description')}
              </p>
            </div>

            {/* Africa Map - Right side of headline */}
            <div className="hidden lg:block lg:w-[400px]">
              <AfricaMap className="w-full h-auto opacity-80 hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-24">
            {!mounted ? (
              <>
                <div className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 cursor-not-allowed">
                  {t('cta.loading')}
                </div>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#0a0f0d',
                    ...sans,
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  {t('cta.goToMap')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ ...sans, letterSpacing: '0.02em' }}
                >
                  {t('cta.dashboard')}
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
                    ...sans,
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  {t('cta.exploreTheMap')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ ...sans, letterSpacing: '0.02em' }}
                >
                  {t('cta.signIn')}
                </Link>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-10 mb-24 pt-6 border-t border-white/5">
            {[
              { value: '54', label: t('stats.africanCountries') },
              { value: '2000–2023', label: t('stats.dataRange') },
              { value: '5+', label: t('stats.dataSources') },
              { value: '∞', label: t('stats.communityDrivenQuality') },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white" style={serif}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest" style={sans}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ============================================================ */}
          {/* LDN Platform Section */}
          {/* ============================================================ */}
          <div className="mt-16 mb-16">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 rounded-full bg-green-400" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                  {t('ldnPlatform.heading')}
                </h2>
              </div>
              <p className="text-lg text-green-400/90 font-medium" style={serif}>
                {t('ldnPlatform.subtitle')}
              </p>
              <p className="text-sm text-gray-400 mt-3 leading-relaxed max-w-3xl" style={sans}>
                {t('ldnPlatform.description')}
              </p>
              <p className="text-sm text-gray-300 mt-2 font-medium" style={{ ...sans, letterSpacing: '0.02em' }}>
                {t('ldnPlatform.tagline')}
              </p>
            </div>

            {/* Image placeholder + overview side by side */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                  {t('ldnPlatform.overview.title')}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-5" style={sans}>
                  {t('ldnPlatform.overview.paragraph1')}
                </p>
                <p className="text-sm text-gray-400 leading-relaxed mb-5" style={sans}>
                  {t('ldnPlatform.overview.paragraph2')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>
                      {t('ldnPlatform.overview.item1')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>
                      {t('ldnPlatform.overview.item2')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{t('ldnPlatform.overview.item3')}</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-400 leading-relaxed mt-5" style={sans}>
                  {t('ldnPlatform.overview.closingParagraph')}
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOX 1 — Land Degradation in Africa: Key Facts (FIXED LAYOUT) */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white" style={serif}>
                    {t('keyFacts.heading')}
                  </h3>
                </div>

                {/* Facts grid */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-red-400" style={serif}>65%</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pt-2" style={sans}>
                      {t('keyFacts.fact1')}
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-400" style={serif}>3M ha</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pt-2" style={sans}>
                      {t('keyFacts.fact2')}
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-red-400" style={serif}>40%+</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pt-2" style={sans}>
                      {t('keyFacts.fact3')}
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-400" style={serif}>$B</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pt-2" style={sans}>
                      {t('keyFacts.fact4')}
                    </p>
                  </div>
                </div>

                {/* Closing text */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className="text-sm text-gray-300 leading-relaxed" style={sans}>
                    {t('keyFacts.closingText')}
                  </p>
                </div>

                {/* Image placeholder UNDER the text */}
                <div className="mt-6 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* The Role of the LDN Platform in Africa */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('roleOfLDN.heading')}
              </h2>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-4xl" style={sans}>
              {t('roleOfLDN.description')}
            </p>

            <p className="text-sm text-white font-medium mb-3" style={sans}>
              {t('roleOfLDN.contributesTo')}
            </p>
            <ul className="space-y-3 mb-6 max-w-4xl">
              {[
                t('roleOfLDN.item1'),
                t('roleOfLDN.item2'),
                t('roleOfLDN.item3'),
                t('roleOfLDN.item4'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-4xl" style={sans}>
              {t('roleOfLDN.closingParagraph')}
            </p>

            {/* Two image placeholders */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image1')}</p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image2')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOX 2 — Key Assets of the Monitoring System */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white" style={serif}>
                    {t('keyAssets.heading')}
                  </h3>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-6" style={sans}>
                  {t('keyAssets.description')}
                </p>

                <ul className="space-y-4 mb-6">
                  {[
                    t('keyAssets.item1'),
                    t('keyAssets.item2'),
                    t('keyAssets.item3'),
                    t('keyAssets.item4'),
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                      <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-green-400/90 font-medium mb-6" style={sans}>
                  {t('keyAssets.closingText')}
                </p>

                {/* Image placeholder UNDER the text */}
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Who is this platform for? */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('audience.heading')}
              </h2>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-4xl" style={sans}>
              {t('audience.description')}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-4xl">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  ),
                  label: t('audience.policymakers.label'),
                  desc: t('audience.policymakers.desc'),
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  label: t('audience.researchers.label'),
                  desc: t('audience.researchers.desc'),
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ),
                  label: t('audience.ngos.label'),
                  desc: t('audience.ngos.desc'),
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  ),
                  label: t('audience.internationalOrgs.label'),
                  desc: t('audience.internationalOrgs.desc'),
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white" style={sans}>{item.label}</p>
                    <p className="text-xs text-gray-500 mt-1" style={sans}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/* Main features of the platform */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('mainFeatures.heading')}
              </h2>
            </div>

            <div className="space-y-5 max-w-4xl">
              {[
                {
                  title: t('mainFeatures.continentalData.title'),
                  desc: t('mainFeatures.continentalData.desc'),
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  title: t('mainFeatures.geoportal.title'),
                  desc: t('mainFeatures.geoportal.desc'),
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  ),
                },
                {
                  title: t('mainFeatures.dashboards.title'),
                  desc: t('mainFeatures.dashboards.desc'),
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                },
                {
                  title: t('mainFeatures.resources.title'),
                  desc: t('mainFeatures.resources.desc'),
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
                {
                  title: t('mainFeatures.successStories.title'),
                  desc: t('mainFeatures.successStories.desc'),
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ),
                },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white" style={sans}>{feature.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed" style={sans}>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/* Start Exploring — Image Zones with Links */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('startExploring.heading')}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  label: t('startExploring.exploreData'),
                  href: '/dashboard',
                  gradient: 'from-green-900/40 to-emerald-900/20',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  label: t('startExploring.geoportal'),
                  href: '/map',
                  gradient: 'from-teal-900/40 to-green-900/20',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  ),
                },
                {
                  label: t('startExploring.ldnDashboard'),
                  href: '/dashboard',
                  gradient: 'from-emerald-900/40 to-green-900/20',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                },
                {
                  label: t('startExploring.successStories'),
                  href: '/success-stories',
                  gradient: 'from-amber-900/30 to-yellow-900/20',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ),
                },
                {
                  label: t('startExploring.browseResources'),
                  href: '/api-docs',
                  gradient: 'from-purple-900/30 to-indigo-900/20',
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  ),
                },
              ].map((zone, i) => (
                <Link
                  key={i}
                  href={zone.href}
                  className={`group relative rounded-xl border border-white/10 bg-gradient-to-br ${zone.gradient} overflow-hidden hover:border-green-400/30 transition-all duration-300`}
                >
                  <div className="aspect-[4/3] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center text-green-400 mb-4 group-hover:bg-green-500/10 transition-colors duration-300">
                      {zone.icon}
                    </div>
                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors duration-300" style={sans}>
                      {zone.label}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 group-hover:text-green-400 transition-colors duration-300" style={sans}>
                      <span>{t('startExploring.explore')}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/* Data Sources */}
          {/* ============================================================ */}
          <div className="mb-20 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/5 bg-white/[0.02]">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <p className="text-xs text-gray-500" style={sans}>
                {t('dataSources.text')}
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Events and News */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('events.heading')}
              </h2>
            </div>

            {/* Events already held */}
            <div className="mb-10">
              <h3 className="text-sm font-medium text-green-400/90 uppercase tracking-widest mb-5" style={sans}>
                {t('events.eventsHeld')}
              </h3>
              <div className="space-y-4">
                {[
                  {
                    date: t('events.held1.date'),
                    title: t('events.held1.title'),
                    url: 'https://www.oss-online.org/en/webinaire-ldn_en',
                  },
                  {
                    date: t('events.held2.date'),
                    title: t('events.held2.title'),
                    url: 'https://www.oss-online.org/en/webinar-ldn',
                  },
                  {
                    date: t('events.held3.date'),
                    title: t('events.held3.title'),
                    url: 'https://www.oss-online.org/en/OSS-GGWI',
                  },
                  {
                    date: t('events.held4.date'),
                    title: t('events.held4.title'),
                    url: 'https://www.oss-online.org/fr/OSSUMBRELLA',
                  },
                ].map((event, i) => (
                  <a
                    key={i}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center mt-0.5">
                        <svg className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1" style={sans}>{event.date}</p>
                        <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors duration-200" style={sans}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600 group-hover:text-green-400 transition-colors duration-200" style={sans}>
                          <span>{t('events.viewDetails')}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Events in progress */}
            <div>
              <h3 className="text-sm font-medium text-green-400/90 uppercase tracking-widest mb-5 flex items-center gap-2" style={sans}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                {t('events.upcomingEvents')}
              </h3>
              <div className="space-y-4">
                {[
                  {
                    date: t('events.upcoming1.date'),
                    title: t('events.upcoming1.title'),
                  },
                  {
                    date: t('events.upcoming2.date'),
                    title: t('events.upcoming2.title'),
                  },
                ].map((event, i) => (
                  <div
                    key={i}
                    className="block p-5 rounded-xl border border-green-400/20 bg-green-400/[0.03]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mt-0.5">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-400/80 mb-1 font-medium" style={sans}>{event.date}</p>
                        <p className="text-sm text-gray-200 leading-relaxed" style={sans}>
                          {event.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BOX 4 — The Sahara and Sahel Observatory (OSS) */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white" style={serif}>
                    {t('oss.heading')}
                  </h3>
                </div>
                <p className="text-sm text-green-400/80 font-medium mb-6" style={sans}>
                  {t('oss.subtitle')}
                </p>

                {/* Intro */}
                <p className="text-sm text-gray-400 leading-relaxed mb-6" style={sans}>
                  {t('oss.intro')}
                </p>

                {/* Designated as Regional Support Hub */}
                <div className="mb-8">
                  <p className="text-sm text-gray-300 leading-relaxed mb-3" style={sans}>
                    {t('oss.designatedHub.text')}
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                      <span className="text-green-400 mt-0.5">&#8226;</span>
                      <span>{t('oss.designatedHub.item1')}</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                      <span className="text-green-400 mt-0.5">&#8226;</span>
                      <span>{t('oss.designatedHub.item2')}</span>
                    </li>
                  </ul>
                </div>

                {/* Technical Engine */}
                <div className="mb-8">
                  <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2" style={serif}>
                    <div className="w-1 h-5 rounded-full bg-green-400" />
                    {t('oss.technicalEngine.heading')}
                  </h4>
                  <p className="text-sm text-gray-400 leading-relaxed mb-3" style={sans}>
                    {t('oss.technicalEngine.description')}
                  </p>
                  <ul className="space-y-2 ml-4">
                    {[
                      t('oss.technicalEngine.item1'),
                      t('oss.technicalEngine.item2'),
                      t('oss.technicalEngine.item3'),
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                        <span className="text-green-400 mt-0.5">&#8226;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Capacity Building */}
                <div className="mb-8">
                  <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2" style={serif}>
                    <div className="w-1 h-5 rounded-full bg-green-400" />
                    {t('oss.capacityBuilding.heading')}
                  </h4>
                  <p className="text-sm text-gray-400 leading-relaxed mb-3" style={sans}>
                    {t('oss.capacityBuilding.description')}
                  </p>
                  <ul className="space-y-2 ml-4">
                    {[
                      t('oss.capacityBuilding.item1'),
                      t('oss.capacityBuilding.item2'),
                      t('oss.capacityBuilding.item3'),
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                        <span className="text-green-400 mt-0.5">&#8226;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Supporting Regional Initiatives */}
                <div className="pt-6 border-t border-white/5">
                  <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2" style={serif}>
                    <div className="w-1 h-5 rounded-full bg-green-400" />
                    {t('oss.regionalInitiatives.heading')}
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { label: t('oss.regionalInitiatives.item1'), icon: '🌿' },
                      { label: t('oss.regionalInitiatives.item2'), icon: '🌱' },
                      { label: t('oss.regionalInitiatives.item3'), icon: '💧' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/5">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm text-gray-300" style={sans}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* Contact Us Form */}
          {/* ============================================================ */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('contact.heading')}
              </h2>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-2xl" style={sans}>
              {t('contact.description')}
            </p>

            <div className="max-w-2xl">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  {/* Name */}
                  <div>
                    <label htmlFor="contact-name" className="block text-xs text-gray-500 uppercase tracking-widest mb-2" style={sans}>
                      {t('contact.name')}
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('contact.namePlaceholder')}
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-colors"
                      style={sans}
                    />
                  </div>
                  {/* Email */}
                  <div>
                    <label htmlFor="contact-email" className="block text-xs text-gray-500 uppercase tracking-widest mb-2" style={sans}>
                      {t('contact.email')}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('contact.emailPlaceholder')}
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-colors"
                      style={sans}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="contact-subject" className="block text-xs text-gray-500 uppercase tracking-widest mb-2" style={sans}>
                    {t('contact.subject')}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={e => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('contact.subjectPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-colors"
                    style={sans}
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-xs text-gray-500 uppercase tracking-widest mb-2" style={sans}>
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={contactForm.message}
                    onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={t('contact.messagePlaceholder')}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-colors resize-none"
                    style={sans}
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={contactStatus === 'sending'}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: contactStatus === 'success'
                        ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                        : 'linear-gradient(135deg, #16a34a, #22c55e)',
                      color: '#0a0f0d',
                      ...sans,
                      letterSpacing: '0.02em',
                      boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                    }}
                  >
                    {contactStatus === 'sending' ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('contact.sending')}
                      </>
                    ) : contactStatus === 'success' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('contact.sent')}
                      </>
                    ) : (
                      <>
                        {t('contact.send')}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                  {contactStatus === 'error' && (
                    <p className="text-sm text-red-400" style={sans}>{t('contact.error')}</p>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

    </div>
  )
}
