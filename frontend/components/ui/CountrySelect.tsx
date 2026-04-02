'use client'

import { useState, useRef, useEffect } from 'react'
import { COUNTRIES } from '@/lib/countries'

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function CountrySelect({ value, onChange, placeholder = 'Select your country' }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCountry = COUNTRIES.find(c => c.name === value)

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (!selectedCountry) setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCountry])

  const handleSelect = (name: string) => {
    onChange(name)
    setSearch('')
    setIsOpen(false)
  }

  const handleFocus = () => {
    setIsOpen(true)
    if (selectedCountry) setSearch('')
  }

  const handleBlur = () => {
    // Delay close so click on dropdown item registers
    setTimeout(() => {
      setIsOpen(false)
      if (!selectedCountry) setSearch('')
    }, 150)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedCountry?.name || '')}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={selectedCountry ? '' : placeholder}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-sm bg-white pr-10"
        />
        {/* Chevron */}
        <svg
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Hidden select for form validation — required prevents empty submission */}
      <select
        required
        value={value}
        onChange={() => {}}
        className="absolute opacity-0 -top-10 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="" disabled={!value}>{placeholder}</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.name}>{c.name}</option>
        ))}
      </select>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {filteredCountries.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No countries found</div>
          ) : (
            <div className="overflow-y-auto max-h-60">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => handleSelect(country.name)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    country.name === value ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {country.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
