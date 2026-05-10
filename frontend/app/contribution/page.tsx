'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

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

const CONTRIBUTION_TYPES = [
  {
    title: 'Validation of False Positives / False Negatives',
    description: 'Identify areas where datasets may incorrectly classify land condition.',
    items: [
      'Locality name',
      'Coordinates (X, Y)',
      'Area (km²)',
      'Description of the process causing misclassification',
    ],
    example: 'Area classified as degraded but showing signs of recovery',
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
    title: 'Hotspots & Brightspots Assessment',
    description: 'Provide qualitative insights on areas identified as degraded or improved.',
    items: [
      'Locality name',
      'Coordinates',
      'Area (km²)',
      'Assessment method (field survey, expert knowledge, etc.)',
      'Drivers of land degradation (for hotspots)',
      'Actions taken to restore land (for brightspots)',
      'Ongoing or planned interventions',
    ],
    example: null,
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
    title: 'Brightspots (Land Improvement)',
    description: 'Share detailed information on areas showing positive land restoration outcomes.',
    items: [
      'Locality name',
      'Coordinates',
      'Area (km²)',
      'Actions leading to improvement',
      'Implementation approach (past, current, future)',
    ],
    example: null,
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

const HOW_TO_STEPS = [
  'Select the type of contribution;',
  'Provide location (coordinates or map selection);',
  'Fill in the required information;',
  'Submit your contribution for review.',
]

const DATA_USE_ITEMS = [
  'Reviewed and validated by experts;',
  'Integrated into the platform (where relevant);',
  'Used to improve land degradation assessments and indicators.',
]

const IMPORTANT_NOTES = [
  'Ensure data accuracy and reliability;',
  'Provide clear and verifiable information;',
  'Contributions may be subject to validation before publication.',
]

export default function ContributionPage() {
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
                Contribution | Land Degradation Observations in AfricaTools
              </span>
            </div>
          </Stagger>

          {/* Main heading */}
          <Stagger delay={70}>
            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] mb-6 max-w-4xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              Contribute georeferenced data on{' '}
              <span style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                land degradation
              </span>{' '}
              in Africa
            </h1>
          </Stagger>

          {/* Description */}
          <Stagger delay={140}>
            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-4 leading-relaxed" style={sans}>
              Report hotspots, brightspots, and validate false positives to support LDN monitoring.
            </p>
          </Stagger>

          {/* Tagline */}
          <Stagger delay={200}>
            <p className="text-sm text-green-400/90 font-medium mb-8" style={{ ...sans, letterSpacing: '0.02em' }}>
              Share knowledge. Validate data. Strengthen LDN monitoring.
            </p>
          </Stagger>

          {/* Intro paragraphs */}
          <Stagger delay={260}>
            <p className="text-base text-gray-300 max-w-3xl mb-4 leading-relaxed" style={sans}>
              The Contribution section enables users and stakeholders to submit georeferenced information on land degradation and land improvement across Africa.
            </p>
          </Stagger>

          <Stagger delay={310}>
            <p className="text-base text-gray-300 max-w-3xl mb-8 leading-relaxed" style={sans}>
              It supports a participatory approach to monitoring Land Degradation Neutrality (LDN) by integrating field knowledge, expert insights, and local observations.
            </p>
          </Stagger>

          {/* Contributions help list */}
          <Stagger delay={360}>
            <p className="text-sm text-white font-medium mb-4" style={sans}>
              Contributions help:
            </p>
          </Stagger>

          <div className="max-w-3xl mb-12 space-y-3">
            {[
              'Validate spatial data.',
              'Identify hotspots (degraded areas).',
              'Highlight brightspots (restored or improving areas).',
              'Detect false positives and false negatives in datasets.',
            ].map((item, i) => (
              <Stagger key={item} delay={400 + i * 60}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm text-gray-300" style={sans}>{item}</span>
                </div>
              </Stagger>
            ))}
          </div>
        </section>

        {/* ═══════ IMAGE PLACEHOLDER ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
              </div>
            </div>
          </Stagger>
        </section>

        {/* ═══════ TYPES OF CONTRIBUTIONS ═══════ */}
        <section className="pb-20">
          <Stagger delay={0}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full bg-green-400" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={serif}>
                Types of contributions
              </h2>
            </div>
          </Stagger>

          <div className="space-y-8 max-w-4xl">
            {CONTRIBUTION_TYPES.map((type, i) => (
              <Stagger key={type.title} delay={i * 80}>
                <div className={`rounded-xl border bg-white/[0.02] overflow-hidden ${type.borderColor}`}>
                  <div className="p-6 lg:p-8">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${type.accentText}`} style={{ background: type.accentColor }}>
                        {type.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1" style={serif}>
                          {type.title}
                        </h3>
                        <p className="text-sm text-gray-400" style={sans}>
                          {type.description}
                        </p>
                      </div>
                    </div>

                    {/* What to report / include */}
                    <p className="text-sm text-white font-medium mb-3" style={sans}>
                      What to report:
                    </p>
                    <ul className="space-y-2 mb-4">
                      {type.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                          <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Example */}
                    {type.example && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-500 mb-1" style={sans}>Example:</p>
                        <p className="text-sm text-gray-400 italic" style={sans}>{type.example}</p>
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
                How to contribute
              </h2>
            </div>
          </Stagger>

          <div className="max-w-3xl space-y-5">
            {HOW_TO_STEPS.map((step, i) => (
              <Stagger key={step} delay={i * 70}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 border border-green-400/20 flex items-center justify-center text-green-400 text-sm font-bold" style={sans}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-300 pt-1.5" style={sans}>{step}</p>
                </div>
              </Stagger>
            ))}
          </div>

          {/* Image placeholder */}
          <Stagger delay={300}>
            <div className="mt-10 rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
              </div>
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
                  Data use and validation
                </h3>
              </div>

              <p className="text-sm text-white font-medium mb-4" style={sans}>
                Submitted data will be:
              </p>

              <ul className="space-y-3">
                {DATA_USE_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300" style={sans}>
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
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
                Important notes
              </h2>
            </div>
          </Stagger>

          <div className="max-w-3xl space-y-3">
            {IMPORTANT_NOTES.map((note, i) => (
              <Stagger key={note} delay={i * 60}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-gray-300" style={sans}>{note}</span>
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
                  Call to Action
                </span>
              </div>
            </Stagger>

            <Stagger delay={70}>
              <h2 className="text-3xl lg:text-5xl font-bold mb-4" style={serif}>
                Contribute to LDN Monitoring
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
                  Submit a Hotspot
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
                  Share a Brightspot
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
                  style={{ ...sans, letterSpacing: '0.02em' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report a Data Inconsistency
                </Link>
              </div>
            </Stagger>
          </div>
        </section>
      </main>
    </div>
  )
}
