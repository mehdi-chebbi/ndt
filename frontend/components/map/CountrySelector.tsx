'use client'

import { useState, useEffect, useRef } from 'react'
import { authFetch } from '@/lib/authFetch'

interface Country {
  name: string
  file: string
}

interface CountrySelectorProps {
  selectedCountry: string | null
  onSelectCountry: (country: Country | null) => void
  disabled?: boolean
}

export default function CountrySelector({ selectedCountry, onSelectCountry, disabled }: CountrySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await authFetch('/countries', { skipAuth: true })
        if (!res.ok) throw new Error('Failed to fetch countries')
        const data = await res.json()
        setCountries(data)
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCountries()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter countries by search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (country: Country) => {
    onSelectCountry(country)
    setSearch('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelectCountry(null)
    setSearch('')
  }

  return (
    <div ref={dropdownRef} data-tutorial="country-selector" className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 
          bg-white border border-gray-300 rounded-lg shadow-sm
          text-sm font-medium text-gray-700
          min-w-[200px]
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50 cursor-pointer'
          }
          transition-colors duration-150
        `}
      >
        <span className="truncate">
          {isLoading ? 'Loading countries...' : selectedCountry || 'Select a country'}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Clear button */}
          {selectedCountry && (
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 border-b border-gray-200"
            >
              Clear selection
            </button>
          )}

          {/* Country list */}
          <div className="overflow-y-auto max-h-56">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.file}
                  onClick={() => handleSelect(country)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100
                    ${selectedCountry === country.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    transition-colors duration-100
                  `}
                >
                  {country.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
