'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
] as const

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const current = languages.find(l => l.code === currentLang) ?? languages[0]

  const handleChange = (lang: 'en' | 'fr') => {
    i18n.changeLanguage(lang)
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <span>{current.flag}</span>
        <span>{current.short}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg bg-[#111916] border border-white/10 shadow-xl py-1 z-50"
          role="listbox"
          aria-label="Language options"
        >
          {languages.map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => handleChange(code)}
              role="option"
              aria-selected={currentLang === code}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 border-none cursor-pointer ${
                currentLang === code
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              <span className="text-base">{flag}</span>
              <span>{label}</span>
              {currentLang === code && (
                <svg className="w-4 h-4 ml-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
