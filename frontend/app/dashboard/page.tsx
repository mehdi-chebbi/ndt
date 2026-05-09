'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const strategicObjectives = [
  {
    id: 'SO1',
    title: 'SO1 — Ecosystems',
    subtitle: 'Improving affected ecosystems and promoting sustainable land management',
    color: 'from-emerald-500/20 to-emerald-900/20',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    indicators: [
      { code: 'SO 1-1', label: 'Trends in land cover' },
      { code: 'SO 1-2', label: 'Trends in land productivity or functioning of the land' },
      { code: 'SO 1-3', label: 'Trends in carbon stocks above and below ground' },
      { code: 'SO 1-4', label: 'Proportion of land that is degraded over total land area (SDG indicator 15.3.1)' },
    ],
  },
  {
    id: 'SO2',
    title: 'SO2 — Populations',
    subtitle: 'Enhancing the living conditions of affected populations',
    color: 'from-sky-500/20 to-sky-900/20',
    border: 'border-sky-500/30',
    accent: 'text-sky-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    indicators: [
      { code: 'SO 2-1', label: 'Trends in population living below the relative poverty line or income inequality in affected areas' },
      { code: 'SO 2-2', label: 'Trends in access to safe drinking water in affected areas' },
      { code: 'SO 2-3', label: 'Trends in the Proportion of the population exposed to LD disaggregated by Sex' },
    ],
  },
  {
    id: 'SO3',
    title: 'SO3 — Drought',
    subtitle: 'Mitigating drought effects to increase resilience',
    color: 'from-amber-500/20 to-amber-900/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    indicators: [
      { code: 'SO 3-1', label: 'Trends in the proportion of land under drought over the total land area' },
      { code: 'SO 3-2', label: 'Trends in the proportion of the population exposed to drought' },
      { code: 'SO 3-3', label: 'Trends in the degree of drought vulnerability' },
    ],
  },
  {
    id: 'SO4',
    title: 'SO4 — Environmental Benefits',
    subtitle: 'Generating global environmental benefits through implementation',
    color: 'from-teal-500/20 to-teal-900/20',
    border: 'border-teal-500/30',
    accent: 'text-teal-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    indicators: [
      { code: 'SO 4-1', label: 'Trends in carbon stocks above and below ground' },
      { code: 'SO 4-2', label: 'Trends in abundance and distribution of selected species' },
      { code: 'SO 4-3', label: 'Trends in protected area coverage of important biodiversity areas' },
    ],
  },
]

const capabilities = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Country-level, regional, and continental analysis',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Time-series visualization of trends',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: 'Custom filtering and comparison tools',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Interactive charts and graphs for deeper data exploration',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Thematic views aligned with UNCCD Strategic Objectives (SOs)',
  },
]

const whyMatters = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    text: 'Understand land degradation trends and patterns over time',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: 'Monitor progress toward Land Degradation Neutrality through SDG 15.3.1',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    text: 'Support national reporting and planning',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    text: 'Generate custom visualizations to facilitate data-driven decision-making',
  },
]

export default function DashboardPage() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login'
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                SDG 15.3.1 Monitoring
              </span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-white">LDN Dashboard </span>
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Africa</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-4">
              Land Degradation &amp; SDG 15.3.1&apos;s indicators
            </motion.p>

            <motion.p variants={fadeInUp} className="text-base text-gray-500 max-w-2xl mx-auto mb-8">
              Monitor land degradation indicators in Africa using interactive dashboards. Track SDG Indicator 15.3.1, explore trends, and analyze Land Degradation Neutrality progress.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-medium">
                Track indicators
              </span>
              <span className="text-green-400">•</span>
              <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-medium">
                Visualize trends
              </span>
              <span className="text-green-400">•</span>
              <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-medium">
                Inform decisions
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            'The Dashboard provides interactive data visualization tools for land degradation monitoring in Africa, enabling users to explore, analyze, and interpret key indicators related to Land Degradation Neutrality (LDN) and SDG 15.3.1.',
            'It allows users to visualize thematic resources aligned with the United Nations Convention to Combat Desertification (UNCCD)\'s five Strategic Objectives (SOs), offering a structured and policy-relevant perspective on land degradation dynamics.',
            'Through dynamic charts, graphs, and comparative tools, the Dashboard supports evidence-based analysis and decision-making at continental, regional, and national levels.',
          ].map((text, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.05] transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Key Indicators Section (Box-2) */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
              Box-2
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Key Indicators
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Core indicators distributed according to the UNCCD&apos;s Strategic Objectives, used to monitor land degradation and support LDN reporting
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {strategicObjectives.map((so) => (
              <motion.div
                key={so.id}
                variants={fadeInUp}
                className={`rounded-2xl bg-gradient-to-br ${so.color} border ${so.border} p-6 hover:scale-[1.01] transition-transform duration-300`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className={`shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ${so.accent}`}>
                    {so.icon}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${so.accent} mb-1`}>{so.title}</h3>
                    <p className="text-gray-400 text-sm">{so.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {so.indicators.map((ind) => (
                    <div
                      key={ind.code}
                      className="flex items-start gap-3 rounded-lg bg-black/20 p-3"
                    >
                      <span className={`shrink-0 text-xs font-mono font-semibold ${so.accent} mt-0.5`}>
                        {ind.code}
                      </span>
                      <span className="text-gray-300 text-sm leading-relaxed">{ind.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-6 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
            <p className="text-gray-400 text-sm">
              These objectives directly support <span className="text-green-400 font-medium">SDG Target 15.3</span>, with a heavy emphasis on{' '}
              <span className="text-green-400 font-medium">Land Degradation Neutrality (LDN)</span>, drought resilience, and resource mobilization.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Dashboard Capabilities Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Dashboard Capabilities
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Powerful tools to explore, analyze, and interpret land degradation data
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="group rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:bg-white/[0.06] hover:border-green-500/20 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mb-3 group-hover:bg-green-500/20 transition-colors duration-300">
                  {cap.icon}
                </div>
                <p className="text-gray-300 text-sm font-medium">{cap.title}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Why the Dashboard Matters Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why the Dashboard Matters
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              The Dashboard transforms complex datasets into clear and interactive visual insights
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {whyMatters.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex items-start gap-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-5"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                  {item.icon}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed pt-1">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center"
        >
          <motion.div variants={fadeInUp} className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Explore the Dashboard
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/map"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-black font-semibold text-sm hover:bg-green-400 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Indicators
            </Link>

            <Link
              href="/map"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Analyze Trends
            </Link>

            <Link
              href="/map"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare Countries
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
