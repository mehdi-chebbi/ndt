'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

export default function LDNInAfricaPage() {
  const { t } = useTranslation('ldn-in-africa')

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
                {t('hero.eyebrow')}
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-5xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              {t('hero.title')}{' '}
              <span style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #86efac 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('hero.titleHighlight')}
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-6 leading-relaxed" style={sans}>
              {t('hero.description')}
            </p>

            <p className="text-base text-green-400/90 font-medium" style={{ ...sans, letterSpacing: '0.02em' }}>
              {t('hero.tagline')}
            </p>
          </div>

          {/* ── Image Placeholder ─────────────────────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] aspect-video flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
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
                  {t('whatIsLdn.ldnLinkText')}
                </a>{' '}
                {t('whatIsLdn.paragraph1After')}
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('whatIsLdn.paragraph2Before')}{' '}
                <a
                  href="https://www.unccd.int/land-and-life/land-degradation-neutrality/ldn-principles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                >
                  {t('whatIsLdn.ldnShortLinkText')}
                </a>{' '}
                {t('whatIsLdn.paragraph2After')}
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
                    {t('whatIsLdnCard.heading')}
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
                      {t('whatIsLdnCard.ldnLinkText')}
                    </a>{' '}
                    {t('whatIsLdnCard.paragraph1Middle')}{' '}
                    <a
                      href="https://www.unccd.int/land-and-life"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('whatIsLdnCard.unccdLinkText')}
                    </a>
                    {t('whatIsLdnCard.paragraph1After')}
                  </p>
                </div>

                {/* Image placeholder under the text */}
                <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
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

          {/* ── Land Degradation in Africa ──────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('landDegradationInAfrica.heading')}
            </h2>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Text side */}
              <div className="flex-1">
                <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                  {t('landDegradationInAfrica.description')}
                </p>

                <p className="text-base text-gray-300 leading-relaxed mb-3" style={sans}>
                  {t('landDegradationInAfrica.keyDriversLabel')}
                </p>

                <ul className="space-y-2 mb-0">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('landDegradationInAfrica.driver1')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('landDegradationInAfrica.driver2')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('landDegradationInAfrica.driver3')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('landDegradationInAfrica.driver4')}
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
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
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
                    {t('keyFacts.heading')}
                  </h2>
                </div>

                {/* Facts list */}
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('keyFacts.fact1')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('keyFacts.fact2')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('keyFacts.fact3')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('keyFacts.fact4')}
                  </li>
                </ul>

                {/* Image placeholder under text */}
                <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
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

          {/* ── Monitoring LDN in Africa ─────────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('monitoring.heading')}
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('monitoring.paragraph1')}
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                {t('monitoring.indicatorsLabel')}
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('monitoring.indicator1')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('monitoring.indicator2')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('monitoring.indicator3')}
                </li>
              </ul>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('monitoring.combinedIndicators')}
              </p>

              {/* Beyond Core Indicators sub-section */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 lg:p-8 mb-6">
                <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                  {t('praisFramework.heading')}
                </h3>

                <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                  {t('praisFramework.description')}
                </p>

                <p className="text-base text-gray-300 leading-relaxed mb-3" style={sans}>
                  {t('praisFramework.includeLabel')}
                </p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('praisFramework.item1')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('praisFramework.item2')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('praisFramework.item3')}
                  </li>
                  <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    {t('praisFramework.item4')}
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
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
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
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── How LDN is implemented in Africa ──────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('implementation.heading')}
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                {t('implementation.introLabel')}
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.action1')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.action2')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.action3')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.action4')}
                </li>
              </ul>

              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                {t('implementation.alignedLabel')}
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.alignment1')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.alignment2')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('implementation.alignment3')}
                </li>
              </ul>
            </div>
          </div>

          {/* ── How this platform supports LDN ────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('platformSupport.heading')}
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('platformSupport.intro')}
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/api-docs" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    {t('platformSupport.feature1Text')}
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/map" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    {t('platformSupport.feature2Text')}
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('platformSupport.feature3Before')}{' '}
                  <Link href="/map" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    {t('platformSupport.feature3LinkText')}
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/dashboard" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    {t('platformSupport.feature4Text')}
                  </Link>;
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  <Link href="/story" className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors">
                    {t('platformSupport.feature5Text')}
                  </Link>.
                </li>
              </ul>

              {/* Image placeholder under text */}
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

          {/* ── Why LDN matters for Africa ────────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('whyLdnMatters.heading')}
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                {t('whyLdnMatters.introLabel')}
              </p>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('whyLdnMatters.reason1')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('whyLdnMatters.reason2')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('whyLdnMatters.reason3')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('whyLdnMatters.reason4')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('whyLdnMatters.reason5')}
                </li>
              </ul>

              <p className="text-base text-green-400/90 font-medium leading-relaxed" style={sans}>
                {t('whyLdnMatters.closingText')}
              </p>

              {/* Image placeholder */}
              <div className="mt-8 rounded-lg border border-dashed border-white/10 bg-white/[0.02] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Explore LDN monitoring data and tools ──────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 text-center">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-8" style={serif}>
                {t('exploreTools.heading')}
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('exploreTools.viewDashboard')}
                </Link>
                <Link
                  href="/map"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('exploreTools.accessGeoportal')}
                </Link>
                <Link
                  href="/api-docs"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('exploreTools.learnMoreResources')}
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
                    {t('ldnInAfricaBox.heading')}
                  </h2>
                </div>
                <p className="text-base text-green-400/80 mb-8 ml-[52px]" style={sans}>
                  {t('ldnInAfricaBox.subtitle')}
                </p>

                {/* Concept promotion */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    {t('ldnInAfricaBox.conceptPromotion.heading')}
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                    {t('ldnInAfricaBox.conceptPromotion.paragraph1Before')}{' '}
                    <a
                      href="https://www.unep.org/events/conference/twelfth-conference-parties-nairobi-convention-cop-12"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('ldnInAfricaBox.conceptPromotion.cop12LinkText')}
                    </a>{' '}
                    {t('ldnInAfricaBox.conceptPromotion.paragraph1Middle')}{' '}
                    <a
                      href="https://www.unccd.int/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('ldnInAfricaBox.conceptPromotion.unccdLinkText')}
                    </a>{' '}
                    {t('ldnInAfricaBox.conceptPromotion.paragraph1Middle2')}{' '}
                    <a
                      href="https://www.unccd.int/land-and-life/land-degradation-neutrality/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('ldnInAfricaBox.conceptPromotion.ldnLinkText')}
                    </a>.
                  </p>

                  <p className="text-base text-gray-300 leading-relaxed" style={sans}>
                    {t('ldnInAfricaBox.conceptPromotion.paragraph2Before')}{' '}
                    <a
                      href="https://globalgoals.org/goals/15-life-on-land/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('ldnInAfricaBox.conceptPromotion.targetLinkText')}
                    </a>{' '}
                    {t('ldnInAfricaBox.conceptPromotion.paragraph2Middle')}{' '}
                    <a
                      href="https://globalgoals.org/goals/15-life-on-land/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                    >
                      {t('ldnInAfricaBox.conceptPromotion.sdgLinkText')}
                    </a>:{' '}
                    &ldquo;{t('ldnInAfricaBox.conceptPromotion.sdgQuote')}&rdquo;
                  </p>
                </div>

                {/* Global progress on LDN Targets */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    {t('ldnInAfricaBox.globalProgress.heading')}
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    {t('ldnInAfricaBox.globalProgress.intro')}
                  </p>

                  <ul className="space-y-3 mb-4">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.globalProgress.item1')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.globalProgress.item2')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.globalProgress.item3')}
                    </li>
                  </ul>

                  <p className="text-base text-gray-300 leading-relaxed" style={sans}>
                    {t('ldnInAfricaBox.globalProgress.closing')}
                  </p>
                </div>

                {/* Supporting LDN implementation */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    {t('ldnInAfricaBox.supportingImplementation.heading')}
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    {t('ldnInAfricaBox.supportingImplementation.intro')}
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
                        {t('ldnInAfricaBox.supportingImplementation.faoLinkText')}
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
                        {t('ldnInAfricaBox.supportingImplementation.rcmrdLinkText')}
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
                        {t('ldnInAfricaBox.supportingImplementation.ossLinkText')}
                      </a>.
                    </li>
                  </ul>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    {t('ldnInAfricaBox.supportingImplementation.supportLabel')}
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.supportingImplementation.support1')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.supportingImplementation.support2')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.supportingImplementation.support3')}
                    </li>
                  </ul>
                </div>

                {/* Country profiles and decision support */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    {t('ldnInAfricaBox.countryProfiles.heading')}
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    {t('ldnInAfricaBox.countryProfiles.intro')}
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.countryProfiles.item1')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.countryProfiles.item2')}
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.countryProfiles.item3')}
                    </li>
                  </ul>
                </div>

                {/* Africa's engagement */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-4" style={serif}>
                    {t('ldnInAfricaBox.africaEngagement.heading')}
                  </h3>

                  <p className="text-base text-gray-300 leading-relaxed mb-4" style={sans}>
                    {t('ldnInAfricaBox.africaEngagement.intro')}
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.africaEngagement.action1Before')}{' '}
                      <a
                        href="https://www.unccd.int/our-work/country-profiles/voluntary-ldn-targets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        {t('ldnInAfricaBox.africaEngagement.action1LinkText')}
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.africaEngagement.action2Before')}{' '}
                      <a
                        href="https://data.unccd.int/ldntargets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        {t('ldnInAfricaBox.africaEngagement.action2LinkText')}
                      </a>;
                    </li>
                    <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                      {t('ldnInAfricaBox.africaEngagement.action3Before')}{' '}
                      <a
                        href="https://www.unccd.int/land-and-life/land-management-restoration/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
                      >
                        {t('ldnInAfricaBox.africaEngagement.action3LinkText')}
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
                    <p className="text-xs text-gray-600 uppercase tracking-widest" style={sans}>{t('placeholders.image')}</p>
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
