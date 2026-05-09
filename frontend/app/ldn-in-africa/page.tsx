'use client'

import Link from 'next/link'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

export default function LDNInAfricaPage() {
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
            {/* Meta description as eyebrow */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-green-400/80" style={sans}>
                Monitoring, Data &amp; SDG 15.3.1
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-5xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              Land Degradation Neutrality (LDN){' '}
              <span style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                in Africa
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-6 leading-relaxed" style={sans}>
              Learn how Africa is addressing land degradation through Land Degradation Neutrality (LDN).
              Explore challenges, indicators, and monitoring tools supporting SDG 15.3.1.
            </p>

            <p className="text-base text-green-400/90 font-medium" style={{ ...sans, letterSpacing: '0.02em' }}>
              Halt and reverse land degradation. Restore ecosystems. Build resilience.
            </p>
          </div>

          {/* ── Image Placeholder ─────────────────────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] aspect-video flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
              </div>
            </div>
          </div>

          {/* ── What is LDN? ──────────────────────────────────────── */}
          <div className="mb-20">
            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                <a
                  href="https://www.unccd.int/land-and-life/land-degradation-neutrality/ldn-principles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                >
                  Land Degradation Neutrality (LDN)
                </a>{' '}
                is a global commitment to ensure that land degradation is balanced by restoration, so that the overall amount of healthy and productive land remains stable or increases over time.
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                In Africa, where land is central to livelihoods, food systems, and ecosystems, achieving{' '}
                <a
                  href="https://www.unccd.int/land-and-life/land-degradation-neutrality/ldn-principles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                >
                  LDN
                </a>{' '}
                is essential for sustainable development and climate resilience.
              </p>
            </div>
          </div>

          {/* ── What is Land Degradation Neutrality (LDN)? Card ──── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white" style={serif}>
                    What is Land Degradation Neutrality (LDN)?
                  </h2>
                </div>

                {/* Content */}
                <div className="max-w-3xl">
                  <p className="text-base text-gray-300 leading-relaxed mb-5" style={sans}>
                    <a
                      href="https://www.unccd.int/land-and-life/land-degradation-neutrality/ldn-principles"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      Land Degradation Neutrality (LDN)
                    </a>{' '}
                    is a target under the{' '}
                    <a
                      href="https://www.unccd.int/land-and-life"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      United Nations Convention to Combat Desertification (UNCCD)
                    </a>
                    . It aims to maintain or improve the quantity and quality of land resources needed to support ecosystem functions and human well-being.
                  </p>
                </div>

                {/* Image placeholder under the text */}
                <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Land Degradation in Africa ──────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              Land Degradation in Africa
            </h2>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Text side */}
              <div className="flex-1">
                <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                  Land degradation is a major environmental and socio-economic challenge across Africa.
                </p>

                <p className="text-base text-gray-300 leading-relaxed mb-3" style={sans}>
                  Key drivers include:
                </p>

                <ul className="space-y-2 mb-0">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Climate change and increasing drought frequency;
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Unsustainable agricultural and land-use practices;
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Deforestation and loss of vegetation cover;
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Soil erosion and land mismanagement.
                  </li>
                </ul>
              </div>

              {/* Image placeholder on the right */}
              <div className="lg:w-[45%] shrink-0">
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] aspect-[4/3] flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Key Facts ───────────────────────────────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white" style={serif}>
                    Key Facts
                  </h2>
                </div>

                {/* Facts list */}
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Over 65% of productive land in Africa is affected by degradation.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    More than 40% of the population depends directly on land resources.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Land degradation significantly impacts food security and rural livelihoods.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    It contributes to biodiversity loss and climate vulnerability.
                  </li>
                </ul>

                {/* Image placeholder under text */}
                <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Monitoring LDN in Africa ─────────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              Monitoring LDN in Africa
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                Monitoring Land Degradation Neutrality in Africa is based on a set of globally agreed indicators, complemented by a broader framework under the UNCCD Performance Review and Assessment of Implementation System (PRAIS). This allows countries to assess land condition and track progress over time.
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                At the global level, LDN monitoring relies on three key indicators:
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Land cover change, which tracks transitions between forests, croplands, grasslands, and other land types.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Land productivity dynamics, which measure vegetation health and biological productivity.
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Soil organic carbon, which indicates soil quality and carbon storage capacity.
                </li>
              </ul>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                These indicators are combined to produce the SDG Indicator 15.3.1: "Proportion of degraded land over total land area".
              </p>

              {/* Beyond Core Indicators sub-section */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 lg:p-8 mb-6">
                <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                  Beyond Core Indicators: The PRAIS Framework:
                </h3>

                <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                  In addition to the three core indicators, countries report through the UNCCD PRAIS system, which includes a wider set of indicators and information to assess progress toward LDN.
                </p>

                <p className="text-base text-gray-300 leading-relaxed mb-3" style={sans}>
                  These include:
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Policy and institutional indicators, integrating LDN into national strategies.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Land restoration and sustainable land management actions.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Drought monitoring and vulnerability indicators.
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    Implementation and reporting metrics supporting national and global assessments.
                  </li>
                </ul>
              </div>
            </div>

            {/* Image placeholder under text */}
            <div className="max-w-4xl">
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

          {/* ── Additional Image Placeholder ─────────────────────────── */}
          <div className="mb-20">
            <div className="max-w-4xl">
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

          {/* ── How LDN is implemented in Africa ──────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              How LDN is implemented in Africa
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                African countries are actively working toward achieving LDN through:
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Setting national LDN targets;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Integrating LDN into national policies and strategies;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Implementing land restoration and sustainable land management practices;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Strengthening monitoring and reporting systems;
                </li>
              </ul>

              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                These efforts are aligned with:
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  The 2030 Agenda for Sustainable Development;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Agenda 2063 of the African Union;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  National environmental and agricultural policies.
                </li>
              </ul>
            </div>
          </div>

          {/* ── How this platform supports LDN ────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              How this platform supports LDN
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                The Africa&apos;s Land Degradation Monitoring Platform plays a key role in supporting LDN implementation by providing:
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/api-docs" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    Harmonized datasets across Africa
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/map" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    Tools to monitor land degradation trends over time
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Geospatial analysis through the{' '}
                  <Link href="/map" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    Geoportal
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/dashboard" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    Dashboards for SDG 15.3.1 reporting and analysis
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/story" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    Decision-support systems for policymakers and stakeholders
                  </Link>.
                </li>
              </ul>

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

          {/* ── Why LDN matters for Africa ────────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              Why LDN matters for Africa
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                Achieving Land Degradation Neutrality is essential to:
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Ensure food security;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Protect ecosystems and biodiversity;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Strengthen climate resilience;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Sustain water resources;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  Improve livelihoods for millions of people.
                </li>
              </ul>

              <p className="text-base text-green-400/90 font-medium leading-relaxed" style={sans}>
                LDN is not only an environmental goal, but it is also a development priority for Africa!
              </p>

              {/* Image placeholder */}
              <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Explore LDN monitoring data and tools ──────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 text-center">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-8" style={serif}>
                Explore LDN monitoring data and tools
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  View LDN Dashboard
                </Link>
                <Link
                  href="/map"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Access Geoportal
                </Link>
                <Link
                  href="/api-docs"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  Learn more in Resources
                </Link>
              </div>
            </div>
          </div>

          {/* ── Box-1 (page2): Land Degradation Neutrality in Africa ──── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-8 lg:p-10">

                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white" style={serif}>
                    Land Degradation Neutrality in Africa
                  </h2>
                </div>
                <p className="text-base text-green-400/80 mb-8 ml-[52px]" style={sans}>
                  Global framework, regional action, and country-level implementation
                </p>

                {/* Concept promotion */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    Concept promotion
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                    In October 2015, the{' '}
                    <a
                      href="https://www.unep.org/events/conference/twelfth-conference-parties-nairobi-convention-cop-12"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      12th Conference of the Parties (COP12)
                    </a>{' '}
                    of the{' '}
                    <a
                      href="https://www.unccd.int/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      United Nations Convention to Combat Desertification (UNCCD)
                    </a>{' '}
                    introduced the concept of{' '}
                    <a
                      href="https://www.unccd.int/land-and-life/land-degradation-neutrality/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      Land Degradation Neutrality (LDN)
                    </a>.
                  </p>

                  <p className="text-base text-gray-300 leading-relaxed" style={sans}>
                    That same year, LDN was adopted as{' '}
                    <a
                      href="https://globalgoals.org/goals/15-life-on-land/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      Target 15.3
                    </a>{' '}
                    of the{' '}
                    <a
                      href="https://globalgoals.org/goals/15-life-on-land/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      Sustainable Development Goals (SDG 15 - Life on Land)
                    </a>:{' '}
                    &ldquo;Combat desertification, restore degraded land and soil, including land affected by desertification, drought and floods, and strive to achieve a land degradation-neutral world by 2030.&rdquo;
                  </p>
                </div>

                {/* Global progress on LDN Targets */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    Global progress on LDN Targets
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    Countries worldwide are actively engaging in the LDN target-setting process:
                  </p>

                  <ul className="space-y-3 mb-4">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      130+ countries are committed to setting LDN targets;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      82 countries reported on voluntary LDN targets (2022 reporting cycle);
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      64 countries have published high-level LDN target notes.
                    </li>
                  </ul>

                  <p className="text-base text-gray-300 leading-relaxed" style={sans}>
                    Additional countries are currently developing or updating their targets
                  </p>
                </div>

                {/* Supporting LDN implementation */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    Supporting LDN implementation
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    International and regional partners play a key role in supporting countries, including:
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      <a
                        href="https://www.fao.org/home/fr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        FAO (Food and Agriculture Organization)
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      <a
                        href="https://rcmrd.org/en/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        RCMRD (Regional Centre for Mapping of Resources for Development)
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      <a
                        href="https://www.oss-online.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        OSS (Sahara and Sahel Observatory)
                      </a>.
                    </li>
                  </ul>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    These institutions support:
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Strengthening LDN monitoring and reporting;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Improving data and indicators;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Promoting sustainable land management practices.
                    </li>
                  </ul>
                </div>

                {/* Country profiles and decision support */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    Country profiles and decision support
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    Each participating country develops an LDN country profile, providing:
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Evidence-based analysis of land degradation;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Priority areas for intervention;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Strategic guidance to support investment and policy decisions.
                    </li>
                  </ul>
                </div>

                {/* Africa's engagement */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    Africa&apos;s engagement
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    African countries are strongly engaged in the LDN process, with many:
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Setting or updating{' '}
                      <a
                        href="https://www.unccd.int/our-work/country-profiles/voluntary-ldn-targets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        national LDN targets
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Strengthening{' '}
                      <a
                        href="https://data.unccd.int/ldntargets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        monitoring systems and reporting capacities
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      Implementing{' '}
                      <a
                        href="https://www.unccd.int/land-and-life/land-management-restoration/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        land restoration and sustainable land management initiatives
                      </a>.
                    </li>
                  </ul>
                </div>

                {/* Image placeholder under text */}
                <div className="mt-6 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>Image Placeholder</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
