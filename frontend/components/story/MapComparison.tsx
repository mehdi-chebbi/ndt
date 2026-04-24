"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-side-by-side";

// ── Types ────────────────────────────────────────────────────────────────────

interface WmsLayerConfig {
  workspace: string;
  layerName: string;
  opacity?: number;
}

interface LegendItem {
  label: string;
  color: string;
}

interface MapComparisonProps {
  /** WMS config for the "before" (left) side */
  before: WmsLayerConfig;
  /** WMS config for the "after" (right) side */
  after: WmsLayerConfig;
  /** Label for the left side */
  beforeLabel?: string;
  /** Label for the right side */
  afterLabel?: string;
  /** Center coordinates [lng, lat] */
  center?: [number, number];
  /** Zoom level */
  zoom?: number;
  /** Basemap URL (defaults to CARTO dark) */
  basemapUrl?: string;
  /** Legend items to display */
  legend?: LegendItem[];
  /** Legend title */
  legendTitle?: string;
  /** Additional CSS classes */
  className?: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const WMS_PROXY = "/api/clip/wms";

const DEFAULT_BASEMAP =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

const DEFAULT_LEGEND: LegendItem[] = [
  { label: "Degraded", color: "#b60000" },
  { label: "Stable", color: "#d2cfb2" },
  { label: "Improved", color: "#147d02" },
];

// ── Legend sub-component (dark theme for story page) ─────────────────────────

function StoryLegend({
  items,
  title,
}: {
  items: LegendItem[];
  title?: string;
}) {
  return (
    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] pointer-events-none">
      {title && (
        <h4 className="text-xs font-semibold text-white/90 mb-2 pb-1.5 border-b border-white/10">
          {title}
        </h4>
      )}
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-sm border border-white/20 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-white/80 truncate leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function MapComparison({
  before,
  after,
  beforeLabel = "Baseline",
  afterLabel = "Reporting",
  center = [20, 5],
  zoom = 3,
  basemapUrl = DEFAULT_BASEMAP,
  legend = DEFAULT_LEGEND,
  legendTitle = "SDG 15.3.1",
  className = "",
}: MapComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const compareRef = useRef<L.Control.SideBySide | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center[1], center[0]],
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    // Dark basemap
    L.tileLayer(basemapUrl, {
      crossOrigin: "anonymous",
    }).addTo(map);

    // Left WMS layer (before / baseline)
    const leftLayer = L.tileLayer
      .wms(`${WMS_PROXY}?workspace=${encodeURIComponent(before.workspace)}`, {
        layers: before.layerName,
        format: "image/png",
        transparent: true,
        crossOrigin: "anonymous",
      })
      .addTo(map);

    // Right WMS layer (after / reporting)
    const rightLayer = L.tileLayer
      .wms(`${WMS_PROXY}?workspace=${encodeURIComponent(after.workspace)}`, {
        layers: after.layerName,
        format: "image/png",
        transparent: true,
        crossOrigin: "anonymous",
      })
      .addTo(map);

    // Side-by-side control
    compareRef.current = L.control.sideBySide(leftLayer, rightLayer).addTo(map);

    mapRef.current = map;

    return () => {
      if (compareRef.current) {
        compareRef.current.remove();
        compareRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Before label */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <span
          className="text-xs font-bold tracking-widest uppercase
                     bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm
                     border border-white/10"
        >
          {beforeLabel}
        </span>
      </div>

      {/* After label */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
        <span
          className="text-xs font-bold tracking-widest uppercase
                     bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm
                     border border-white/10"
        >
          {afterLabel}
        </span>
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <StoryLegend items={legend} title={legendTitle} />
      )}
    </div>
  );
}
