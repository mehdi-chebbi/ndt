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

const CONTRIBUTION_TYPE_CONFIGS = [
  {
    titleKey: 'type0Title',
    descKey: 'type0Desc',
    itemKeys: ['type0Item0', 'type0Item1', 'type0Item2', 'type0Item3'],
    exampleKey: 'type0Example',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accentColor: 'rgba(239,68,68,0.1)',
    accentText: 'text-red-400',
    borderColor: 'border-red-400/20',
  },
  {
    titleKey: 'type1Title',
    descKey: 'type1Desc',
    itemKeys: ['type1Item0', 'type1Item1', 'type1Item2', 'type1Item3', 'type1Item4', 'type1Item5', 'type1Item6'],
    exampleKey: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accentColor: 'rgba(249,115,22,0.1)',
    accentText: 'text-orange-400',
    borderColor: 'border-orange-400/20',
  },
  {
    titleKey: 'type2Title',
    descKey: 'type2Desc',
    itemKeys: ['type2Item0', 'type2Item1', 'type2Item2', 'type2Item3', 'type2Item4'],
    exampleKey: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    accentColor: 'rgba(34,197,94,0.1)',
    accentText: 'text-green-400',
    borderColor: 'border-green-400/20',
  },
]

const HOW_TO_STEP_KEYS = ['howStep0', 'howStep1', 'howStep2', 'howStep3']

const DATA_USE_KEYS = ['dataUse0', 'dataUse1', 'dataUse2']

const IMPORTANT_NOTE_KEYS = ['importantNote0', 'importantNote1', 'importantNote2']

export default function ContributionPage() {
  const { t } = useTranslation('contribution')
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
              {t('heroBefore')}{' '}
              <span style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('heroHighlight')}
              </span>{' '}
              {t('heroAfter')}
            </h1>
          </Stagger>

          {/* Description */}
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

          {/* Intro paragraphs */}
          <Stagger delay={260}>
            <p className="text-base text-gray-300 max-w-3xl mb-4 leading-relaxed" style={sans}>
              {t('intro1')}
            </p>
          </Stagger>

          <Stagger delay={310}>
            <p className="text-base text-gray-300 max-w-3xl mb-8 leading-relaxed" style={sans}>
              {t('intro2')}
            </p>
          </Stagger>

          {/* Contributions help list */}
          <Stagger delay={360}>
            <p className="text-sm text-white font-medium mb-4" style={sans}>
              {t('contributionsHelp')}:
            </p>
          </Stagger>

          <div className="max-w-3xl mb-12 space-y-3">
            {['helpValidate', 'helpHotspots', 'helpBrightspots', 'helpFalsePositives'].map((key, i) => (
              <Stagger key={key} delay={400 + i * 60}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm text-gray-300" style={sans}>{t(key)}</span>
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
                src="/images/contribution/Image_Contribution_1.png"
                alt="Contribution overview"
                width={1774}
                height={887}
                className="w-full h-auto object-cover"
              />
            </div>
          </Stagger>
        </section>

        {/* ═══════ TYPES OF CONTRIBUTIONS ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('typesHeading')}
              </h2>
            </div>
          </Stagger>

          <div className="space-y-8 max-w-4xl">
            {CONTRIBUTION_TYPE_CONFIGS.map((type, i) => (
              <Stagger key={type.titleKey} delay={i * 80}>
                <div className={`rounded-xl border bg-white/[0.02] overflow-hidden ${type.borderColor}`}>
                  <div className="p-6 lg:p-8">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${type.accentText}`} style={{ background: type.accentColor }}>
                        {type.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1" style={serif}>
                          {t(type.titleKey)}
                        </h3>
                        <p className="text-sm text-gray-400" style={sans}>
                          {t(type.descKey)}
                        </p>
                      </div>
                    </div>

                    {/* What to report / include */}
                    <p className="text-sm text-white font-medium mb-3" style={sans}>
                      {t('whatToReport')}:
                    </p>
                    <ul className="space-y-2 mb-4">
                      {type.itemKeys.map((itemKey, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                          <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{t(itemKey)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Example */}
                    {type.exampleKey && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-500 mb-1" style={sans}>{t('example')}</p>
                        <p className="text-sm text-gray-400 italic" style={sans}>{t(type.exampleKey)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Stagger>
            ))}
          </div>
        </section>

        {/* ═══════ HOW TO CONTRIBUTE ═══════ */}
        <section className="pb-20 border-t border-white/5 pt-16">
          <Stagger delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('howToHeading')}
              </h2>
            </div>
          </Stagger>

          <div className="max-w-3xl space-y-5">
            {HOW_TO_STEP_KEYS.map((key, i) => (
              <Stagger key={key} delay={i * 70}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 border border-green-400/20 flex items-center justify-center text-green-400 text-sm font-bold" style={sans}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-300 pt-1.5" style={sans}>{t(key)}</p>
                </div>
              </Stagger>
            ))}
          </div>

          {/* Image */}
          <Stagger delay={300}>
            <div className="mt-10 rounded-xl border border-white/10 overflow-hidden">
              <Image
                src="/images/contribution/Image_Contribution_2.png"
                alt="How to contribute"
                width={1396}
                height={1127}
                className="w-full h-auto object-cover"
              />
            </div>
          </Stagger>
        </section>

        {/* ═══════ DATA USE AND VALIDATION ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white" style={serif}>
                  {t('dataUseHeading')}
                </h3>
              </div>

              <p className="text-sm text-white font-medium mb-4" style={sans}>
                {t('submittedDataWillBe')}:
              </p>

              <ul className="space-y-3">
                {DATA_USE_KEYS.map((key, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Stagger>
        </section>

        {/* ═══════ IMPORTANT NOTES ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 rounded-full bg-yellow-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                {t('importantNotesHeading')}
              </h2>
            </div>
          </Stagger>

          <div className="max-w-3xl space-y-3">
            {IMPORTANT_NOTE_KEYS.map((key, i) => (
              <Stagger key={key} delay={i * 60}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-gray-300" style={sans}>{t(key)}</span>
                </div>
              </Stagger>
            ))}
          </div>
        </section>

        {/* ═══════ CALL TO ACTION ═══════ */}
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
              <h2 className="text-3xl lg:text-5xl font-bold mb-4" style={serif}>
                {t('ctaHeading')}
              </h2>
            </Stagger>

            <Stagger delay={140}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    color: '#fff',
                    ...sans,
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(239,68,68,0.25)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('ctaSubmitHotspot')}
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#0a0f0d',
                    ...sans,
                    letterSpacing: '0.02em',
                    boxShadow: '0 0 24px rgba(34,197,94,0.25)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {t('ctaShareBrightspot')}
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ ...sans, letterSpacing: '0.02em' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {t('ctaReportInconsistency')}
                </Link>
              </div>
            </Stagger>
          </div>
        </section>
      </main>
    </div>
  )
}
