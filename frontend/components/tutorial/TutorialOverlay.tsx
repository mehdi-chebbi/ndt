'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { tutorialSteps, TutorialStep } from './TutorialConfig'

interface TutorialOverlayProps {
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  onSwitchTab?: (tab: 'basemaps' | 'data' | 'stats') => void
  onActivateRandomLayer?: () => void
  onCleanup?: () => void
}

/** Extra padding around the highlighted target element */
const SPOTLIGHT_PAD = 8

export default function TutorialOverlay({
  isActive,
  onComplete,
  onSkip,
  onSwitchTab,
  onActivateRandomLayer,
  onCleanup,
}: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<'skip' | 'complete'>('skip')
  const [isPerformingAction, setIsPerformingAction] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────
  /** The currently highlighted target DOM element */
  const targetElRef = useRef<HTMLElement | null>(null)
  /** The previous target — so we can restore its inline styles */
  const prevTargetRef = useRef<HTMLElement | null>(null)
  /** Store original position and z-index for proper restoration */
  const originalStylesRef = useRef<Map<HTMLElement, { position?: string; zIndex?: string }>>(new Map())
  /** Collects cleanup functions for event listeners */
  const cleanupFnsRef = useRef<(() => void)[]>([] as (() => void)[])
  /** Track the activated layer for cleanup */
  const activatedLayerRef = useRef<string | null>(null)

  const { t } = useTranslation('tutorial')
  const step: TutorialStep = tutorialSteps[stepIndex]
  const isLastStep = stepIndex === tutorialSteps.length - 1
  const isCenter = step?.target === 'body' || step?.position === 'center'

  // ── Core navigation ────────────────────────────────────────────
  const cleanupListeners = useCallback(() => {
    cleanupFnsRef.current.forEach(fn => fn())
    cleanupFnsRef.current = []
  }, [])

  const restoreTarget = useCallback(() => {
    if (prevTargetRef.current) {
      const target = prevTargetRef.current
      const originalStyles = originalStylesRef.current.get(target)

      // Restore original styles, or remove if there were no inline styles before
      if (originalStyles) {
        if (originalStyles.position) {
          target.style.position = originalStyles.position
        } else {
          target.style.removeProperty('position')
        }
        if (originalStyles.zIndex) {
          target.style.zIndex = originalStyles.zIndex
        } else {
          target.style.removeProperty('zIndex')
        }
      } else {
        target.style.removeProperty('position')
        target.style.removeProperty('zIndex')
      }

      originalStylesRef.current.delete(target)
      prevTargetRef.current = null
    }
  }, [])

  const performStepTransition = useCallback(async (nextStepIndex: number) => {
    setIsPerformingAction(true)

    // Step 3 → 4: Switch to Data tab
    if (stepIndex === 2 && nextStepIndex === 3 && onSwitchTab) {
      onSwitchTab('data')
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Step 4 → 5: Activate random layer
    if (stepIndex === 3 && nextStepIndex === 4 && onActivateRandomLayer) {
      onActivateRandomLayer()
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Step 7 → 8: Switch to Stats tab
    if (stepIndex === 6 && nextStepIndex === 7 && onSwitchTab) {
      onSwitchTab('stats')
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setIsPerformingAction(false)
  }, [stepIndex, onSwitchTab, onActivateRandomLayer])

  const handleSkip = () => { setConfirmType('skip'); setConfirmOpen(true) }
  const handleEndTour = useCallback(() => {
    // Directly end tour without confirmation
    restoreTarget()
    cleanupListeners()
    if (onCleanup) {
      onCleanup()
    }
    onComplete()
  }, [restoreTarget, cleanupListeners, onCleanup, onComplete])

  const advance = useCallback(async () => {
    if (isPerformingAction) return

    // Check if this is the last step (completion step)
    if (isLastStep) {
      handleEndTour()
      return
    }

    restoreTarget()
    cleanupListeners()

    // Perform any transitions needed
    await performStepTransition(stepIndex + 1)

    if (stepIndex < tutorialSteps.length - 1) {
      setStepIndex(i => i + 1)
    }
  }, [stepIndex, isLastStep, isPerformingAction, restoreTarget, cleanupListeners, performStepTransition, handleEndTour])

  const goPrevious = useCallback(() => {
    if (isPerformingAction) return

    restoreTarget()
    cleanupListeners()
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }, [stepIndex, isPerformingAction, restoreTarget, cleanupListeners])

  const handleConfirm = () => {
    setConfirmOpen(false)
    restoreTarget()
    cleanupListeners()

    if (confirmType === 'complete' && onCleanup) {
      onCleanup()
    }

    confirmType === 'skip' ? onSkip() : onComplete()
  }

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
        restoreTarget()
      }

      // Store original styles before modifying
      const computedStyle = window.getComputedStyle(target)
      originalStylesRef.current.set(target, {
        position: target.style.position || undefined,
        zIndex: target.style.zIndex || undefined,
      })

      // Boost z-index so the target sits above the overlay
      // Only change position if it's static - preserve fixed/absolute/relative positioning
      const currentPosition = computedStyle.position
      if (currentPosition === 'static') {
        target.style.position = 'relative'
      }
      // If already fixed, absolute, or relative, keep it as is - just boost z-index
      target.style.zIndex = '9999'
      prevTargetRef.current = target

      // Scroll into view (only if target is off-screen and auto-scroll is enabled)
      const r = target.getBoundingClientRect()
      if (!step.disableAutoScroll && (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth)) {
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
    }, 150) // give tabs/menus time to render after a click

    return () => clearTimeout(timer)
  }, [isActive, step, stepIndex])

  // ── Full cleanup when tutorial is deactivated ──────────────────
  useEffect(() => {
    if (!isActive) {
      restoreTarget()
      cleanupListeners()
      setRect(null)
      setStepIndex(0)
      setIsPerformingAction(false)
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
              {t('overlay.stepProgress', { current: stepIndex + 1, total: tutorialSteps.length })}
            </span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-gray-500">
              {t(`steps.${step.id}.phase`)}
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
        <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{t(`steps.${step.id}.title`)}</h3>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{t(`steps.${step.id}.content`)}</p>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={goPrevious}
              disabled={isPerformingAction}
              className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('overlay.previous')}
            </button>
          )}

          <button
            onClick={advance}
            disabled={isPerformingAction}
            className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPerformingAction ? (
              <>
                <span className="w-3 h-3 border-[2px] border-white border-t-transparent rounded-full animate-spin" />
                {t('overlay.processing')}
              </>
            ) : (
              isLastStep ? t('overlay.endTour') : t('overlay.next')
            )}
          </button>

          {!isLastStep && (
            <button
              onClick={handleSkip}
              disabled={isPerformingAction}
              className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-gray-600 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('overlay.skip')}
            </button>
          )}
        </div>
      </div>

      {/* ── Confirmation dialog ────────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
              {confirmType === 'skip' ? t('overlay.skipConfirmTitle') : t('overlay.completeConfirmTitle')}
            </h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              {confirmType === 'skip'
                ? t('overlay.skipConfirmMessage')
                : t('overlay.completeConfirmMessage')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                {t('overlay.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                {confirmType === 'skip' ? t('overlay.skipTour') : t('overlay.complete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
