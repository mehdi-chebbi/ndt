'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TutorialButtonProps {
  onStart: () => void
  isCompleted?: boolean
}

export default function TutorialButton({ onStart, isCompleted }: TutorialButtonProps) {
  const { t } = useTranslation('tutorial')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    if (isCompleted) {
      setShowConfirm(true)
    } else {
      onStart()
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition whitespace-nowrap"
        title={isCompleted ? t('button.showTutorialAgain') : t('button.startTutorial')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {isCompleted ? t('button.showTutorialLabel') : t('button.startTutorialLabel')}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
              {t('button.startAgainTitle')}
            </h3>
            <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
              {t('button.startAgainDescription')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                {t('button.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  onStart()
                }}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                {t('button.startTutorialBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
