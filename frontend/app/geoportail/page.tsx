'use client'

import Link from 'next/link'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

export default function GeoportailPage() {
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white" style={serif}>
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
          position: 'absolute', top: '5%', left: '10%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '8%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '25%',
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="pt-20 pb-24 lg:pt-28 lg:pb-32">

          {/* ── Hero Section ──────────────────────────────────────── */}
          <div className="mb-20">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
                Land degradation maps and geospatial data in Africa
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-5xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              Geoportal
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-6 leading-relaxed" style={sans}>
              Explore interactive maps and geospatial datasets on land degradation in Africa. Access spatial indicators, statistics, and tools to analyse environmental trends and support decision-making.
            </p>

            <p className="text-base text-green-400/90 font-medium" style={{ ...sans, letterSpacing: '0.02em' }}>
              Explore maps. Visualize data. Discover insights.
            </p>
          </div>

          {/* ── About the Geoportal ──────────────────────────────── */}
          <div className="mb-20">
            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                The Geoportal provides access to geospatial data on land and environment in Africa, enabling users to visualize, analyse, and download spatial datasets across the continent.
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                By integrating EO-based environmental indicators and national datasets, the Geoportal offers resources aligned with the UNCCD&apos;s four Strategic Objectives (SOs), supporting a comprehensive understanding of land degradation dynamics.
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-8" style={sans}>
                It supports evidence-based analysis and decision-making for sustainable land management at both continental and country levels.
              </p>

              {/* Image placeholder under text */}
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Geoportal's Key features and capabilities ────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              Geoportal&apos;s Key features and capabilities
            </h2>

            <div className="max-w-4xl">
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Land use and land cover, highlighting ecosystems and land dynamics.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Interactive land degradation maps, highlighting SDG indicator 15.3.1.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Environmental indicators, covering the UNCCD strategic objectives.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Vegetation, land, and climate monitoring layers.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Downloadable geospatial datasets across countries and regions in formats compatible with GIS tools.
                </li>
              </ul>
            </div>
          </div>

          {/* ── What you can do with the geoportal ────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              What you can do with the geoportal
            </h2>

            {/* Image placeholder under the title */}
            <div className="max-w-4xl">
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center mb-0">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── How to use the geoportal ──────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              How to use the geoportal
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                Get started in a few steps:
              </p>

              <ol className="space-y-3 list-decimal list-inside">
                <li className="text-base text-gray-300" style={sans}>
                  Choose an indicator or dataset
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Adjust the time period
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Visualize results on the interactive map
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Compare thematic layers
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Select a country or region
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Generate the statistics
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  Download data or integrate into your analysis
                </li>
              </ol>
            </div>
          </div>

          {/* ── Start Exploring the Geoportal ──────────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 text-center">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-8" style={serif}>
                Start Exploring the Geoportal
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/map"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Open Interactive Map
                </Link>
                <Link
                  href="/ldn-in-africa"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Explore Indicators
                </Link>
                <Link
                  href="/api-docs"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Download Data
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
