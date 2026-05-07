"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { StatCard } from "@/components/story/CountUp";
// Dynamically import MapComparison (no SSR — uses Leaflet)
const MapComparison = dynamic(
  () => import("@/components/story/MapComparison").then((m) => m.MapComparison),
  { ssr: false }
);
import {
  TitleCard,
  RevealLines,
  PullQuote,
} from "@/components/story/CinematicText";
import type { MapChapter } from "@/components/story/ScrollLinkedMap";

// Dynamically import MapLibre components (no SSR — avoids window/document issues)
const ScrollLinkedMap = dynamic(
  () =>
    import("@/components/story/ScrollLinkedMap").then(
      (m) => m.ScrollLinkedMap
    ),
  { ssr: false }
);

// ── Step data (text for each scrolling panel) ─────────────────────────────────

interface StepData {
  id: string;
  title: string;
  body: string;
  mapChapter: string;
}

const STEPS: StepData[] = [
  {
    id: "overview",
    title: "Africa at a Crossroads",
    body: "More than 65% of Africa's productive agricultural land has been degraded. This crisis threatens food security for over 1.3 billion people across the continent.",
    mapChapter: "intro",
  },
  {
    id: "sahel",
    title: "The Sahel's Vanishing Soil",
    body: "The Sahel — stretching 5,400 km from Senegal to Eritrea — loses millions of hectares of topsoil each year to wind erosion and desertification.",
    mapChapter: "sahel",
  },
  {
    id: "ethiopia",
    title: "Ethiopia's Highland Collapse",
    body: "Rapid deforestation in the Ethiopian highlands has accelerated erosion, with some watersheds losing up to 200 tonnes of soil per hectare annually.",
    mapChapter: "ethiopia",
  },
  {
    id: "southern",
    title: "Southern Africa's Drought Belt",
    body: "Climate change has extended drought cycles across southern Africa, compounding existing land degradation and displacing entire communities.",
    mapChapter: "southern",
  },
];

// ── Chapters with WMS layer configs ───────────────────────────────────────────
// Each chapter flies to a location and optionally shows a WMS data layer.
// The intro chapter shows a clean map; layers fade in as the story progresses.
//
const STORY_CHAPTERS: MapChapter[] = [
  {
    id: "intro",
    center: [20, 5],
    zoom: 2,
    bearing: 0,
    pitch: 0,
    speed: 0.8,
    wmsLayers: [
      {
        workspace: "SDG",
        layerName: "sdg_15_3_1_reporting_COG",
        opacity: 1,
      },
    ],
    layerLabel: "Land Degradation — SDG 15.3.1",
  },
  {
    id: "sahel",
    center: [15, 14],
    zoom: 5,
    bearing: 10,
    pitch: 30,
    speed: 0.6,
    wmsLayers: [
      {
        workspace: "LP",
        layerName: "clip_Niger_Trends_c55d0cc5",
        opacity: 1,
      },
      {
        workspace: "LP",
        layerName: "clip_Nigeria_Trends_b25b0da9",
        opacity: 1,
      },
      {
        workspace: "LP",
        layerName: "clip_Cameroon_Trends_71db7a0b",
        opacity: 1,
      },
      {
        workspace: "LP",
        layerName: "clip_Chad_Trends_7c85b4d6",
        opacity: 1,
      },
      {
        workspace: "LP",
        layerName: "clip_Central_African_Republic_Trends_b57f481a",
        opacity: 1,
      },
    ],
    layerLabel: "Land Productivity — Sahel Region",
  },
  {
    id: "ethiopia",
    center: [39.5, 8.5],
    zoom: 6,
    bearing: -15,
    pitch: 45,
    speed: 0.7,
    wmsLayers: [
      {
        workspace: "LCC",
        layerName: "clip_Ethiopia_LC_change_OSS_Reporting_COG_89795fdb",
        opacity: 1,
      },
    ],
    layerLabel: "Land Cover Change — Ethiopia",
  },
  {
    id: "southern",
    center: [25, -20],
    zoom: 5,
    pitch: 0,
    bearing: 0,
    speed: 0.9,
    wmsLayers: [
      {
        workspace: "SO3",
        layerName: "clip_Zimbabwe_band_11_SPI_min_2020-2023_COG_852e98d3",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Botswana_band_11_SPI_min_2020-2023_COG_6d5a25f9",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Namibia_band_11_SPI_min_2020-2023_COG_6026200c",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Mozambique_band_11_SPI_min_2020-2023_COG_80e6c803",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_South_Africa_band_11_SPI_min_2020-2023_COG_aed10e95",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Angola_band_11_SPI_min_2020-2023_COG_985fa21b",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Zambia_band_11_SPI_min_2020-2023_COG_c3c04859",
        opacity: 1,
      },
      {
        workspace: "SO3",
        layerName: "clip_Eswatini_band_11_SPI_min_2020-2023_COG_a636812c",
        opacity: 1,
      },
    ],
    layerLabel: "Drought Index (SPI) — Southern Africa",
  },
];

