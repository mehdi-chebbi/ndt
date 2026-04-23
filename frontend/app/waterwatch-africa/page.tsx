'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

/* ─── animated counter ─── */
function Counter({ target, suffix = '', decimals = 0, duration = 1800 }: {
  target: number; suffix?: string; decimals?: number; duration?: number
}) {
  const [val, setVal] = useState(0)
  const { ref, visible } = useInView(0.3)
  useEffect(() => {
    if (!visible) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(parseFloat((ease * target).toFixed(decimals)))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [visible, target, duration, decimals])
  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>
}

/* ─── animated horizontal bar ─── */
function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} style={{ flex: 1, height: '3px', borderRadius: '9999px', overflow: 'hidden', background: '#e5e7eb' }}>
      <div style={{
        height: '100%',
        background: color,
        width: visible ? `${pct}%` : '0%',
        transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        borderRadius: '9999px',
      }} />
    </div>
  )
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

/* ── animated gap column ── */
function GapColumn({ d, delay }: { d: { name: string; urban: number; rural: number }; delay: number }) {
  const { ref, visible } = useInView(0.1)
  const maxH = 120
  const urbanH = (d.urban / 100) * maxH
  const ruralH = (d.rural / 100) * maxH
  const gap = d.urban - d.rural
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '9px',
        color: '#9ca3af', marginBottom: '10px',
        opacity: visible ? 1 : 0,
        transition: `opacity 0.5s ease ${delay + 600}ms`,
      }}>
        -{gap.toFixed(0)}pp
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: `${maxH}px` }}>
        <div style={{
          width: '20px', borderRadius: '3px 3px 0 0',
          background: 'linear-gradient(180deg,#2563eb,rgba(37,99,235,0.45))',
          height: visible ? `${urbanH}px` : '0px',
          transition: `height 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        }} />
        <div style={{
          width: '20px', borderRadius: '3px 3px 0 0',
          background: 'linear-gradient(180deg,#16a34a,rgba(22,163,74,0.45))',
          height: visible ? `${ruralH}px` : '0px',
          transition: `height 1s cubic-bezier(0.16,1,0.3,1) ${delay + 80}ms`,
        }} />
      </div>
      <div style={{ width: '48px', height: '1px', background: '#e5e7eb', margin: '6px 0' }} />
      <p style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>{d.name}</p>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', marginTop: '4px' }}>
        <span style={{ color: '#2563eb' }}>{d.urban.toFixed(0)}</span>
        <span style={{ color: '#d1d5db', margin: '0 2px' }}>·</span>
        <span style={{ color: '#16a34a' }}>{d.rural.toFixed(0)}</span>
      </p>
    </div>
  )
}

/* ─── reusable modal ─── */
type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  accentColor: string
  children: React.ReactNode
}
function Modal({ open, onClose, title, accentColor, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          width: '100%', maxWidth: '640px',
          maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.14)',
          overflow: 'hidden',
        }}
      >
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f3f4f6',
          borderTop: `3px solid ${accentColor}`,
          flexShrink: 0,
        }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
            letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b7280',
          }}>
            {title}
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: '16px', lineHeight: 1,
              padding: '4px 8px', borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>
        {/* scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── "View full list" button ─── */
function ViewFullListBtn({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('waterwatch')
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#f9fafb' : 'transparent',
        border: '0.5px solid #e5e7eb',
        borderRadius: '6px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        letterSpacing: '0.08em',
        color: hover ? '#374151' : '#9ca3af',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >
      {t('viewFullList')}
    </button>
  )
}

/* ─── N/A badge ─── */
const NA = () => {
  const { t } = useTranslation('waterwatch')
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{t('na')}</span>
  )
}

export default function WaterWatchAfricaPage() {
  const { t } = useTranslation('waterwatch')
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const [modal, setModal] = useState<null | 'lowest' | 'improvers' | 'changes' | 'gap'>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let chartInstance: any = null
    const load = async () => {
      const Chart = (await import('chart.js/auto')).default
      if (!trendChartRef.current) return
      const ctx = trendChartRef.current.getContext('2d')
      if (!ctx) return
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['2000','2002','2004','2006','2008','2010','2012','2014','2016','2018','2020'],
          datasets: [{
            data: [43.6, 44.4, 45.3, 46.3, 47.9, 49.0, 50.1, 51.1, 52.1, 53.1, 54.0],
            borderColor: '#16a34a', borderWidth: 2.5,
            backgroundColor: (c: any) => {
              const g = c.chart.ctx.createLinearGradient(0,0,0,220)
              g.addColorStop(0,'rgba(22,163,74,0.12)')
              g.addColorStop(1,'rgba(22,163,74,0)')
              return g
            },
            tension: 0.45, fill: true,
            pointRadius: 4, pointBackgroundColor: '#16a34a',
            pointBorderColor: '#ffffff', pointBorderWidth: 2, pointHoverRadius: 6,
          }]
        },
        options: {
          animation: { duration: 1600, easing: 'easeOutQuart' },
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2937', borderColor: 'rgba(22,163,74,0.4)', borderWidth: 1,
              titleColor: '#4ade80', bodyColor: '#f9fafb',
              titleFont: { family: "'JetBrains Mono', monospace", size: 10 },
              bodyFont: { size: 18 }, padding: 14,
              callbacks: { label: (c: any) => c.parsed.y.toFixed(1) + '%' }
            }
          },
          scales: {
            x: {
              ticks: { color: '#9ca3af', font: { family: "'JetBrains Mono', monospace", size: 11 }, maxRotation: 0 },
              grid: { color: 'rgba(0,0,0,0.04)' }, border: { dash: [3,5], color: 'transparent' }
            },
            y: {
              min: 35, max: 60,
              ticks: { color: '#9ca3af', font: { family: "'JetBrains Mono', monospace", size: 11 }, callback: (v: any) => v + '%' },
              grid: { color: 'rgba(0,0,0,0.04)' }, border: { dash: [3,5], color: 'transparent' }
            }
          }
        }
      })
    }
    load()
    return () => { if (chartInstance) chartInstance.destroy() }
  }, [])

  // ── data ──────────────────────────────────────────────────────────────────

  const lowestCountries = [
    { name: 'Chad', val: 6.2 },
    { name: 'C.A.R.', val: 6.2 },
    { name: 'DR Congo', val: 11.2 },
    { name: 'Ethiopia', val: 12.0 },
    { name: 'Malawi', val: 16.4 },
    { name: 'Benin', val: 17.1 },
  ]

  const NO_DATA_COUNTRIES = [
    'Angola','Burkina Faso','Burundi','Cabo Verde','Cameroon','Djibouti',
    'Equatorial Guinea','Eritrea','Gabon','Guinea','Kenya','Liberia',
    'Mali','Mauritania','Mauritius','Namibia','Niger','Rwanda',
    'Somalia','South Sudan',
  ]

  const allLowest: { name: string; val: number | null }[] = [
    { name: 'Chad', val: 6.2 },
    { name: 'C.A.R.', val: 6.2 },
    { name: 'DR Congo', val: 11.2 },
    { name: 'Ethiopia', val: 12.0 },
    { name: 'Malawi', val: 16.4 },
    { name: 'Benin', val: 17.1 },
    { name: 'Guinea-Bissau', val: 23.4 },
    { name: 'Mozambique', val: 23.3 },
    { name: 'Senegal', val: 26.0 },
    { name: 'Lesotho', val: 27.5 },
    { name: 'Nigeria', val: 27.8 },
    { name: 'Eswatini', val: 36.7 },
    { name: 'Cote d\'Ivoire', val: 38.7 },
    { name: 'Sao Tome & Pr.', val: 35.6 },
    { name: 'Congo, Rep.', val: 45.7 },
    { name: 'Togo', val: 62.0 },
    { name: 'Seychelles', val: 64.2 },
    { name: 'Botswana', val: 65.8 },
    { name: 'Zimbabwe', val: 67.2 },
    { name: 'Zambia', val: 69.1 },
    { name: 'Algeria', val: 70.5 },
    { name: 'Morocco', val: 73.3 },
    { name: 'Egypt', val: 76.6 },
    { name: 'Ghana', val: 85.8 },
    { name: 'Comoros', val: 85.5 },
    { name: 'South Africa', val: 91.2 },
    { name: 'Tunisia', val: 95.1 },
    { name: 'Libya', val: 95.3 },
    { name: 'Sudan', val: 61.1 },
    { name: 'Tanzania', val: 58.4 },
    { name: 'Uganda', val: 56.3 },
    { name: 'Sierra Leone', val: 63.4 },
    { name: 'Gambia', val: 45.5 },
    { name: 'Madagascar', val: 19.8 },
    ...NO_DATA_COUNTRIES.map(name => ({ name, val: null })),
  ].sort((a, b) => {
    if (a.val === null && b.val === null) return 0
    if (a.val === null) return 1
    if (b.val === null) return -1
    return a.val - b.val
  })

  const improvers = [
    { name: 'Morocco', val: 32.6 },
    { name: 'Uganda', val: 30.0 },
    { name: 'Tanzania', val: 29.8 },
    { name: 'Zambia', val: 22.9 },
    { name: 'Sierra Leone', val: 22.5 },
    { name: 'Gambia', val: 22.2 },
    { name: 'Ghana', val: 20.3 },
    { name: 'Lesotho', val: 18.8 },
    { name: 'Congo Rep.', val: 17.8 },
    { name: 'Madagascar', val: 12.4 },
  ]

  const allChanges: { name: string; y2000: number | null; y2020: number | null; change: number | null }[] = [
    { name: 'Morocco', y2000: 40.7, y2020: 73.3, change: 32.6 },
    { name: 'Uganda', y2000: 26.2, y2020: 56.3, change: 30.0 },
    { name: 'Tanzania', y2000: 28.6, y2020: 58.4, change: 29.8 },
    { name: 'Zambia', y2000: 46.2, y2020: 69.1, change: 22.9 },
    { name: 'Sierra Leone', y2000: 40.9, y2020: 63.4, change: 22.5 },
    { name: 'Gambia', y2000: 23.3, y2020: 45.5, change: 22.2 },
    { name: 'Ghana', y2000: 65.5, y2020: 85.8, change: 20.3 },
    { name: 'Togo', y2000: 45.8, y2020: 62.0, change: 16.2 },
    { name: 'Lesotho', y2000: 8.7, y2020: 27.5, change: 18.8 },
    { name: 'Mozambique', y2000: 9.0, y2020: 23.3, change: 14.3 },
    { name: 'Cote d\'Ivoire', y2000: 25.4, y2020: 38.7, change: 13.3 },
    { name: 'Egypt', y2000: 65.3, y2020: 76.6, change: 11.3 },
    { name: 'Malawi', y2000: 7.0, y2020: 16.4, change: 9.5 },
    { name: 'Sao Tome & Pr.', y2000: 26.0, y2020: 35.6, change: 9.7 },
    { name: 'Eswatini', y2000: 27.4, y2020: 36.7, change: 9.3 },
    { name: 'Congo Rep.', y2000: 27.9, y2020: 45.7, change: 17.8 },
    { name: 'Tunisia', y2000: 87.5, y2020: 95.1, change: 7.6 },
    { name: 'Nigeria', y2000: 12.6, y2020: 27.8, change: 15.2 },
    { name: 'Sudan', y2000: 45.7, y2020: 61.1, change: 15.3 },
    { name: 'Madagascar', y2000: 7.3, y2020: 19.8, change: 12.4 },
    { name: 'Ethiopia', y2000: 5.4, y2020: 12.0, change: 6.7 },
    { name: 'Senegal', y2000: 20.0, y2020: 26.0, change: 5.9 },
    { name: 'Guinea-Bissau', y2000: 17.7, y2020: 23.4, change: 5.8 },
    { name: 'Benin', y2000: 14.2, y2020: 17.1, change: 2.9 },
    { name: 'Seychelles', y2000: 62.0, y2020: 64.2, change: 2.3 },
    { name: 'Chad', y2000: 5.5, y2020: 6.2, change: 0.6 },
    { name: 'Zimbabwe', y2000: 67.9, y2020: 67.2, change: -0.8 },
    { name: 'DR Congo', y2000: 12.2, y2020: 11.2, change: -1.0 },
    { name: 'Comoros', y2000: 87.3, y2020: 85.5, change: -1.9 },
    { name: 'C.A.R.', y2000: 8.5, y2020: 6.2, change: -2.4 },
    { name: 'Algeria', y2000: 69.5, y2020: 70.5, change: 1.0 },
    { name: 'Botswana', y2000: 59.2, y2020: 65.8, change: 6.6 },
    { name: 'Libya', y2000: null, y2020: 95.3, change: null },
    ...NO_DATA_COUNTRIES.map(name => ({ name, y2000: null, y2020: null, change: null })),
  ].sort((a, b) => {
    if (a.change === null && b.change === null) return 0
    if (a.change === null) return 1
    if (b.change === null) return -1
    return b.change - a.change
  })

  const tableData = [
    { country: 'Morocco', y2000: 40.7, y2020: 73.3, change: +32.6 },
    { country: 'Uganda', y2000: 26.2, y2020: 56.3, change: +30.0 },
    { country: 'Tanzania', y2000: 28.6, y2020: 58.4, change: +29.8 },
    { country: 'C.A.R.', y2000: 8.5, y2020: 6.2, change: -2.4 },
    { country: 'DR Congo', y2000: 12.2, y2020: 11.2, change: -1.0 },
    { country: 'Comoros', y2000: 87.3, y2020: 85.5, change: -1.9 },
    { country: 'Tunisia', y2000: 87.5, y2020: 95.1, change: +7.6 },
  ]

  const gapData = [
    { name: 'Gambia', urban: 66.9, rural: 9.6 },
    { name: 'Lesotho', urban: 66.3, rural: 11.7 },
    { name: 'Malawi', urban: 50.8, rural: 9.2 },
    { name: 'Madagascar', urban: 35.7, rural: 9.8 },
    { name: 'Eswatini', urban: 77.8, rural: 23.6 },
    { name: 'Mozambique', urban: 45.5, rural: 10.2 },
    { name: 'Morocco', urban: 88.3, rural: 47.0 },
  ]

  const allGap: { name: string; urban: number | null; rural: number | null }[] = [
    { name: 'Gambia', urban: 66.9, rural: 9.6 },
    { name: 'Lesotho', urban: 66.3, rural: 11.7 },
    { name: 'Eswatini', urban: 77.8, rural: 23.6 },
    { name: 'Malawi', urban: 50.8, rural: 9.2 },
    { name: 'Mozambique', urban: 45.5, rural: 10.2 },
    { name: 'Morocco', urban: 88.3, rural: 47.0 },
    { name: 'Madagascar', urban: 35.7, rural: 9.8 },
    { name: 'DR Congo', urban: 23.9, rural: 0.5 },
    { name: 'C.A.R.', urban: 11.5, rural: 2.3 },
    { name: 'Chad', urban: 17.5, rural: 2.7 },
    { name: 'Ethiopia', urban: 38.0, rural: 4.8 },
    { name: 'Guinea-Bissau', urban: 36.4, rural: 13.2 },
    { name: 'Nigeria', urban: 35.1, rural: 19.9 },
    { name: 'Senegal', urban: 40.8, rural: 12.2 },
    { name: 'Cote d\'Ivoire', urban: 53.5, rural: 22.8 },
    { name: 'Congo Rep.', urban: 58.6, rural: 18.4 },
    { name: 'Sao Tome & Pr.', urban: 39.8, rural: 23.6 },
    { name: 'Tanzania', urban: 83.2, rural: 44.9 },
    { name: 'Uganda', urban: 78.3, rural: 49.0 },
    { name: 'Sudan', urban: 71.9, rural: 55.2 },
    { name: 'Togo', urban: 74.6, rural: 52.6 },
    { name: 'Zambia', urban: 89.0, rural: 53.1 },
    { name: 'Zimbabwe', urban: 93.9, rural: 54.5 },
    { name: 'Ghana', urban: 95.8, rural: 72.4 },
    { name: 'South Africa', urban: 98.3, rural: 76.4 },
    { name: 'Algeria', urban: 73.6, rural: 62.0 },
    { name: 'Comoros', urban: 89.8, rural: 83.7 },
    { name: 'Tunisia', urban: 98.3, rural: 87.8 },
    { name: 'Botswana', urban: 72.1, rural: null },
    { name: 'Egypt', urban: null, rural: null },
    { name: 'Libya', urban: null, rural: null },
    { name: 'Seychelles', urban: null, rural: null },
    { name: 'Rwanda', urban: 49.1, rural: null },
    ...NO_DATA_COUNTRIES.map(name => ({ name, urban: null as number | null, rural: null as number | null })),
  ].sort((a, b) => {
    const gA = a.urban !== null && a.rural !== null ? a.urban - a.rural : null
    const gB = b.urban !== null && b.rural !== null ? b.urban - b.rural : null
    if (gA === null && gB === null) return 0
    if (gA === null) return 1
    if (gB === null) return -1
    return gB - gA
  })

  // ── shared styles ─────────────────────────────────────────────────────────

  const kpis = [
    { label: t('kpis.countriesWithData'), value: 34, suffix: '', decimals: 0, sub: t('kpis.ofAuMembers'), accent: false, display: null as string | null },
    { label: t('kpis.avgAccess2020'), value: 54.0, suffix: '%', decimals: 1, sub: t('kpis.simpleAvgReporting'), accent: true, display: null as string | null },
    { label: t('kpis.aboveThreshold'), value: null as number | null, suffix: '', decimals: 0, sub: t('kpis.countriesAvailData'), accent: false, display: '20/34' },
    { label: t('kpis.twentyYearImprovement'), value: 11, suffix: ' pp', decimals: 0, sub: t('kpis.avgGainReporting'), accent: false, display: null as string | null },
  ]

  const card: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '28px',
  }

  const pill = (color: string): React.CSSProperties => ({
    width: '3px', height: '14px', background: color, borderRadius: '9999px', flexShrink: 0,
  })

  // section header with optional "View full list" button
  const sectionHead = (color: string, label: string, onViewAll?: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={pill(color)} />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: '#6b7280', textTransform: 'uppercase' as const }}>
          {label}
        </p>
      </div>
      {onViewAll && <ViewFullListBtn onClick={onViewAll} />}
    </div>
  )

  // shared modal table header row
  const mHead = (cols: string[], template: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: template, padding: '8px 24px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
      {cols.map((h, i) => (
        <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Instrument Sans', sans-serif", color: '#111827' }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet" />

      {/* ── MODAL: Lowest access ────────────────────────────────────────────── */}
      <Modal open={modal === 'lowest'} onClose={() => setModal(null)} title={t('modals.lowestTitle')} accentColor="#ef4444">
        {mHead([t('modals.rank'), t('modals.country'), t('modals.year2020')], '28px 1fr 80px')}
        {allLowest.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.val !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textAlign: 'right', color: r.val === null ? '#d1d5db' : r.val < 30 ? '#ef4444' : r.val < 60 ? '#f97316' : '#16a34a' }}>
              {r.val !== null ? r.val.toFixed(1) + '%' : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Biggest gains ────────────────────────────────────────────── */}
      <Modal open={modal === 'improvers'} onClose={() => setModal(null)} title={t('modals.improversTitle')} accentColor="#16a34a">
        {mHead([t('modals.rank'), t('modals.country'), t('modals.year2000'), t('modals.year2020'), t('modals.deltaPP')], '28px 1fr 68px 68px 76px')}
        {allChanges.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 68px 68px 76px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.change !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{r.y2000 !== null ? r.y2000.toFixed(1) + '%' : <NA />}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{r.y2020 !== null ? r.y2020.toFixed(1) + '%' : <NA />}</span>
            <span style={{ textAlign: 'right' }}>
              {r.change !== null ? (
                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, background: r.change >= 0 ? '#dcfce7' : '#fee2e2', color: r.change >= 0 ? '#15803d' : '#b91c1c', border: `1px solid ${r.change >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                  {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)}
                </span>
              ) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Notable changes ──────────────────────────────────────────── */}
      <Modal open={modal === 'changes'} onClose={() => setModal(null)} title={t('modals.changesTitle')} accentColor="#6366f1">
        {mHead([t('modals.rank'), t('modals.country'), t('modals.year2000'), t('modals.year2020'), t('modals.deltaPP')], '28px 1fr 68px 68px 76px')}
        {allChanges.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 68px 68px 76px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.change !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{r.y2000 !== null ? r.y2000.toFixed(1) + '%' : <NA />}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>{r.y2020 !== null ? r.y2020.toFixed(1) + '%' : <NA />}</span>
            <span style={{ textAlign: 'right' }}>
              {r.change !== null ? (
                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, background: r.change >= 0 ? '#dcfce7' : '#fee2e2', color: r.change >= 0 ? '#15803d' : '#b91c1c', border: `1px solid ${r.change >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                  {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)}
                </span>
              ) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Urban vs Rural gap ───────────────────────────────────────── */}
      <Modal open={modal === 'gap'} onClose={() => setModal(null)} title={t('modals.gapTitle')} accentColor="#0ea5e9">
        {mHead([t('modals.rank'), t('modals.country'), t('modals.urban'), t('modals.rural'), t('modals.gap')], '28px 1fr 64px 64px 64px')}
        {allGap.map((r, i) => {
          const gap = r.urban !== null && r.rural !== null ? r.urban - r.rural : null
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 64px 64px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{gap !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
              <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#2563eb', textAlign: 'right' }}>{r.urban !== null ? r.urban.toFixed(1) + '%' : <NA />}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#16a34a', textAlign: 'right' }}>{r.rural !== null ? r.rural.toFixed(1) + '%' : <NA />}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textAlign: 'right', color: gap !== null ? (gap > 40 ? '#ef4444' : gap > 20 ? '#f97316' : '#374151') : '#d1d5db' }}>
                {gap !== null ? gap.toFixed(0) + 'pp' : <NA />}
              </span>
            </div>
          )
        })}
      </Modal>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', overflow: 'hidden', padding: '64px 64px 56px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(90deg,transparent,transparent 80px,rgba(0,0,0,0.018) 80px,rgba(0,0,0,0.018) 81px)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg,#16a34a,rgba(22,163,74,0.1))' }} />
        <div style={{ position: 'absolute', top: '-80px', right: '160px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(22,163,74,0.06) 0%,transparent 70%)', transform: `translateY(${scrollY * 0.12}px)`, pointerEvents: 'none' }} />
        <Stagger delay={0}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: '#16a34a', marginBottom: '20px', textTransform: 'uppercase' }}>
            {t('header.subtitle')}
          </p>
        </Stagger>
        <Stagger delay={70}>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 'clamp(2.8rem,5.5vw,5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>{t('header.title')}</h1>
        </Stagger>
        <Stagger delay={140}>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 'clamp(2.8rem,5.5vw,5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: '40px' }}>
            <em style={{ color: '#16a34a', fontStyle: 'italic' }}>{t('header.titleEm')}</em>
          </h1>
        </Stagger>
        <Stagger delay={220}>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { label: t('header.indicatorLabel'), value: t('header.indicatorValue') },
              { label: t('header.periodLabel'), value: t('header.periodValue') },
              { label: t('header.sourceLabel'), value: t('header.sourceValue') },
            ].map((item, i) => (
              <div key={i}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.14em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#374151' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Stagger>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '56px 64px 80px' }}>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', marginBottom: '48px', borderRadius: '8px', overflow: 'hidden', background: '#e5e7eb' }}>
          {kpis.map((kpi, i) => (
            <Stagger key={i} delay={i * 55} style={{ height: '100%' }}>
              <div style={{ background: '#ffffff', padding: '28px', position: 'relative', overflow: 'hidden', height: '100%' }}>
                {kpi.accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#16a34a,transparent)' }} />}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.14em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '14px' }}>{kpi.label}</p>
                <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '3rem', lineHeight: 1, fontWeight: 600, marginBottom: '8px', color: kpi.accent ? '#16a34a' : '#0f172a' }}>
                  {kpi.display ? kpi.display : <Counter target={kpi.value as number} suffix={kpi.suffix} decimals={kpi.decimals} />}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{kpi.sub}</p>
              </div>
            </Stagger>
          ))}
        </div>

        {/* ── TREND + LOWEST ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <Stagger delay={0}>
            <div style={card}>
              {sectionHead('#16a34a', t('sections.continentalAvg'))}
              <div style={{ height: '220px', position: 'relative' }}><canvas ref={trendChartRef} /></div>
            </div>
          </Stagger>
          <Stagger delay={80}>
            <div style={card}>
              {sectionHead('#ef4444', t('sections.lowestAccess'), () => setModal('lowest'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {lowestCountries.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '16px', color: '#374151', width: '115px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={d.val / 30 * 100} color="linear-gradient(90deg,#ef4444,#f97316)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#0f172a', width: '44px', textAlign: 'right', flexShrink: 0 }}>{d.val.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>
        </div>

        {/* ── IMPROVERS + TABLE ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Stagger delay={0}>
            <div style={card}>
              {sectionHead('#16a34a', t('sections.biggestGains'), () => setModal('improvers'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {improvers.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '16px', color: '#374151', width: '125px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={d.val / 40 * 100} color="linear-gradient(90deg,#16a34a,#0ea5e9)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#16a34a', width: '44px', textAlign: 'right', flexShrink: 0 }}>+{d.val.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>
          <Stagger delay={80}>
            <div style={card}>
              {sectionHead('#6366f1', t('sections.notableChanges'), () => setModal('changes'))}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px' }}>
                <thead>
                  <tr>
                    {[t('table.country'), t('modals.year2000'), t('modals.year2020'), t('table.delta')].map((h, i) => (
                      <th key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 400, padding: '0 0 12px', textAlign: i === 3 ? 'right' : 'left', borderBottom: '1px solid #f3f4f6' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '11px 0', color: '#111827', borderBottom: '1px solid #f9fafb' }}>{r.country}</td>
                      <td style={{ padding: '11px 0', color: '#6b7280', borderBottom: '1px solid #f9fafb', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{r.y2000.toFixed(1)}%</td>
                      <td style={{ padding: '11px 0', color: '#6b7280', borderBottom: '1px solid #f9fafb', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{r.y2020.toFixed(1)}%</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', borderBottom: '1px solid #f9fafb' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500, background: r.change >= 0 ? '#dcfce7' : '#fee2e2', color: r.change >= 0 ? '#15803d' : '#b91c1c', border: `1px solid ${r.change >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                          {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)} pp
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Stagger>
        </div>

        {/* ── URBAN vs RURAL ── */}
        <Stagger delay={0}>
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={pill('#0ea5e9')} />
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: '#6b7280', textTransform: 'uppercase' }}>
                  {t('sections.urbanRuralGap')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2563eb', display: 'inline-block' }} /> {t('sections.urban')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#16a34a', display: 'inline-block' }} /> {t('sections.rural')}
                  </span>
                </div>
                <ViewFullListBtn onClick={() => setModal('gap')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '12px' }}>
              {gapData.map((d, i) => (
                <GapColumn key={i} d={d} delay={i * 70} />
              ))}
            </div>
          </div>
        </Stagger>

        {/* ── READING THE DATA ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { icon: '↗', title: t('insights.progressTitle'), desc: t('insights.progressDesc'), accent: '#16a34a' },
            { icon: '⇅', title: t('insights.twoSpeedTitle'), desc: t('insights.twoSpeedDesc'), accent: '#ef4444' },
            { icon: '⊘', title: t('insights.ruralDeficitTitle'), desc: t('insights.ruralDeficitDesc'), accent: '#0ea5e9' },
          ].map((item, i) => (
            <Stagger key={i} delay={i * 80}>
              <div style={{ ...card, borderTop: `3px solid ${item.accent}`, height: '100%' }}>
                <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '1.6rem', color: item.accent, display: 'block', marginBottom: '12px' }}>{item.icon}</span>
                <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px', lineHeight: 1.3 }}>{item.title}</p>
                <p style={{ fontSize: '13.5px', color: '#6b7280', lineHeight: 1.75 }}>{item.desc}</p>
              </div>
            </Stagger>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ padding: '24px 64px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', color: '#9ca3af' }}>
          {t('footer.left')}
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', color: '#9ca3af' }}>
          {t('footer.right')}
        </p>
      </footer>
    </div>
  )
}