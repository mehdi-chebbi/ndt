"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  type Variants,
  type Transition,
} from "framer-motion";

// ── Shared defaults ───────────────────────────────────────────────────────────

const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;

// ── 1. Line-by-line reveal ────────────────────────────────────────────────────

interface RevealLinesProps {
  children: ReactNode;
  delay?: number;
  staggerDelay?: number;
  yOffset?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
};

export function RevealLines({
  children,
  delay = 0,
  staggerDelay = 0.1,
  yOffset = 40,
  duration = 0.8,
  once = true,
  className = "",
}: RevealLinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: yOffset, filter: "blur(4px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: {
                    duration,
                    ease: CINEMATIC_EASE,
                  } as Transition,
                },
              }}
            >
              {child}
            </motion.div>
          ))
        : <motion.div variants={lineVariants}>{children}</motion.div>}
    </motion.div>
  );
}

// ── 2. Word-by-word reveal ────────────────────────────────────────────────────

interface RevealWordsProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  duration?: number;
  yOffset?: number;
  once?: boolean;
  className?: string;
  wordClassName?: string;
}

export function RevealWords({
  text,
  delay = 0,
  staggerDelay = 0.04,
  duration = 0.6,
  yOffset = 32,
  once = true,
  className = "",
  wordClassName = "",
}: RevealWordsProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });
  const words = text.split(" ");

  return (
    <p
      ref={ref}
      className={`overflow-hidden ${className}`}
      aria-label={text}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
          <motion.span
            className={`inline-block ${wordClassName}`}
            initial={{ opacity: 0, y: yOffset }}
            animate={
              isInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: yOffset }
            }
            transition={{
              delay: delay + i * staggerDelay,
              duration,
              ease: CINEMATIC_EASE,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </p>
  );
}

// ── 3. Title card ─────────────────────────────────────────────────────────────

interface TitleCardProps {
  eyebrow?: string;
  heading: string;
  body?: string;
  delay?: number;
  once?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}

export function TitleCard({
  eyebrow,
  heading,
  body,
  delay = 0,
  once = true,
  align = "left",
  className = "",
}: TitleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-15% 0px -15% 0px" });

  const alignClass = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  }[align];

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-6 ${alignClass} ${className}`}
    >
      {eyebrow && (
        <motion.span
          className="text-xs font-bold uppercase tracking-[0.25em] text-green-400"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ delay, duration: 0.6, ease: CINEMATIC_EASE }}
        >
          {eyebrow}
        </motion.span>
      )}

      <motion.div
        className="h-px bg-gradient-to-r from-green-400/80 via-green-300/40 to-transparent"
        initial={{ scaleX: 0, originX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{
          delay: delay + 0.1,
          duration: 0.8,
          ease: CINEMATIC_EASE,
        }}
        style={{ width: "100%" }}
      />

      <RevealWords
        text={heading}
        delay={delay + 0.2}
        staggerDelay={0.05}
        duration={0.7}
        className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
        once={once}
      />

      {body && (
        <motion.p
          className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-prose"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{
            delay: delay + 0.6,
            duration: 0.8,
            ease: CINEMATIC_EASE,
          }}
        >
          {body}
        </motion.p>
      )}
    </div>
  );
}

// ── 4. Pull quote ─────────────────────────────────────────────────────────────

interface PullQuoteProps {
  stat: string;
  caption: string;
  delay?: number;
  once?: boolean;
  className?: string;
}

export function PullQuote({
  stat,
  caption,
  delay = 0,
  once = true,
  className = "",
}: PullQuoteProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-20% 0px -20% 0px" });

  return (
    <div ref={ref} className={`flex flex-col gap-2 ${className}`}>
      <motion.div
        className="text-[clamp(3rem,10vw,8rem)] font-black leading-none
                   text-transparent bg-clip-text
                   bg-gradient-to-br from-green-300 via-green-400 to-emerald-600
                   tabular-nums"
        initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
        animate={
          isInView
            ? { opacity: 1, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, scale: 0.8, filter: "blur(8px)" }
        }
        transition={{ delay, duration: 1, ease: CINEMATIC_EASE }}
      >
        {stat}
      </motion.div>
      <motion.p
        className="text-sm md:text-base text-zinc-400 uppercase tracking-widest"
        initial={{ opacity: 0, x: -16 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
        transition={{ delay: delay + 0.3, duration: 0.6, ease: CINEMATIC_EASE }}
      >
        {caption}
      </motion.p>
    </div>
  );
}