// ── Map comparison config ─────────────────────────────────────────────────

const COMPARISON_BEFORE = {
  workspace: "SDG",
  layerName: "sdg_15_3_1_baseline_COG",
};

const COMPARISON_AFTER = {
  workspace: "SDG",
  layerName: "sdg_15_3_1_reporting_COG",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StoryPage() {
  return (
    <main className="bg-[#0a0f0d] text-white min-h-screen">
      {/* ═══════ HERO ═══════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "10%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              right: "10%",
              width: 350,
              height: 350,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />
          {/* Subtle grid */}
          <div
            style={{
              backgroundImage: `linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        <TitleCard
          eyebrow="Data Story · 2024"
          heading="Land at the Brink"
          body="An interactive investigation into Africa's accelerating land degradation crisis. Scroll to explore the story."
          align="center"
          className="max-w-4xl mx-auto relative z-10"
        />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Scroll to explore
          </span>
          <div className="w-5 h-8 rounded-full border-2 border-zinc-600 flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 rounded-full bg-green-400"
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════ STATS ROW ═══════ */}
      <section className="py-20 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealLines
            staggerDelay={0.1}
            className="flex flex-col gap-2 mb-12"
          >
            <span className="text-xs uppercase tracking-widest text-green-400/80 font-bold">
              The Numbers
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">
              A Crisis Measured in Hectares
            </h2>
          </RevealLines>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            <StatCard
              to={1_200_000}
              suffix=" km²"
              duration={2.5}
              label="Degraded Land"
              description="Area affected across sub-Saharan Africa"
            />
            <StatCard
              to={65}
              suffix="%"
              duration={2}
              label="Farmland Affected"
            />
            <StatCard
              to={3.4}
              suffix="B"
              decimals={1}
              prefix="$"
              duration={2.2}
              label="Annual GDP Loss"
            />
            <StatCard
              to={54}
              duration={1.6}
              label="Countries Impacted"
            />
          </div>
        </div>
      </section>

      {/* ═══════ SCROLLYTELLING MAP ═══════ */}
      <ScrollLinkedMap chapters={STORY_CHAPTERS}>
        {(chapterRef) => (
          <>
            {STEPS.map((step, idx) => (
              <section
                key={step.id}
                ref={chapterRef(step.mapChapter)}
                className="min-h-screen flex items-center px-8 md:px-16 py-24"
              >
                <div className="max-w-md">
                  <TitleCard
                    eyebrow={`Chapter ${idx + 1}`}
                    heading={step.title}
                    body={step.body}
                    delay={0.1}
                  />
                </div>
              </section>
            ))}
          </>
        )}
      </ScrollLinkedMap>

      {/* ═══════ BEFORE / AFTER COMPARISON ═══════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealLines staggerDelay={0.1} className="flex flex-col gap-3 mb-12">
            <span className="text-xs uppercase tracking-widest text-green-400 font-bold">
              Satellite Evidence
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">
              14 Years of Change
            </h2>
            <p className="text-zinc-400 max-w-xl">
              Drag the handle to compare vegetation cover in the Sahel region
              between 2010 and 2024.
            </p>
          </RevealLines>

          <MapComparison
            before={COMPARISON_BEFORE}
            after={COMPARISON_AFTER}
            beforeLabel="Baseline"
            afterLabel="Reporting"
            center={[20, 5]}
            zoom={3}
            className="w-full aspect-video rounded-2xl overflow-hidden"
          />
        </div>
      </section>

      {/* ═══════ PULL-QUOTE STATS ═══════ */}
      <section className="py-28 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <RevealLines staggerDelay={0.1} className="flex flex-col gap-2 mb-16">
            <span className="text-xs uppercase tracking-widest text-green-400/80 font-bold">
              The Human Cost
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">
              Behind Every Hectare
            </h2>
          </RevealLines>

          <div className="grid md:grid-cols-2 gap-16 md:gap-20">
            <PullQuote
              stat="65%"
              caption="of Africa's farmland is degraded"
            />
            <PullQuote
              stat="$3.4B"
              caption="in annual economic losses"
              delay={0.2}
            />
            <PullQuote
              stat="485M"
              caption="people depend on degraded land"
              delay={0.3}
            />
            <PullQuote
              stat="12M"
              caption="hectares lost each year to desertification"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* ═══════ CALL TO ACTION ═══════ */}
      <section className="py-28 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <RevealLines
            staggerDelay={0.12}
            className="flex flex-col items-center gap-6"
          >
            <span className="text-xs uppercase tracking-widest text-green-400/80 font-bold">
              What Can You Do?
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              Explore Your Country&apos;s Data
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
              Use our interactive map to explore detailed statistics for every
              African nation. Draw custom areas, compare layers, and generate
              reports.
            </p>
          </RevealLines>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/map"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                color: "#0a0f0d",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.02em",
                boxShadow: "0 0 24px rgba(34,197,94,0.25)",
              }}
            >
              Open the Map
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-all duration-200"
              style={{
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              Get Free Access
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
