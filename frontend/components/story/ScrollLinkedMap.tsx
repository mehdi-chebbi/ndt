"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl, { type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WmsLayerConfig {
  /** GeoServer workspace (e.g. "LC", "SDG", "SPI") */
  workspace: string;
  /** Layer name within the workspace (e.g. "LandcoverOSS2023", "SDG_15_3_1") */
  layerName: string;
  /** Opacity of the overlay, 0–1. Default: 0.7 */
  opacity?: number;
}

export interface MapChapter {
  id: string;
  center: LngLatLike;
  zoom: number;
  bearing?: number;
  pitch?: number;
  speed?: number;
  curve?: number;
  duration?: number;
  /** Optional WMS data layers to show for this chapter */
  wmsLayers?: WmsLayerConfig[];
  /** Human-readable label shown on the map overlay (e.g. "Land Cover 2023") */
  layerLabel?: string;
}

interface ScrollMapProps {
  chapters: MapChapter[];
  styleUrl?: string;
  className?: string;
}

// ── Africa story chapter definitions ────────────────────────────────────────

export const AFRICA_CHAPTERS: MapChapter[] = [
  { id: "intro",    center: [20, 5],    zoom: 3, bearing: 0,   pitch: 0,  speed: 0.8 },
  { id: "sahel",    center: [15, 14],   zoom: 5, bearing: 10,  pitch: 30, speed: 0.6 },
  { id: "ethiopia", center: [39.5, 8.5],zoom: 6, bearing: -15, pitch: 45, speed: 0.7 },
  { id: "southern", center: [25, -20],  zoom: 5, pitch: 0,     bearing: 0, speed: 0.9 },
];

// ── OSM raster style (minimal MapLibre style JSON) ─────────────────────────────

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "OSM",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// ── WMS tile URL builder ──────────────────────────────────────────────────────

const WMS_PROXY_BASE = "/api/clip/wms";

function buildWmsTileUrl(config: WmsLayerConfig): string {
  const wmsParams = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: config.layerName,
    styles: "",
    srs: "EPSG:3857",
    format: "image/png",
    transparent: "true",
    width: "256",
    height: "256",
  });
  // Append bbox template AFTER URLSearchParams to avoid {} encoding
  return `${WMS_PROXY_BASE}?workspace=${encodeURIComponent(config.workspace)}&${wmsParams.toString()}&bbox={bbox-epsg-3857}`;
}

// ── WMS prefix constants for cleanup ──────────────────────────────────────────

