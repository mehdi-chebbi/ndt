'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

/* ─── tiny hook: fires once when element enters viewport ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ─── stagger wrapper ─── */
function Stagger({ children, className = '', delay = 0, style }: {
  children: React.ReactNode
  className?: string
  delay?: number
  style?: React.CSSProperties
}) {
  const { ref, visible } = useInView(0.05)
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

const TOPIC_KEYS = ['topicLandRestoration', 'topicSustainableAgriculture', 'topicCommunityInitiatives', 'topicPolicySolutions'] as const

const TOPIC_ICONS = [
  <svg key="land" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>,
  <svg key="agri" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="community" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="policy" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
]

export default function SuccessStoriesPage() {
  const { t } = useTranslation('success-stories')

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white overflow-x-hidden" style={serif}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          width: '100%',
          height: '100%',
        }} />
        <div style={{
          position: 'absolute', top: '10%', left: '5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '8%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">

        {/* ═══════ HERO ═══════ */}
        <section className="pt-24 pb-16 lg:pt-32 lg:pb-24">
          {/* Eyebrow */}
          <Stagger delay={0}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
                {t('eyebrow')}
              </span>
            </div>
          </Stagger>

          {/* Main heading */}
          <Stagger delay={70}>
            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] mb-6 max-w-4xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              {t('heroTitleBefore')}{' '}
              <span style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('heroTitleHighlight')}
              </span>{' '}
              {t('heroTitleAfter')}
            </h1>
          </Stagger>

          {/* Description paragraph */}
          <Stagger delay={140}>
            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-4 leading-relaxed" style={sans}>
              {t('heroDescription')}
            </p>
          </Stagger>

          {/* Tagline */}
          <Stagger delay={200}>
            <p className="text-sm text-green-400/90 font-medium mb-8" style={{ ...sans, letterSpacing: '0.02em' }}>
              {t('tagline')}
            </p>
          </Stagger>

          {/* Intro text */}
          <Stagger delay={260}>
            <p className="text-base text-gray-300 max-w-3xl mb-12 leading-relaxed" style={sans}>
              {t('introText')}
            </p>
          </Stagger>

          {/* Explore topics */}
          <Stagger delay={320}>
            <p className="text-sm text-white font-medium mb-6" style={sans}>
              {t('exploreStoriesOn')}
            </p>
          </Stagger>

          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mb-12">
            {TOPIC_KEYS.map((topicKey, i) => (
              <Stagger key={topicKey} delay={350 + i * 70}>
                <div className="flex items-center gap-4 p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-green-400/20 transition-all duration-300">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                    {TOPIC_ICONS[i]}
                  </div>
                  <p className="text-sm font-medium text-gray-200" style={sans}>
                    {t(topicKey)}
                  </p>
                </div>
              </Stagger>
            ))}
          </div>
        </section>

        {/* ═══════ HERO IMAGE ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <Image
                src="/images/success-stories/Sucess_Story_Image_1.png"
                alt="Success stories"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>
          </Stagger>
        </section>

        {/* ═══════ CTA — Explore Interactive Stories ═══════ */}
        <section className="pb-24 border-t border-white/5 pt-20">
          <div className="max-w-3xl mx-auto text-center">
            <Stagger delay={0}>
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
                  {t('ctaEyebrow')}
                </span>
              </div>
            </Stagger>

            <Stagger delay={70}>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={serif}>
                {t('ctaTitle')}
              </h2>
            </Stagger>

            <Stagger delay={140}>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed" style={sans}>
                {t('ctaDescription')}
              </p>
            </Stagger>

            <Stagger delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/story"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#0a0f0d',
                    ...sans,
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  {t('ctaInteractiveStories')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ ...sans, letterSpacing: '0.02em' }}
                >
                  {t('ctaOpenMap')}
                </Link>
              </div>
            </Stagger>
          </div>
        </section>
      </main>
    </div>
  )
}
