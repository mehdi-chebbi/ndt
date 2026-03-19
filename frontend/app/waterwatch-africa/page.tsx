'use client'

import { useEffect, useRef } from 'react'

export default function WaterWatchAfricaPage() {
  const trendChartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Load Chart.js dynamically
    const loadChartJS = async () => {
      const Chart = (await import('chart.js/auto')).default

      // Trend Chart
      if (trendChartRef.current) {
        const ctx = trendChartRef.current.getContext('2d')
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: ['2000', '2002', '2004', '2006', '2008', '2010', '2012', '2014', '2016', '2018', '2020'],
              datasets: [{
                data: [35.8, 36.9, 38.0, 39.1, 40.8, 43.3, 44.6, 46.3, 47.1, 48.0, 48.8],
                borderColor: '#1a6b4a',
                borderWidth: 2,
                backgroundColor: (ctx: any) => {
                  const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240)
                  g.addColorStop(0, 'rgba(26,107,74,0.18)')
                  g.addColorStop(1, 'rgba(26,107,74,0)')
                  return g
                },
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: '#1a6b4a',
                pointBorderColor: '#f5f2eb',
                pointBorderWidth: 1.5,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0e1117',
                  titleColor: '#8ec9a8',
                  bodyColor: '#f5f2eb',
                  titleFont: { family: "'DM Mono', monospace", size: 10 },
                  bodyFont: { family: "'DM Serif Display', serif", size: 18 },
                  padding: 12,
                  callbacks: { label: (ctx: any) => ctx.parsed.y.toFixed(1) + '%' }
                }
              },
              scales: {
                x: {
                  ticks: { color: '#6b7280', font: { family: "'DM Mono', monospace", size: 10 }, maxRotation: 0 },
                  grid: { color: 'rgba(0,0,0,0.04)' },
                  border: { dash: [4, 4] }
                },
                y: {
                  min: 30, max: 55,
                  ticks: { color: '#6b7280', font: { family: "'DM Mono', monospace", size: 10 }, callback: (v: any) => v + '%' },
                  grid: { color: 'rgba(0,0,0,0.04)' },
                  border: { dash: [4, 4] }
                }
              }
            }
          })
        }
      }

      // Animate bars after a short delay
      setTimeout(() => {
        // Animate lowest bars
        document.querySelectorAll('[data-lowest-target]').forEach((el: any) => {
          el.style.width = el.dataset.lowestTarget + '%'
        })
        // Animate improver bars
        document.querySelectorAll('[data-improver-target]').forEach((el: any) => {
          el.style.width = el.dataset.improverTarget + '%'
        })
        // Animate gap bars
        document.querySelectorAll('[data-gap-target]').forEach((el: any) => {
          el.style.height = el.dataset.gapTarget + 'px'
        })
      }, 100)
    }

    loadChartJS()
  }, [])

  const lowestCountries = [
    { name: 'Chad', val: 6.2 },
    { name: 'C.A.R.', val: 6.2 },
    { name: 'DR Congo', val: 11.2 },
    { name: 'Ethiopia', val: 12.0 },
    { name: 'Malawi', val: 16.4 },
    { name: 'Benin', val: 17.1 },
    { name: 'Madagascar', val: 19.8 },
  ]

  const improvers = [
    { name: 'Morocco', val: 32.6 },
    { name: 'Uganda', val: 30.0 },
    { name: 'Tanzania', val: 29.8 },
    { name: 'Zambia', val: 22.9 },
    { name: 'Sierra Leone', val: 22.5 },
    { name: 'Madagascar', val: 12.4 },
    { name: 'Lesotho', val: 18.8 },
  ]

  const tableData = [
    { country: 'Morocco', y2000: 40.7, y2020: 73.3, change: +32.6 },
    { country: 'Uganda', y2000: 26.2, y2020: 56.3, change: +30.0 },
    { country: 'Tanzania', y2000: 28.6, y2020: 58.4, change: +29.8 },
    { country: 'C.A.R.', y2000: 8.5, y2020: 6.2, change: -2.4 },
    { country: 'Comoros', y2000: 87.3, y2020: 85.5, change: -1.9 },
    { country: 'DR Congo', y2000: 12.2, y2020: 11.2, change: -1.0 },
    { country: 'Tunisia', y2000: 79.1, y2020: 93.7, change: +14.6 },
  ]

  const gapData = [
    { name: 'Gambia', urban: 66.9, rural: 9.6 },
    { name: 'Lesotho', urban: 66.3, rural: 11.7 },
    { name: 'Eswatini', urban: 77.8, rural: 23.6 },
    { name: 'Malawi', urban: 50.8, rural: 9.2 },
    { name: 'Morocco', urban: 88.3, rural: 47.0 },
    { name: 'Nigeria', urban: 45.0, rural: 9.1 },
    { name: 'Madagascar', urban: 32.7, rural: 8.9 },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f5f2eb', fontFamily: "'Instrument Sans', sans-serif" }}>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* HEADER */}
      <header className="relative overflow-hidden py-12 px-16" style={{ background: '#0e1117', color: '#f5f2eb' }}>
        <div className="absolute inset-0" style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.025) 60px, rgba(255,255,255,0.025) 61px)',
          pointerEvents: 'none'
        }}></div>
        <div className="absolute top-0 right-0 w-[220px] h-full opacity-40" style={{
          background: 'linear-gradient(180deg, #1a6b4a 0%, #0d3d2a 100%)',
          clipPath: 'polygon(40px 0, 100% 0, 100% 100%, 0 100%)'
        }}></div>
        
        <p className="relative font-mono text-xs tracking-[0.15em] mb-4 opacity-80" style={{ color: '#d4ede3', textTransform: 'uppercase' }}>
          PRAIS4 Consolidated Dataset · Africa
        </p>
        <h1 className="relative font-serif text-4xl md:text-5xl leading-tight tracking-tight max-w-[620px]" style={{ color: '#f5f2eb' }}>
          Water Access<br />Across <em style={{ color: '#8ec9a8', fontStyle: 'italic' }}>54 Nations</em>
        </h1>
        <div className="relative mt-6 flex gap-8 flex-wrap">
          {[
            { label: 'Indicator', value: 'Safely Managed Drinking Water' },
            { label: 'Period', value: '2000 – 2020' },
            { label: 'Source', value: 'PRAIS4 / AU Member States' }
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                {item.label}
              </span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-16">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px mb-12" style={{ background: '#e2ddd3', border: '1px solid #e2ddd3', borderRadius: '4px', overflow: 'hidden' }}>
          {[
            { label: 'Countries covered', value: '54', sub: 'African Union members' },
            { label: 'Continental avg, 2020', value: '48.8%', sub: 'safely managed water access', accent: true },
            { label: 'Above 50% threshold', value: '17/34', sub: 'countries with available data', blue: true },
            { label: '20-year improvement', value: '+13 pp', sub: 'average gain across continent' }
          ].map((kpi, i) => (
            <div
              key={i}
              className="relative p-6 px-7"
              style={{ background: '#f5f2eb' }}
            >
              <span className="absolute top-5 right-5 font-serif text-[2.5rem] leading-none pointer-events-none" style={{ color: '#ede9df' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="font-mono text-[10px] tracking-[0.1em] mb-3" style={{ color: '#6b7280', textTransform: 'uppercase' }}>
                {kpi.label}
              </p>
              <p className={`font-serif text-[2.25rem] leading-none mb-1 ${kpi.accent ? 'text-[#1a6b4a]' : kpi.blue ? 'text-[#1c4f8a]' : ''}`} style={{ color: '#0e1117' }}>
                {kpi.value}
              </p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        {/* TREND + BOTTOM PERFORMERS */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 mb-12">
          <div className="p-6 px-7" style={{ background: '#f5f2eb', border: '1px solid #e2ddd3', borderRadius: '4px' }}>
            <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-5" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
              Continental trend — % safely managed water
            </p>
            <div className="relative" style={{ height: '240px' }}>
              <canvas ref={trendChartRef}></canvas>
            </div>
          </div>

          <div className="p-6 px-7" style={{ background: '#f5f2eb', border: '1px solid #e2ddd3', borderRadius: '4px' }}>
            <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-5" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
              Lowest access in 2020
            </p>
            <div className="flex flex-col gap-2.5">
              {lowestCountries.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px]" style={{ color: '#6b7280', width: '16px', flexShrink: 0, textAlign: 'right' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs" style={{ color: '#3a3f4a', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ background: '#ede9df' }}>
                    <div
                      className="h-full rounded-sm transition-all duration-1000 ease-out"
                      style={{
                        width: '0%',
                        background: '#c45c1a'
                      }}
                      data-lowest-target={`${(d.val / 30 * 100).toFixed(1)}`}
                    ></div>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: '#0e1117', width: '40px', textAlign: 'right', flexShrink: 0 }}>
                    {d.val.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TOP IMPROVERS + TABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="p-6 px-7" style={{ background: '#f5f2eb', border: '1px solid #e2ddd3', borderRadius: '4px' }}>
            <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-5" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
              Biggest gains 2000 → 2020 (pp)
            </p>
            <div className="flex flex-col gap-2.5">
              {improvers.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px]" style={{ color: '#6b7280', width: '16px', flexShrink: 0, textAlign: 'right' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs" style={{ color: '#3a3f4a', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ background: '#ede9df' }}>
                    <div
                      className="h-full rounded-sm transition-all duration-1000 ease-out"
                      style={{
                        width: '0%',
                        background: '#1a6b4a'
                      }}
                      data-improver-target={`${(d.val / 40 * 100).toFixed(1)}`}
                    ></div>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: '#0e1117', width: '40px', textAlign: 'right', flexShrink: 0 }}>
                    +{d.val.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 px-7" style={{ background: '#f5f2eb', border: '1px solid #e2ddd3', borderRadius: '4px' }}>
            <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-5" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
              Notable country changes
            </p>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="font-mono text-[10px] tracking-[0.08em] pb-3 text-left" style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 400, borderBottom: '1px solid #e2ddd3' }}>
                    Country
                  </th>
                  <th className="font-mono text-[10px] tracking-[0.08em] pb-3 text-left" style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 400, borderBottom: '1px solid #e2ddd3' }}>
                    2000
                  </th>
                  <th className="font-mono text-[10px] tracking-[0.08em] pb-3 text-left" style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 400, borderBottom: '1px solid #e2ddd3' }}>
                    2020
                  </th>
                  <th className="font-mono text-[10px] tracking-[0.08em] pb-3 text-right" style={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 400, borderBottom: '1px solid #e2ddd3' }}>
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2" style={{ color: '#3a3f4a', borderBottom: '1px solid #ede9df' }}>
                      {r.country}
                    </td>
                    <td className="py-2" style={{ color: '#3a3f4a', borderBottom: '1px solid #ede9df' }}>
                      {r.y2000.toFixed(1)}%
                    </td>
                    <td className="py-2" style={{ color: '#3a3f4a', borderBottom: '1px solid #ede9df' }}>
                      {r.y2020.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right" style={{ borderBottom: '1px solid #ede9df' }}>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-mono text-[10px] font-medium ${r.change >= 0 ? 'bg-[#d4ede3] text-[#1a6b4a]' : 'bg-[#fde8df] text-[#b84a18]'}`}
                      >
                        {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)} pp
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* URBAN vs RURAL GAP */}
        <div className="mb-12">
          <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-5" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
            Urban vs rural gap — biggest disparities in 2020
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px mb-4" style={{ background: '#e2ddd3', border: '1px solid #e2ddd3', borderRadius: '4px', overflow: 'hidden' }}>
            {gapData.map((d, i) => (
              <div key={i} className="px-3 py-5 flex flex-col items-center" style={{ background: '#f5f2eb' }}>
                <p className="text-xs text-center mb-4 leading-5 min-h-[2.6em] text-xs flex items-end" style={{ color: '#6b7280' }}>
                  {d.name}
                </p>
                <div className="flex gap-1 items-end" style={{ height: '120px' }}>
                  <div
                    className="w-[18px] rounded-t-sm transition-all duration-1000 ease-out"
                    style={{
                      height: '0',
                      background: '#1c4f8a'
                    }}
                    data-gap-target={`${(d.urban / 100 * 120).toFixed(0)}`}
                  ></div>
                  <div
                    className="w-[18px] rounded-t-sm transition-all duration-1000 ease-out"
                    style={{
                      height: '0',
                      background: '#1a6b4a'
                    }}
                    data-gap-target={`${(d.rural / 100 * 120).toFixed(0)}`}
                  ></div>
                </div>
                <p className="font-mono text-[10px] mt-1.5 flex gap-1.5">
                  <span style={{ color: '#1c4f8a' }}>{d.urban.toFixed(0)}%</span>
                  <span style={{ color: '#1a6b4a' }}>{d.rural.toFixed(0)}%</span>
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-4 text-sm justify-end" style={{ color: '#6b7280' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ color: '#1c4f8a', background: '#1c4f8a' }}></span>
              Urban
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ color: '#1a6b4a', background: '#1a6b4a' }}></span>
              Rural
            </span>
          </div>
        </div>

        {/* READING THE DATA */}
        <div className="p-6 px-7 mb-12" style={{ background: '#f5f2eb', border: '1px solid #e2ddd3', borderRadius: '4px' }}>
          <p className="font-mono text-[10px] tracking-[0.14em] pl-2.5 mb-2" style={{ color: '#6b7280', textTransform: 'uppercase', borderLeft: '2px solid #1a6b4a' }}>
            Reading the data
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-2">
            {[
              {
                title: 'Steady continental progress',
                desc: 'The continental average climbed from 35.8% in 2000 to 48.8% in 2020 — meaningful progress, though the continent as a whole remains just below the 50% mark for safely managed access.'
              },
              {
                title: 'A widening two-speed story',
                desc: 'Morocco, Uganda, and Tanzania each gained 30+ percentage points, while Central African Republic and DR Congo moved backward. The gap between leaders and laggards has grown wider over two decades.'
              },
              {
                title: 'The persistent rural deficit',
                desc: 'In Gambia, Lesotho, and Eswatini, the urban-rural gap exceeds 50 percentage points. Urban populations are often 3–5× more likely to have safely managed water than rural counterparts in the same country.'
              }
            ].map((item, i) => (
              <div key={i}>
                <p className="font-serif text-lg mb-2" style={{ color: '#0e1117' }}>
                  {item.title}
                </p>
                <p className="text-sm leading-7" style={{ color: '#6b7280' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 px-16 flex justify-between items-center" style={{ borderTop: '1px solid #e2ddd3' }}>
        <p className="font-mono text-[10px] tracking-[0.06em]" style={{ color: '#6b7280' }}>
          PRAIS4 Consolidated · Population using safely managed drinking water services
        </p>
        <p className="font-mono text-[10px] tracking-[0.06em]" style={{ color: '#6b7280' }}>
          Data: World Bank / AU / JMP · 2000–2020
        </p>
      </footer>
    </div>
  )
}
