'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/* ─── tiny hook ─── */
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
function Counter({ target, suffix = '', decimals = 1, duration = 1800 }: {
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

/* ─── animated bar ─── */
function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const { ref, visible } = useInView(0.1)
  return (
    <div ref={ref} style={{ flex: 1, height: '3px', borderRadius: '9999px', overflow: 'hidden', background: '#e5e7eb' }}>
      <div style={{
        height: '100%', background: color,
        width: visible ? `${pct}%` : '0%',
        transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        borderRadius: '9999px',
      }} />
    </div>
  )
}

/* ─── stagger wrapper ─── */
function Stagger({ children, delay = 0, style }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const { ref, visible } = useInView(0.05)
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ─── modal ─── */
function Modal({ open, onClose, title, accentColor, children }: {
  open: boolean; onClose: () => void; title: string; accentColor: string; children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', width: '100%', maxWidth: '620px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f3f4f6', borderTop: `3px solid ${accentColor}`, flexShrink: 0 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b7280' }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', padding: '4px 8px', borderRadius: '4px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── view full list button ─── */
function ViewFullListBtn({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('giniwatch')
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#f9fafb' : 'transparent', border: '0.5px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.08em', color: hover ? '#374151' : '#9ca3af', transition: 'all 0.15s', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {t('viewFullList')}
    </button>
  )
}

const NA = () => { const { t } = useTranslation('giniwatch'); return <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{t('na')}</span> }

/* ─── gini color: green (low inequality) → red (high) ─── */
function giniColor(v: number): string {
  if (v < 35) return '#16a34a'
  if (v < 45) return '#f97316'
  return '#ef4444'
}

// ── RAW DATA ──────────────────────────────────────────────────────────────────
// Each entry: { name, readings: [{year, val}] }
// "latest" = most recent reading; "earliest" = first reading available
type Reading = { year: number; val: number }
type Country = { name: string; readings: Reading[] }

const RAW: Country[] = [
  { name: 'Algeria', readings: [{ year: 2011, val: 27.6 }] },
  { name: 'Angola', readings: [{ year: 2000, val: 51.9 }, { year: 2008, val: 42.7 }, { year: 2018, val: 51.3 }] },
  // +2021 reading
  { name: 'Benin', readings: [{ year: 2003, val: 38.6 }, { year: 2011, val: 43.4 }, { year: 2015, val: 47.6 }, { year: 2018, val: 37.9 }, { year: 2021, val: 34.4 }] },
  { name: 'Botswana', readings: [{ year: 2002, val: 61.5 }, { year: 2009, val: 56.9 }, { year: 2015, val: 54.9 }] },
  // +2021 reading
  { name: 'Burkina Faso', readings: [{ year: 2003, val: 43.3 }, { year: 2009, val: 39.8 }, { year: 2014, val: 35.3 }, { year: 2018, val: 43.0 }, { year: 2021, val: 37.4 }] },
  { name: 'Burundi', readings: [{ year: 2006, val: 33.4 }, { year: 2013, val: 38.6 }, { year: 2020, val: 37.5 }] },
  { name: 'Cabo Verde', readings: [{ year: 2001, val: 52.5 }, { year: 2007, val: 47.2 }, { year: 2015, val: 42.4 }] },
  // +2021 reading
  { name: 'Cameroon', readings: [{ year: 2001, val: 42.1 }, { year: 2007, val: 42.8 }, { year: 2014, val: 46.6 }, { year: 2021, val: 42.2 }] },
  // +2021 reading
  { name: 'Central African Rep.', readings: [{ year: 2008, val: 56.2 }, { year: 2021, val: 43.0 }] },
  // +2023 reading
  { name: 'Chad', readings: [{ year: 2003, val: 39.8 }, { year: 2011, val: 43.3 }, { year: 2019, val: 37.5 }, { year: 2023, val: 37.4 }] },
  { name: 'Comoros', readings: [{ year: 2004, val: 55.9 }, { year: 2014, val: 45.3 }] },
  { name: 'Congo, Dem. Rep.', readings: [{ year: 2004, val: 41.6 }, { year: 2012, val: 42.1 }, { year: 2020, val: 44.7 }] },
  { name: 'Congo, Rep.', readings: [{ year: 2005, val: 47.3 }, { year: 2011, val: 48.9 }] },
  // +2021 reading
  { name: "Cote d'Ivoire", readings: [{ year: 2002, val: 41.3 }, { year: 2008, val: 43.2 }, { year: 2015, val: 41.5 }, { year: 2018, val: 37.2 }, { year: 2021, val: 35.3 }] },
  { name: 'Djibouti', readings: [{ year: 2002, val: 40.0 }, { year: 2013, val: 45.1 }, { year: 2014, val: 44.1 }, { year: 2017, val: 41.6 }] },
  // +2021 reading
  { name: 'Egypt', readings: [{ year: 2004, val: 31.8 }, { year: 2008, val: 31.1 }, { year: 2010, val: 30.2 }, { year: 2012, val: 28.3 }, { year: 2015, val: 31.8 }, { year: 2017, val: 31.5 }, { year: 2019, val: 31.9 }, { year: 2021, val: 28.5 }] },
  { name: 'Equatorial Guinea', readings: [{ year: 2022, val: 38.5 }] },
  { name: 'Eswatini', readings: [{ year: 2000, val: 53.1 }, { year: 2010, val: 51.4 }, { year: 2016, val: 54.6 }] },
  // +2021 reading
  { name: 'Ethiopia', readings: [{ year: 2004, val: 29.8 }, { year: 2010, val: 33.2 }, { year: 2015, val: 35.0 }, { year: 2021, val: 31.1 }] },
  { name: 'Gabon', readings: [{ year: 2005, val: 42.2 }, { year: 2017, val: 38.0 }] },
  { name: 'Gambia', readings: [{ year: 2003, val: 47.3 }, { year: 2010, val: 43.6 }, { year: 2015, val: 35.9 }, { year: 2020, val: 38.8 }] },
  { name: 'Ghana', readings: [{ year: 2005, val: 42.8 }, { year: 2012, val: 42.4 }, { year: 2016, val: 43.5 }] },
  { name: 'Guinea', readings: [{ year: 2002, val: 43.0 }, { year: 2007, val: 39.4 }, { year: 2012, val: 33.7 }, { year: 2018, val: 29.6 }] },
  // +2021 reading
  { name: 'Guinea-Bissau', readings: [{ year: 2002, val: 35.6 }, { year: 2010, val: 50.6 }, { year: 2018, val: 34.8 }, { year: 2021, val: 33.4 }] },
  // +2021, 2022 readings
  { name: 'Kenya', readings: [{ year: 2005, val: 46.4 }, { year: 2015, val: 40.8 }, { year: 2020, val: 36.2 }, { year: 2021, val: 38.7 }, { year: 2022, val: 37.7 }] },
  { name: 'Lesotho', readings: [{ year: 2002, val: 51.2 }, { year: 2017, val: 44.9 }] },
  { name: 'Liberia', readings: [{ year: 2007, val: 36.4 }, { year: 2014, val: 33.2 }, { year: 2016, val: 35.3 }] },
  // +2021 reading
  { name: 'Madagascar', readings: [{ year: 2001, val: 47.4 }, { year: 2005, val: 39.9 }, { year: 2010, val: 42.4 }, { year: 2012, val: 42.6 }, { year: 2021, val: 36.8 }] },
  { name: 'Malawi', readings: [{ year: 2004, val: 39.9 }, { year: 2010, val: 45.5 }, { year: 2016, val: 44.7 }, { year: 2019, val: 38.5 }] },
  // +2021 reading
  { name: 'Mali', readings: [{ year: 2001, val: 39.9 }, { year: 2006, val: 38.9 }, { year: 2009, val: 33.0 }, { year: 2018, val: 36.0 }, { year: 2021, val: 35.7 }] },
  { name: 'Mauritania', readings: [{ year: 2000, val: 39.0 }, { year: 2004, val: 40.2 }, { year: 2008, val: 35.7 }, { year: 2014, val: 32.6 }, { year: 2019, val: 32.0 }] },
  { name: 'Mauritius', readings: [{ year: 2006, val: 35.7 }, { year: 2012, val: 38.5 }, { year: 2017, val: 36.8 }] },
  { name: 'Morocco', readings: [{ year: 2000, val: 40.6 }, { year: 2006, val: 40.7 }, { year: 2013, val: 39.5 }] },
  // +2022 reading
  { name: 'Mozambique', readings: [{ year: 2002, val: 46.9 }, { year: 2008, val: 45.5 }, { year: 2014, val: 54.0 }, { year: 2019, val: 50.7 }, { year: 2022, val: 49.6 }] },
  { name: 'Namibia', readings: [{ year: 2003, val: 63.3 }, { year: 2009, val: 61.0 }, { year: 2015, val: 59.1 }] },
  // +2021 reading
  { name: 'Niger', readings: [{ year: 2005, val: 44.4 }, { year: 2007, val: 37.3 }, { year: 2011, val: 31.5 }, { year: 2014, val: 34.3 }, { year: 2018, val: 37.3 }, { year: 2021, val: 32.9 }] },
  // +2022 reading
  { name: 'Nigeria', readings: [{ year: 2003, val: 40.1 }, { year: 2009, val: 35.7 }, { year: 2011, val: 35.5 }, { year: 2015, val: 35.9 }, { year: 2018, val: 35.1 }, { year: 2022, val: 33.9 }] },
  // +2023 reading
  { name: 'Rwanda', readings: [{ year: 2000, val: 48.5 }, { year: 2005, val: 52.0 }, { year: 2010, val: 47.2 }, { year: 2013, val: 45.1 }, { year: 2016, val: 43.7 }, { year: 2023, val: 39.4 }] },
  { name: 'Sao Tome & Pr.', readings: [{ year: 2000, val: 32.1 }, { year: 2010, val: 30.8 }, { year: 2017, val: 40.7 }] },
  // +2021 reading
  { name: 'Senegal', readings: [{ year: 2001, val: 41.2 }, { year: 2005, val: 39.2 }, { year: 2011, val: 40.3 }, { year: 2018, val: 38.3 }, { year: 2021, val: 36.2 }] },
  { name: 'Seychelles', readings: [{ year: 2006, val: 42.8 }, { year: 2013, val: 46.8 }, { year: 2018, val: 32.1 }] },
  { name: 'Sierra Leone', readings: [{ year: 2003, val: 40.2 }, { year: 2011, val: 34.0 }, { year: 2018, val: 35.7 }] },
  { name: 'South Africa', readings: [{ year: 2000, val: 57.8 }, { year: 2005, val: 64.8 }, { year: 2008, val: 63.0 }, { year: 2010, val: 63.4 }, { year: 2014, val: 63.0 }] },
  { name: 'South Sudan', readings: [{ year: 2009, val: 46.3 }, { year: 2016, val: 44.0 }] },
  { name: 'Sudan', readings: [{ year: 2009, val: 35.4 }, { year: 2014, val: 34.2 }] },
  { name: 'Tanzania', readings: [{ year: 2000, val: 37.3 }, { year: 2007, val: 40.3 }, { year: 2011, val: 37.8 }, { year: 2019, val: 40.5 }] },
  // +2021 reading
  { name: 'Togo', readings: [{ year: 2006, val: 42.2 }, { year: 2011, val: 46.0 }, { year: 2015, val: 43.0 }, { year: 2018, val: 42.5 }, { year: 2021, val: 37.9 }] },
  // +2021 reading
  { name: 'Tunisia', readings: [{ year: 2000, val: 40.8 }, { year: 2005, val: 37.7 }, { year: 2010, val: 38.5 }, { year: 2015, val: 32.8 }, { year: 2021, val: 33.7 }] },
  { name: 'Uganda', readings: [{ year: 2002, val: 45.2 }, { year: 2005, val: 42.9 }, { year: 2009, val: 44.2 }, { year: 2012, val: 41.0 }, { year: 2016, val: 42.8 }, { year: 2019, val: 42.7 }] },
  // +2022 reading
  { name: 'Zambia', readings: [{ year: 2002, val: 42.1 }, { year: 2004, val: 54.3 }, { year: 2006, val: 54.6 }, { year: 2010, val: 52.0 }, { year: 2015, val: 55.8 }, { year: 2022, val: 51.5 }] },
  { name: 'Zimbabwe', readings: [{ year: 2011, val: 43.2 }, { year: 2017, val: 44.3 }, { year: 2019, val: 50.3 }] },
]

// Equatorial Guinea now has a 2022 reading — removed from NO_DATA
const NO_DATA = ['Eritrea', 'Libya', 'Somalia']

// helpers
function latest(c: Country): Reading | null {
  if (!c.readings.length) return null
  return c.readings.reduce((a, b) => b.year > a.year ? b : a)
}
function earliest(c: Country): Reading | null {
  if (!c.readings.length) return null
  return c.readings.reduce((a, b) => b.year < a.year ? b : a)
}
function change(c: Country): number | null {
  if (c.readings.length < 2) return null
  const e = earliest(c)!
  const l = latest(c)!
  return parseFloat((l.val - e.val).toFixed(1))
}

const withData = RAW.filter(c => c.readings.length > 0)
const latestVals = withData.map(c => ({ name: c.name, val: latest(c)!.val, year: latest(c)!.year }))
latestVals.sort((a, b) => b.val - a.val)

export default function GiniAfricaPage() {
  const { t } = useTranslation('giniwatch')
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const [modal, setModal] = useState<null | 'highest' | 'lowest' | 'worsened' | 'improved' | 'changes'>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // scatter-style chart: one dot per country per reading, connected if same country
  useEffect(() => {
    let chartInstance: any = null
    const load = async () => {
      const Chart = (await import('chart.js/auto')).default
      if (!trendChartRef.current) return
      const ctx = trendChartRef.current.getContext('2d')
      if (!ctx) return

      // continental average per available year (group by year, avg)
      const byYear: Record<number, number[]> = {}
      RAW.forEach(c => c.readings.forEach(r => {
        if (!byYear[r.year]) byYear[r.year] = []
        byYear[r.year].push(r.val)
      }))
      const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)
      const avgs = years.map(y => parseFloat((byYear[y].reduce((s, v) => s + v, 0) / byYear[y].length).toFixed(1)))

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: years.map(String),
          datasets: [{
            label: t('chart.continentalAvg'),
            data: avgs,
            borderColor: '#7c3aed',
            borderWidth: 2.5,
            backgroundColor: (c: any) => {
              const g = c.chart.ctx.createLinearGradient(0, 0, 0, 220)
              g.addColorStop(0, 'rgba(124,58,237,0.10)')
              g.addColorStop(1, 'rgba(124,58,237,0)')
              return g
            },
            tension: 0.4, fill: true,
            pointRadius: 4, pointBackgroundColor: '#7c3aed',
            pointBorderColor: '#ffffff', pointBorderWidth: 2, pointHoverRadius: 6,
          }]
        },
        options: {
          animation: { duration: 1600, easing: 'easeOutQuart' },
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2937', borderColor: 'rgba(124,58,237,0.4)', borderWidth: 1,
              titleColor: '#a78bfa', bodyColor: '#f9fafb',
              titleFont: { family: "'JetBrains Mono', monospace", size: 10 },
              bodyFont: { size: 16 }, padding: 14,
              callbacks: { label: (c: any) => t('chart.avgGiniTooltip', { value: c.parsed.y.toFixed(1) }) }
            }
          },
          scales: {
            x: {
              ticks: { color: '#9ca3af', font: { family: "'JetBrains Mono', monospace", size: 10 }, maxRotation: 45 },
              grid: { color: 'rgba(0,0,0,0.04)' }, border: { dash: [3, 5], color: 'transparent' }
            },
            y: {
              min: 28, max: 58,
              ticks: { color: '#9ca3af', font: { family: "'JetBrains Mono', monospace", size: 11 }, callback: (v: any) => v },
              grid: { color: 'rgba(0,0,0,0.04)' }, border: { dash: [3, 5], color: 'transparent' }
            }
          }
        }
      })
    }
    load()
    return () => { if (chartInstance) chartInstance.destroy() }
  }, [])

  // ── derived lists ──────────────────────────────────────────────────────────

  // most unequal (highest latest gini)
  const mostUnequal = [...latestVals].sort((a, b) => b.val - a.val).slice(0, 7)

  // most equal (lowest latest gini)
  const mostEqual = [...latestVals].sort((a, b) => a.val - b.val).slice(0, 7)

  // biggest worseners (positive change = inequality rose)
  const changers = withData
    .filter(c => change(c) !== null)
    .map(c => ({ name: c.name, change: change(c)!, earliest: earliest(c)!, latest: latest(c)! }))

  const worsened = [...changers].sort((a, b) => b.change - a.change).slice(0, 7)
  const improved = [...changers].sort((a, b) => a.change - b.change).slice(0, 7)

  // notable snapshot table
  const notableTable = [
    { country: 'South Africa', val: 63.0, year: 2014, note: t('notableNotes.highestSustained') },
    { country: 'Namibia', val: 59.1, year: 2015, note: t('notableNotes.improvedButHigh') },
    { country: 'Egypt', val: 28.5, year: 2021, note: t('notableNotes.consistentlyLow') },
    { country: 'Algeria', val: 27.6, year: 2011, note: t('notableNotes.onlyOneReading') },
    { country: 'Guinea', val: 29.6, year: 2018, note: t('notableNotes.steadyDecline') }
  ]

  // full list for modals
  const allRanked = [
    ...latestVals.map(r => ({ name: r.name, latestVal: r.val, latestYear: r.year, earliestVal: earliest(RAW.find(c => c.name === r.name)!)?.val ?? null, earliestYear: earliest(RAW.find(c => c.name === r.name)!)?.year ?? null, chg: change(RAW.find(c => c.name === r.name)!) })),
    ...NO_DATA.map(name => ({ name, latestVal: null as number | null, latestYear: null as number | null, earliestVal: null as number | null, earliestYear: null as number | null, chg: null as number | null })),
  ]

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const latestValsList = latestVals.map(x => x.val)
  const avgGini = parseFloat((latestValsList.reduce((s, v) => s + v, 0) / latestValsList.length).toFixed(1))
  const above50Count = latestValsList.filter(v => v >= 50).length
  const improvedCount = changers.filter(c => c.change < 0).length

  // ── styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '28px' }
  const pill = (color: string): React.CSSProperties => ({ width: '3px', height: '14px', background: color, borderRadius: '9999px', flexShrink: 0 })

  const sectionHead = (color: string, label: string, onViewAll?: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={pill(color)} />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', color: '#6b7280', textTransform: 'uppercase' as const }}>{label}</p>
      </div>
      {onViewAll && <ViewFullListBtn onClick={onViewAll} />}
    </div>
  )

  const mHead = (cols: string[], template: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: template, padding: '8px 24px', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
      {cols.map((h, i) => (
        <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
      ))}
    </div>
  )

  const kpis = [
    { label: t('kpis.countriesWithData'), value: withData.length, suffix: '', decimals: 0, sub: t('kpis.countriesWithDataSub', { total: withData.length + NO_DATA.length }), accent: false, display: null as string | null },
    { label: t('kpis.avgGiniIndex'), value: avgGini, suffix: '', decimals: 1, sub: t('kpis.avgGiniIndexSub'), accent: true, display: null as string | null },
    { label: t('kpis.highlyUnequal'), value: null as number | null, suffix: '', decimals: 0, sub: t('kpis.highlyUnequalSub'), accent: false, display: `${above50Count}/${withData.length}` },
    { label: t('kpis.inequalityImproved'), value: null as number | null, suffix: '', decimals: 0, sub: t('kpis.inequalityImprovedSub'), accent: false, display: `${improvedCount}/${changers.length}` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Instrument Sans', sans-serif", color: '#111827' }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet" />

      {/* ── MODAL: Most unequal ─── */}
      <Modal open={modal === 'highest'} onClose={() => setModal(null)} title={t('modals.highestTitle')} accentColor="#ef4444">
        {mHead([t('tableHeaders.rank'), t('tableHeaders.country'), t('tableHeaders.year'), t('tableHeaders.gini')], '28px 1fr 56px 72px')}
        {[...allRanked].sort((a, b) => {
          if (a.latestVal === null && b.latestVal === null) return 0
          if (a.latestVal === null) return 1
          if (b.latestVal === null) return -1
          return b.latestVal - a.latestVal
        }).map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 72px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.latestVal !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{r.latestYear ?? <NA />}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textAlign: 'right', color: r.latestVal !== null ? giniColor(r.latestVal) : '#d1d5db', fontWeight: 500 }}>
              {r.latestVal !== null ? r.latestVal.toFixed(1) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Most equal ─── */}
      <Modal open={modal === 'lowest'} onClose={() => setModal(null)} title={t('modals.lowestTitle')} accentColor="#16a34a">
        {mHead([t('tableHeaders.rank'), t('tableHeaders.country'), t('tableHeaders.year'), t('tableHeaders.gini')], '28px 1fr 56px 72px')}
        {[...allRanked].sort((a, b) => {
          if (a.latestVal === null && b.latestVal === null) return 0
          if (a.latestVal === null) return 1
          if (b.latestVal === null) return -1
          return a.latestVal - b.latestVal
        }).map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 72px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.latestVal !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{r.latestYear ?? <NA />}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textAlign: 'right', color: r.latestVal !== null ? giniColor(r.latestVal) : '#d1d5db', fontWeight: 500 }}>
              {r.latestVal !== null ? r.latestVal.toFixed(1) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Worsened ─── */}
      <Modal open={modal === 'worsened'} onClose={() => setModal(null)} title={t('modals.worsenedTitle')} accentColor="#ef4444">
        {mHead([t('tableHeaders.rank'), t('tableHeaders.country'), t('tableHeaders.first'), t('tableHeaders.latest'), t('tableHeaders.delta')], '28px 1fr 72px 72px 76px')}
        {[...allRanked].sort((a, b) => {
          if (a.chg === null && b.chg === null) return 0
          if (a.chg === null) return 1
          if (b.chg === null) return -1
          return b.chg - a.chg
        }).map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px 76px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.chg !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
              {r.earliestVal !== null ? `${r.earliestVal.toFixed(1)} '${String(r.earliestYear).slice(2)}` : <NA />}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
              {r.latestVal !== null ? `${r.latestVal.toFixed(1)} '${String(r.latestYear).slice(2)}` : <NA />}
            </span>
            <span style={{ textAlign: 'right' }}>
              {r.chg !== null ? (
                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, background: r.chg > 0 ? '#fee2e2' : '#dcfce7', color: r.chg > 0 ? '#b91c1c' : '#15803d', border: `1px solid ${r.chg > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                  {r.chg > 0 ? '+' : ''}{r.chg.toFixed(1)}
                </span>
              ) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Improved ─── */}
      <Modal open={modal === 'improved'} onClose={() => setModal(null)} title={t('modals.improvedTitle')} accentColor="#16a34a">
        {mHead([t('tableHeaders.rank'), t('tableHeaders.country'), t('tableHeaders.first'), t('tableHeaders.latest'), t('tableHeaders.delta')], '28px 1fr 72px 72px 76px')}
        {[...allRanked].sort((a, b) => {
          if (a.chg === null && b.chg === null) return 0
          if (a.chg === null) return 1
          if (b.chg === null) return -1
          return a.chg - b.chg
        }).map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 72px 76px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.chg !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
              {r.earliestVal !== null ? `${r.earliestVal.toFixed(1)} '${String(r.earliestYear).slice(2)}` : <NA />}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
              {r.latestVal !== null ? `${r.latestVal.toFixed(1)} '${String(r.latestYear).slice(2)}` : <NA />}
            </span>
            <span style={{ textAlign: 'right' }}>
              {r.chg !== null ? (
                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, background: r.chg > 0 ? '#fee2e2' : '#dcfce7', color: r.chg > 0 ? '#b91c1c' : '#15803d', border: `1px solid ${r.chg > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                  {r.chg > 0 ? '+' : ''}{r.chg.toFixed(1)}
                </span>
              ) : <NA />}
            </span>
          </div>
        ))}
      </Modal>

      {/* ── MODAL: Notable changes ─── */}
      <Modal open={modal === 'changes'} onClose={() => setModal(null)} title={t('modals.changesTitle')} accentColor="#6366f1">
        {mHead([t('tableHeaders.rank'), t('tableHeaders.country'), t('tableHeaders.readings'), t('tableHeaders.latest'), t('tableHeaders.delta')], '28px 1fr 56px 68px 76px')}
        {[...allRanked].sort((a, b) => {
          if (a.latestVal === null && b.latestVal === null) return 0
          if (a.latestVal === null) return 1
          if (b.latestVal === null) return -1
          return b.latestVal - a.latestVal
        }).map((r, i) => {
          const country = RAW.find(c => c.name === r.name)
          const readingCount = country ? country.readings.length : 0
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 56px 68px 76px', padding: '10px 24px', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db' }}>{r.latestVal !== null ? String(i + 1).padStart(2, '0') : '—'}</span>
              <span style={{ fontSize: '13px', color: '#374151' }}>{r.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>{readingCount > 0 ? readingCount : <NA />}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textAlign: 'right', color: r.latestVal !== null ? giniColor(r.latestVal) : '#d1d5db', fontWeight: 500 }}>
                {r.latestVal !== null ? `${r.latestVal.toFixed(1)} '${String(r.latestYear).slice(2)}` : <NA />}
              </span>
              <span style={{ textAlign: 'right' }}>
                {r.chg !== null ? (
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, background: r.chg > 0 ? '#fee2e2' : '#dcfce7', color: r.chg > 0 ? '#b91c1c' : '#15803d', border: `1px solid ${r.chg > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                    {r.chg > 0 ? '+' : ''}{r.chg.toFixed(1)}
                  </span>
                ) : <NA />}
              </span>
            </div>
          )
        })}
      </Modal>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', overflow: 'hidden', padding: '64px 64px 56px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(90deg,transparent,transparent 80px,rgba(0,0,0,0.018) 80px,rgba(0,0,0,0.018) 81px)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg,#7c3aed,rgba(124,58,237,0.1))' }} />
        <div style={{ position: 'absolute', top: '-80px', right: '160px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)', transform: `translateY(${scrollY * 0.12}px)`, pointerEvents: 'none' }} />
        <Stagger delay={0}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', color: '#7c3aed', marginBottom: '20px', textTransform: 'uppercase' }}>
            {t('header.subtitle')}
          </p>
        </Stagger>
        <Stagger delay={70}>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 'clamp(2.8rem,5.5vw,5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
            {t('header.title')}
          </h1>
        </Stagger>
        <Stagger delay={140}>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 'clamp(2.8rem,5.5vw,5rem)', lineHeight: 0.92, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: '40px' }}>
            <em style={{ color: '#7c3aed', fontStyle: 'italic' }}>{t('header.titleItalic')}</em>
          </h1>
        </Stagger>
        <Stagger delay={220}>
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { label: t('header.metaIndicator'), value: t('header.metaIndicatorValue') },
              { label: t('header.metaPeriod'), value: t('header.metaPeriodValue') },
              { label: t('header.metaSource'), value: t('header.metaSourceValue') },
              { label: t('header.metaNote'), value: t('header.metaNoteValue') },
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
                {kpi.accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#7c3aed,transparent)' }} />}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.14em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '14px' }}>{kpi.label}</p>
                <p style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '3rem', lineHeight: 1, fontWeight: 600, marginBottom: '8px', color: kpi.accent ? '#7c3aed' : '#0f172a' }}>
                  {kpi.display ? kpi.display : <Counter target={kpi.value as number} suffix={kpi.suffix} decimals={kpi.decimals} />}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{kpi.sub}</p>
              </div>
            </Stagger>
          ))}
        </div>

        {/* ── TREND + MOST UNEQUAL ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <Stagger delay={0}>
            <div style={card}>
              {sectionHead('#7c3aed', t('sections.continentalAvg'))}
              <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                {t('sections.continentalAvgDesc')}
              </p>
              <div style={{ height: '200px', position: 'relative' }}><canvas ref={trendChartRef} /></div>
            </div>
          </Stagger>
          <Stagger delay={80}>
            <div style={card}>
              {sectionHead('#ef4444', t('sections.mostUnequal'), () => setModal('highest'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {mostUnequal.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '14px', color: '#374151', width: '120px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={(d.val - 40) / 30 * 100} color="linear-gradient(90deg,#ef4444,#f97316)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#0f172a', width: '36px', textAlign: 'right', flexShrink: 0 }}>{d.val.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>
        </div>

        {/* ── MOST EQUAL + WORSENED ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Stagger delay={0}>
            <div style={card}>
              {sectionHead('#16a34a', t('sections.mostEqual'), () => setModal('lowest'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {mostEqual.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '14px', color: '#374151', width: '120px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={d.val / 50 * 100} color="linear-gradient(90deg,#16a34a,#0ea5e9)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#16a34a', width: '36px', textAlign: 'right', flexShrink: 0 }}>{d.val.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          <Stagger delay={80}>
            <div style={card}>
              {sectionHead('#ef4444', t('sections.worsenedMost'), () => setModal('worsened'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {worsened.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '14px', color: '#374151', width: '120px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={Math.min(d.change / 20 * 100, 100)} color="linear-gradient(90deg,#ef4444,#f97316)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#ef4444', width: '44px', textAlign: 'right', flexShrink: 0 }}>+{d.change.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>
        </div>

        {/* ── IMPROVED + NOTABLE TABLE ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Stagger delay={0}>
            <div style={card}>
              {sectionHead('#16a34a', t('sections.improvedMost'), () => setModal('improved'))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {improved.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#d1d5db', width: '20px', textAlign: 'right', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: '14px', color: '#374151', width: '120px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <Bar pct={Math.min(Math.abs(d.change) / 20 * 100, 100)} color="linear-gradient(90deg,#16a34a,#0ea5e9)" delay={i * 60} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#16a34a', width: '44px', textAlign: 'right', flexShrink: 0 }}>{d.change.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Stagger>

          <Stagger delay={80}>
            <div style={card}>
              {sectionHead('#6366f1', t('sections.notableSnapshots'), () => setModal('changes'))}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {[t('tableHeaders.country'), t('tableHeaders.gini'), t('tableHeaders.year'), t('tableHeaders.note')].map((h, i) => (
                      <th key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 400, padding: '0 0 12px', textAlign: 'left', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notableTable.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 0', color: '#111827', borderBottom: '1px solid #f9fafb', fontSize: '13px' }}>{r.country}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #f9fafb', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500, color: giniColor(r.val) }}>{r.val.toFixed(1)}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #f9fafb', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#9ca3af' }}>{r.year}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #f9fafb', fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Stagger>
        </div>

        {/* ── DATA COVERAGE ── */}
        <Stagger delay={0}>
          <div style={{ ...card, marginBottom: '16px' }}>
            {sectionHead('#9ca3af', t('sections.dataCoverage'))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              {[...RAW].sort((a, b) => b.readings.length - a.readings.length).map((c, i) => {
                const n = c.readings.length
                const barColor = n === 0 ? '#e5e7eb' : n <= 2 ? '#fde68a' : n <= 4 ? '#6ee7b7' : '#7c3aed'
                const textColor = n === 0 ? '#d1d5db' : n <= 2 ? '#92400e' : n <= 4 ? '#065f46' : '#5b21b6'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: '#fafafa', borderRadius: '6px', border: '0.5px solid #f3f4f6' }}>
                    <div style={{ width: `${Math.max(n * 8, 4)}px`, height: '6px', background: barColor, borderRadius: '3px', flexShrink: 0, minWidth: '4px', maxWidth: '40px' }} />
                    <span style={{ fontSize: '12px', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: textColor, fontWeight: 500, flexShrink: 0 }}>{n}</span>
                  </div>
                )
              })}
              {NO_DATA.map((name, i) => (
                <div key={`nd-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: '#fafafa', borderRadius: '6px', border: '0.5px solid #f3f4f6' }}>
                  <div style={{ width: '4px', height: '6px', background: '#e5e7eb', borderRadius: '3px', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#d1d5db', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#d1d5db', flexShrink: 0 }}>0</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
              {[
                { color: '#e5e7eb', textColor: '#6b7280', label: t('dataCoverage.legend0') },
                { color: '#fde68a', textColor: '#92400e', label: t('dataCoverage.legend12') },
                { color: '#6ee7b7', textColor: '#065f46', label: t('dataCoverage.legend34') },
                { color: '#7c3aed', textColor: '#5b21b6', label: t('dataCoverage.legend5plus') },
              ].map((l, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: l.textColor }}>
                  <span style={{ width: '10px', height: '6px', background: l.color, borderRadius: '2px', display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </Stagger>

        {/* ── INSIGHT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { icon: '◎', title: t('insights.southernAfricaTitle'), desc: t('insights.southernAfricaDesc'), accent: '#ef4444' },
            { icon: '↘', title: t('insights.northAfricaTitle'), desc: t('insights.northAfricaDesc'), accent: '#16a34a' },
            { icon: '⚠', title: t('insights.sparseDataTitle'), desc: t('insights.sparseDataDesc'), accent: '#f97316' },
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