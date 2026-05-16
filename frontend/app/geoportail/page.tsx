'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const sans = { fontFamily: 'system-ui, sans-serif' }
const serif = { fontFamily: "'Georgia', serif" }

export default function GeoportailPage() {
  const { t, i18n } = useTranslation('geoportail')
  const lang = i18n.language

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
                {t('hero.eyebrow')}
              </span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-5xl" style={{ ...serif, letterSpacing: '-0.02em' }}>
              {t('hero.title')}
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mb-6 leading-relaxed" style={sans}>
              {t('hero.description')}
            </p>

            <p className="text-base text-green-400/90 font-medium" style={{ ...sans, letterSpacing: '0.02em' }}>
              {t('hero.tagline')}
            </p>
          </div>

          {/* ── About the Geoportal ──────────────────────────────── */}
          <div className="mb-20">
            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('about.paragraph1')}
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('about.paragraph2')}
              </p>

              <p className="text-base text-gray-300 leading-relaxed mb-8" style={sans}>
                {t('about.paragraph3')}
              </p>

              {/* Image under About text */}
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <Image
                  src={lang === 'fr' ? '/images/geoportal/Image_Geoportal_1_fr.png' : '/images/geoportal/Image_Geoportal_1.png'}
                  alt="About the Geoportal"
                  width={1536}
                  height={1024}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          {/* ── Geoportal's Key features and capabilities ────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('keyFeatures.heading')}
            </h2>

            <div className="max-w-4xl">
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('keyFeatures.feature1')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('keyFeatures.feature2')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('keyFeatures.feature3')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('keyFeatures.feature4')}
                </li>
                <li className="flex items-start gap-3 text-base text-gray-300" style={sans}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {t('keyFeatures.feature5')}
                </li>
              </ul>
            </div>
          </div>

          {/* ── What you can do with the geoportal ────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('whatYouCanDo.heading')}
            </h2>

            {/* Image under What You Can Do title */}
            <div className="max-w-4xl">
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <Image
                  src={lang === 'fr' ? '/images/geoportal/Image_Geoportal_2_fr.png' : '/images/geoportal/Image_Geoportal_2.png'}
                  alt="What you can do with the Geoportal"
                  width={1536}
                  height={1024}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          {/* ── How to use the geoportal ──────────────────────────── */}
          <div className="mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6" style={serif}>
              {t('howToUse.heading')}
            </h2>

            <div className="max-w-4xl">
              <p className="text-base text-gray-300 leading-relaxed mb-6" style={sans}>
                {t('howToUse.intro')}
              </p>

              <ol className="space-y-3 list-decimal list-inside">
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step1')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step2')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step3')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step4')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step5')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step6')}
                </li>
                <li className="text-base text-gray-300" style={sans}>
                  {t('howToUse.step7')}
                </li>
              </ol>
            </div>
          </div>

          {/* ── Start Exploring the Geoportal ──────────────────────── */}
          <div className="mb-20">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 text-center">
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-8" style={serif}>
                {t('startExploring.heading')}
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/map"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('startExploring.openMap')}
                </Link>
                <Link
                  href="/ldn-in-africa"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('startExploring.exploreIndicators')}
                </Link>
                <Link
                  href="/api-docs"
                  className="text-sm px-6 py-3 rounded-md border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all duration-200"
                  style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}
                >
                  {t('startExploring.downloadData')}
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
