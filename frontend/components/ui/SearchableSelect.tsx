'use client'

import { useState, useRef, useEffect } from 'react'

interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  [key: string]: any // allow data-* attributes
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  ...rest
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const handleSelect = (val: string) => {
    onChange(val)
    setSearch('')
    setIsOpen(false)
  }

  const handleFocus = () => {
    if (disabled) return
    setIsOpen(true)
    if (selectedOption) setSearch('')
    // Focus input after opening
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Truncate label for the trigger display
  const truncate = (text: string, maxLen = 38) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen - 1) + '…'
  }

  return (
    <div ref={containerRef} className="relative" {...rest}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleFocus}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-gray-400' : ''}`}>
          {selectedOption ? truncate(selectedOption.label) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-transparent outline-none"
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-52">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors break-words ${
                    option.value === value
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
