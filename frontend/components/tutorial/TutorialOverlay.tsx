'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { tutorialSteps, TutorialStep } from './TutorialConfig'

interface TutorialOverlayProps {
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
}

/** Extra padding around the highlighted target element */
const SPOTLIGHT_PAD = 8

export default function TutorialOverlay({ isActive, onComplete, onSkip }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'skip' | 'complete'>('skip')

  // ── Refs ──────────────────────────────────────────────────────
  /** The currently highlighted target DOM element */
  const targetElRef = useRef<HTMLElement | null>(null)
  /** The previous target — so we can restore its inline styles */
  const prevTargetRef = useRef<HTMLElement | null>(null)
  /** Collects cleanup functions for event listeners */
  const cleanupFnsRef = useRef<(() => void)[]>([] as (() => void)[])
  /** Stable ref to the advance function so event handlers never go stale */
  const advanceRef = useRef<() => void>(() => {})

  const step: TutorialStep = tutorialSteps[stepIndex]
  const isLastStep = stepIndex === tutorialSteps.length - 1
  const isWaiting = step?.waitForAction && step?.actionType !== 'none'
  const isCenter = step?.target === 'body' || step?.position === 'center'

  // ── Core navigation ────────────────────────────────────────────
  const cleanupListeners = useCallback(() => {
    cleanupFnsRef.current.forEach(fn => fn())
    cleanupFnsRef.current = []
  }, [])

  const restoreTarget = useCallback(() => {
    if (prevTargetRef.current) {
      prevTargetRef.current.style.removeProperty('position')
      prevTargetRef.current.style.removeProperty('zIndex')
      prevTargetRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    restoreTarget()
    cleanupListeners()
    if (stepIndex < tutorialSteps.length - 1) {
      setStepIndex(i => i + 1)
    }
    // On the last step the "End Tour" button triggers confirm dialog
  }, [stepIndex, restoreTarget, cleanupListeners])

  // Keep the ref in sync so event handlers always call the latest version
  advanceRef.current = advance

  const goPrevious = useCallback(() => {
    restoreTarget()
    cleanupListeners()
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }, [stepIndex, restoreTarget, cleanupListeners])

  const handleSkip = () => { setConfirmType('skip'); setConfirmOpen(true) }
  const handleEndTour = () => { setConfirmType('complete'); setConfirmOpen(true) }

  const handleConfirm = () => {
    setConfirmOpen(false)
    restoreTarget()
    cleanupListeners()
    confirmType === 'skip' ? onSkip() : onComplete()
  }

  // ── Action listeners ───────────────────────────────────────────
  const attachListeners = useCallback(
    (target: HTMLElement, s: TutorialStep) => {
      const go = () => setTimeout(() => advanceRef.current(), 120)

      switch (s.actionType) {
        case 'click':
        case 'submit': {
          const handler = () => go()
          target.addEventListener('click', handler, true)
          cleanupFnsRef.current.push(() => target.removeEventListener('click', handler, true))
          break
        }
        case 'select': {
          const handler = () => go()
          target.addEventListener('change', handler, true)
          cleanupFnsRef.current.push(() => target.removeEventListener('change', handler, true))
          break
        }
        case 'draw': {
          const handler = () => go()
          window.addEventListener('tutorial-draw-complete', handler)
          cleanupFnsRef.current.push(() => window.removeEventListener('tutorial-draw-complete', handler))
          break
        }
        case 'slide': {
          const handler = () => go()
          window.addEventListener('tutorial-slide-complete', handler)
          cleanupFnsRef.current.push(() => window.removeEventListener('tutorial-slide-complete', handler))
          break
        }
        case 'type': {
          const handler = (e: Event) => {
            if ((e as CustomEvent).detail?.sent) go()
          }
          window.addEventListener('ai-message-sent', handler)
          cleanupFnsRef.current.push(() => window.removeEventListener('ai-message-sent', handler))
          break
        }
        case 'activate_layer': {
          const handler = () => go()
          window.addEventListener('layer-activated', handler)
          cleanupFnsRef.current.push(() => window.removeEventListener('layer-activated', handler))
          break
        }
      }
    },
    [], // `advanceRef` is stable
  )

  // ── Find target, boost z-index, track position ────────────────
  useEffect(() => {
    if (!isActive || !step) return

    const timer = setTimeout(() => {
      const target = step.target === 'body'
        ? document.body
        : document.querySelector(step.target) as HTMLElement | null

      if (!target) {
        console.warn(`[Tutorial] Target not found: "${step.target}"`)
        return
      }

      targetElRef.current = target

      // Restore previous target
      if (prevTargetRef.current && prevTargetRef.current !== target) {
        prevTargetRef.current.style.removeProperty('position')
        prevTargetRef.current.style.removeProperty('zIndex')
      }

      // Boost z-index so the target sits above the overlay
      target.style.position = 'relative'
      target.style.zIndex = '9999'
      prevTargetRef.current = target

      // Scroll into view (only if target is off-screen)
      const r = target.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // Measure position
      const measure = () => setRect(target.getBoundingClientRect())
      measure()

      // Keep measurements up-to-date on scroll / resize
      const ro = new ResizeObserver(measure)
      ro.observe(target)
      window.addEventListener('scroll', measure, true)
      window.addEventListener('resize', measure)
      cleanupFnsRef.current.push(() => {
        ro.disconnect()
        window.removeEventListener('scroll', measure, true)
        window.removeEventListener('resize', measure)
      })

      // Attach action-based listeners
      if (step.waitForAction && step.actionType !== 'none') {
        attachListeners(target, step)
      }
    }, 150) // give tabs/menus time to render after a click

    return () => clearTimeout(timer)
  }, [isActive, step, stepIndex, attachListeners])

  // ── Full cleanup when tutorial is deactivated ──────────────────
  useEffect(() => {
    if (!isActive) {
      restoreTarget()
      cleanupListeners()
      setRect(null)
      setStepIndex(0)
    }
  }, [isActive, restoreTarget, cleanupListeners])

  // ── Render ─────────────────────────────────────────────────────
  if (!isActive || !step) return null

  // ── CSS mask that punches a hole in the overlay ────────────────
  const overlayMask = (): React.CSSProperties => {
    if (!rect || isCenter) return {}
    const t = rect.top - SPOTLIGHT_PAD
    const l = rect.left - SPOTLIGHT_PAD
    const w = rect.width + SPOTLIGHT_PAD * 2
    const h = rect.height + SPOTLIGHT_PAD * 2
    return {
      WebkitMaskImage: `linear-gradient(#000,#000),linear-gradient(#000,#000)`,
      WebkitMaskSize: '100% 100%, ' + w + 'px ' + h + 'px',
      WebkitMaskPosition: '0 0, ' + l + 'px ' + t + 'px',
      WebkitMaskRepeat: 'no-repeat, no-repeat',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
    }
  }

  // ── Smart tooltip positioning ──────────────────────────────────
  const tooltipPos = (): React.CSSProperties => {
    if (isCenter || !rect) {
      return { position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
    }

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const tw = 400
    const gap = 16
    let top: number, left: number

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + SPOTLIGHT_PAD + gap
        left = rect.left + rect.width / 2 - tw / 2
        break
      case 'top':
        top = rect.top - SPOTLIGHT_PAD - gap - 220 // approximate card height
        left = rect.left + rect.width / 2 - tw / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - 110
        left = rect.left - SPOTLIGHT_PAD - gap - tw
        break
      default: // right
        top = rect.top + rect.height / 2 - 110
        left = rect.right + SPOTLIGHT_PAD + gap
        break
    }

    // Clamp within viewport
    top = Math.max(12, Math.min(top, vh - 260))
    left = Math.max(12, Math.min(left, vw - tw - 12))

    return { position: 'fixed' as const, top, left }
  }

  return (
    <>
      {/* ── Dark overlay with blur + mask cutout ─────────────────── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          pointerEvents: 'none', // let clicks pass through to boosted z-index target
          ...overlayMask(),
        }}
      />

      {/* ── Green spotlight border ─────────────────────────────── */}
      {!isCenter && rect && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9999,
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            borderRadius: 8,
            border: '3px solid #22c55e',
            boxShadow: '0 0 0 2px rgba(34,197,94,0.25), 0 0 24px rgba(34,197,94,0.15)',
            pointerEvents: 'none',
            transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
          }}
        />
      )}

      {/* ── Tooltip card ────────────────────────────────────────── */}
      <div
        style={{
          zIndex: 10000,
          width: 'min(400px, calc(100vw - 32px))',
          ...tooltipPos(),
        }}
        className="bg-white rounded-xl shadow-2xl p-5"
      >
        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
            <span>
              Step {stepIndex + 1} of {tutorialSteps.length}
            </span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-gray-500">
              {step.phase}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{step.title}</h3>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{step.content}</p>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={goPrevious}
              className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              Previous
            </button>
          )}

          {!isWaiting && (
            <button
              onClick={isLastStep ? handleEndTour : advance}
              className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
            >
              {isLastStep ? 'End Tour' : 'Next'}
            </button>
          )}

          {isWaiting && (
            <div className="flex-1 flex items-center justify-center gap-1.5 text-[13px] text-gray-400 select-none">
              <span className="w-3 h-3 border-[2px] border-green-400 border-t-transparent rounded-full animate-spin" />
              Waiting for action…
            </div>
          )}

          <button
            onClick={handleSkip}
            className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-gray-600 transition shrink-0"
          >
            Skip
          </button>
        </div>
      </div>

      {/* ── Confirmation dialog ────────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
              {confirmType === 'skip' ? 'Skip Tutorial?' : 'Complete Tutorial?'}
            </h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              {confirmType === 'skip'
                ? 'This will mark the tutorial as complete. You can always restart it from the "Show Tutorial" button in the sidebar.'
                : "You've completed the tutorial! Mark it as done so it doesn't show automatically again?"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                {confirmType === 'skip' ? 'Skip Tour' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