const WMS_SOURCE_PREFIX = "story-wms-src-";
const WMS_LAYER_PREFIX = "story-wms-layer-";

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useScrollMap({
  chapters,
  styleUrl,
}: Pick<ScrollMapProps, "chapters" | "styleUrl">) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const activeChapterRef = useRef<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map<string, HTMLElement>());

  // Track current label for the overlay badge
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const currentLabelRef = useRef<string | null>(null);

  // ── WMS layer swapping ─────────────────────────────────────────────────

  const removeWmsLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = map.getStyle();
    if (!style) return;

    // Remove layers first, then sources (order matters)
    style.layers
      .filter((l) => l.id.startsWith(WMS_LAYER_PREFIX))
      .forEach((l) => {
        try { map.removeLayer(l.id); } catch { /* already gone */ }
      });

    Object.keys(style.sources)
      .filter((s) => s.startsWith(WMS_SOURCE_PREFIX))
      .forEach((s) => {
        try { map.removeSource(s); } catch { /* already gone */ }
      });
  }, []);

  const applyWmsLayers = useCallback(
    (chapter: MapChapter) => {
      const map = mapRef.current;
      if (!map || !mapLoadedRef.current) return;

      // Clean up previous WMS layers
      removeWmsLayers();

      if (!chapter.wmsLayers?.length) {
        // No layers for this chapter — clean map
        if (currentLabelRef.current !== null) {
          currentLabelRef.current = null;
          setCurrentLabel(null);
        }
        return;
      }

      // Group layers by workspace — combined into single WMS requests
      const groups = new Map<string, WmsLayerConfig[]>();
      chapter.wmsLayers.forEach((cfg) => {
        const key = cfg.workspace;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(cfg);
      });

      let idx = 0;
      groups.forEach((configs, workspace) => {
        const sourceId = `${WMS_SOURCE_PREFIX}${idx}`;
        const layerId = `${WMS_LAYER_PREFIX}${idx}`;
        const targetOpacity = configs[0].opacity ?? 0.7;

        // Combine all layer names for this workspace into one request
        const combinedConfig: WmsLayerConfig = {
          workspace,
          layerName: configs.map((c) => c.layerName).join(","),
          opacity: targetOpacity,
        };

        const tileUrl = buildWmsTileUrl(combinedConfig);

        map.addSource(sourceId, {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
        });

        // Start at 0 opacity for a fade-in effect
        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": 0,
            "raster-opacity-transition": { duration: 800, delay: 300 },
          },
        });

        // Fade to target opacity after a small delay
        requestAnimationFrame(() => {
          try {
            map.setPaintProperty(layerId, "raster-opacity", targetOpacity);
          } catch {
            /* layer may have been removed */
          }
        });

        idx++;
      });

      // Update label
      const label = chapter.layerLabel || null;
      if (currentLabelRef.current !== label) {
        currentLabelRef.current = label;
        setCurrentLabel(label);
      }
    },
    [removeWmsLayers]
  );

  // ── Fly-to with WMS swap ───────────────────────────────────────────────

  const flyToChapter = useCallback(
    (chapter: MapChapter) => {
      const map = mapRef.current;
      if (!map || activeChapterRef.current === chapter.id) return;
      activeChapterRef.current = chapter.id;

      // Fly to the chapter's location
      const flyOptions: maplibregl.FlyToOptions = {
        center: chapter.center,
        zoom: chapter.zoom,
        bearing: chapter.bearing ?? 0,
        pitch: chapter.pitch ?? 0,
        essential: true,
      };

      if (chapter.duration !== undefined) {
        map.flyTo({ ...flyOptions, duration: chapter.duration });
      } else {
        map.flyTo({
          ...flyOptions,
          speed: chapter.speed ?? 1.2,
          curve: chapter.curve ?? 1,
        });
      }

      // Swap WMS layers simultaneously with the fly animation
      applyWmsLayers(chapter);
    },
    [applyWmsLayers]
  );

  // ── Map initialization ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl || OSM_STYLE,
      center: chapters[0].center,
      zoom: chapters[0].zoom,
      bearing: chapters[0].bearing ?? 0,
      pitch: chapters[0].pitch ?? 0,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      mapLoadedRef.current = true;
      // Apply initial chapter's WMS layers (if any)
      const firstChapter = chapters[0];
      if (firstChapter.wmsLayers?.length) {
        applyWmsLayers(firstChapter);
        activeChapterRef.current = firstChapter.id;
        if (firstChapter.layerLabel) {
          currentLabelRef.current = firstChapter.layerLabel;
          setCurrentLabel(firstChapter.layerLabel);
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, [styleUrl, chapters, applyWmsLayers]);

  // ── Intersection Observer for scroll-triggered chapter changes ─────────

  useEffect(() => {
    const chapterMap = new Map<string, MapChapter>(
      chapters.map((c) => [c.id, c])
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).dataset.chapter;
          const chapter = id ? chapterMap.get(id) : undefined;
          if (chapter) flyToChapter(chapter);
        });
      },
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: 0,
      }
    );

    sectionRefs.current.forEach((el: HTMLElement) => observer.observe(el));

    return () => observer.disconnect();
  }, [chapters, flyToChapter]);

  const chapterRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) {
        el.dataset.chapter = id;
        sectionRefs.current.set(id, el);
      } else {
        sectionRefs.current.delete(id);
      }
    },
    []
  );

  return { mapContainerRef, chapterRef, currentLabel };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScrollLinkedMap({
  chapters,
  styleUrl,
  className = "",
  children,
}: ScrollMapProps & {
  children: (
    chapterRef: (id: string) => (el: HTMLElement | null) => void
  ) => React.ReactNode;
}) {
  const { mapContainerRef, chapterRef, currentLabel } = useScrollMap({
    chapters,
    styleUrl,
  });

  return (
    <div className={`relative flex flex-col md:flex-row ${className}`}>
      {/* Sticky map panel */}
      <div className="md:sticky md:top-0 md:h-screen w-full md:w-1/2 h-[50vh] md:h-screen shrink-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Layer label overlay */}
        <div
          className="absolute bottom-4 left-4 z-10 transition-all duration-500"
          style={{
            opacity: currentLabel ? 1 : 0,
            transform: currentLabel ? "translateY(0)" : "translateY(8px)",
            pointerEvents: "none",
          }}
        >
          {currentLabel && (
            <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/10">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse" />
              {currentLabel}
            </div>
          )}
        </div>
      </div>

      {/* Scrolling text panels */}
      <div className="relative w-full md:w-1/2 z-10">
        {children(chapterRef)}
      </div>
    </div>
  );
}
