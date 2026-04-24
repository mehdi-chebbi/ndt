"use client";

import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ComparisonSliderProps {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  defaultPosition?: number;
  className?: string;
  handleColor?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ComparisonSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  defaultPosition = 50,
  className = "",
  handleColor = "#22c55e",
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(defaultPosition);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    const raw = ((clientX - left) / width) * 100;
    setPosition(Math.min(100, Math.max(0, raw)));
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      isDragging.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 1));
    if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 1));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-xl ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ cursor: isDragging.current ? "col-resize" : "default" }}
    >
      {/* AFTER panel (full width, behind) */}
      <div className="absolute inset-0 w-full h-full">
        {after}
      </div>

      {/* BEFORE panel (clipped to left of handle) */}
      <div
        className="absolute inset-0 h-full overflow-hidden"
        style={{ width: `${position}%` }}
      >
        {before}
        <span
          className="absolute top-4 left-4 text-xs font-bold tracking-widest uppercase
                     bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm
                     pointer-events-none"
        >
          {beforeLabel}
        </span>
      </div>

      {/* After label */}
      <span
        className="absolute top-4 right-4 text-xs font-bold tracking-widest uppercase
                   bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm
                   pointer-events-none"
      >
        {afterLabel}
      </span>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 pointer-events-none"
        style={{
          left: `${position}%`,
          backgroundColor: handleColor,
          boxShadow: `0 0 8px ${handleColor}80`,
        }}
      />

      {/* Draggable handle */}
      <div
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                   flex items-center justify-center
                   w-10 h-10 rounded-full
                   shadow-lg cursor-col-resize
                   focus:outline-none focus:ring-2 focus:ring-white/60
                   transition-transform duration-75
                   hover:scale-110 active:scale-95"
        style={{
          left: `${position}%`,
          backgroundColor: handleColor,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M15 18l-6-6 6-6" />
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

// ── Image variant ─────────────────────────────────────────────────────────────

interface ImageComparisonProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
  defaultPosition?: number;
  className?: string;
}

export function ImageComparison({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  alt = "Comparison",
  defaultPosition,
  className = "aspect-video",
}: ImageComparisonProps) {
  return (
    <ComparisonSlider
      before={
        <img
          src={beforeSrc}
          alt={`${alt} — before`}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      }
      after={
        <img
          src={afterSrc}
          alt={`${alt} — after`}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      }
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
      defaultPosition={defaultPosition}
      className={className}
    />
  );
}
