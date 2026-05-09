"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScrollStep<TMeta = Record<string, unknown>> {
  id: string;
  meta: TMeta;
}

interface ScrollytellingLayoutProps<TMeta> {
  steps: ScrollStep<TMeta>[];
  visual: (activeMeta: TMeta, activeId: string) => ReactNode;
  renderStep: (step: ScrollStep<TMeta>, isActive: boolean) => ReactNode;
  stepHeight?: string;
  bottomPad?: string;
  className?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useScrollytelling<TMeta>(steps: ScrollStep<TMeta>[]) {
  const [activeId, setActiveId] = useState<string>(steps[0]?.id ?? "");
  const stepEls = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.stepId;
            if (id) setActiveId(id);
          }
        });
      },
      {
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0,
      }
    );

    stepEls.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [steps]);

  const stepRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) {
        el.dataset.stepId = id;
        stepEls.current.set(id, el);
      } else {
        stepEls.current.delete(id);
      }
    },
    []
  );

  return { activeId, stepRef };
}

// ── Layout component ──────────────────────────────────────────────────────────

export function ScrollytellingLayout<TMeta>({
  steps,
  visual,
  renderStep,
  stepHeight = "100vh",
  bottomPad = "50vh",
  className = "",
}: ScrollytellingLayoutProps<TMeta>) {
  const { activeId, stepRef } = useScrollytelling(steps);
  const activeMeta = steps.find((s) => s.id === activeId)?.meta ?? steps[0].meta;

  return (
    <section className={`relative ${className}`}>
      <div className="flex flex-col md:flex-row">
        {/* Sticky visual panel */}
        <div
          className={[
            "sticky top-0 z-0",
            "w-full h-[50vh]",
            "md:w-1/2 md:h-screen",
            "shrink-0",
          ].join(" ")}
        >
          <div className="relative w-full h-full overflow-hidden bg-zinc-900">
            {visual(activeMeta, activeId)}
          </div>
        </div>

        {/* Scrolling text column */}
        <div
          className="relative z-10 w-full md:w-1/2"
          style={{ paddingBottom: bottomPad }}
        >
          {steps.map((step) => (
            <div
              key={step.id}
              ref={stepRef(step.id) as React.RefCallback<HTMLDivElement>}
              style={{ minHeight: stepHeight }}
              className="flex items-center px-6 md:px-12 py-16"
            >
              {renderStep(step, step.id === activeId)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

interface ScrollProgressDotsProps {
  steps: ScrollStep<unknown>[];
  activeId: string;
}

export function ScrollProgressDots({ steps, activeId }: ScrollProgressDotsProps) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 hidden md:flex">
      {steps.map((step) => (
        <div
          key={step.id}
          className={[
            "w-2 h-2 rounded-full transition-all duration-300",
            step.id === activeId
              ? "bg-green-400 scale-150"
              : "bg-zinc-600 hover:bg-zinc-400",
          ].join(" ")}
          title={step.id}
        />
      ))}
    </div>
  );
}
