"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  locale?: string;
  suffix?: string;
  prefix?: string;
  once?: boolean;
  className?: string;
}

// ── Formatting helper ─────────────────────────────────────────────────────────

function formatNumber(
  value: number,
  decimals: number,
  locale: string,
  prefix: string,
  suffix: string
): string {
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

// ── Easing helper (expo-out) ──────────────────────────────────────────────────

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ── Core hook ────────────────────────────────────────────────────────────────

export function useCountUp({
  to,
  from = 0,
  duration = 2,
  decimals = 0,
  locale = "en-US",
  suffix = "",
  prefix = "",
  once = true,
}: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });
  const [displayValue, setDisplayValue] = useState<string>(
    formatNumber(from, decimals, locale, prefix, suffix)
  );
  const frameRef = useRef<number>(0);

  const animateValue = useCallback(
    (startVal: number, endVal: number, dur: number) => {
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = (now - startTime) / 1000; // seconds
        const progress = Math.min(elapsed / dur, 1);
        const easedProgress = easeOutExpo(progress);
        const current = startVal + (endVal - startVal) * easedProgress;

        setDisplayValue(
          formatNumber(current, decimals, locale, prefix, suffix)
        );

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [decimals, locale, prefix, suffix]
  );

  useEffect(() => {
    if (!isInView) return;

    animateValue(from, to, duration);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isInView, to, from, duration, animateValue]);

  return { ref, displayValue };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CountUp(props: CountUpProps) {
  const { ref, displayValue } = useCountUp(props);

  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={props.className}
      aria-live="polite"
    >
      {displayValue}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps extends CountUpProps {
  label: string;
  description?: string;
}

export function StatCard({ label, description, ...countUpProps }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-green-400">
        <CountUp {...countUpProps} />
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </div>
      {description && (
        <p className="text-xs text-zinc-500 max-w-xs mt-1">{description}</p>
      )}
    </div>
  );
}
