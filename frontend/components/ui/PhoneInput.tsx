'use client'

import { useState, useEffect } from 'react'
import { COUNTRIES, getDialCode } from '@/lib/countries'

interface PhoneInputProps {
  country: string          // Country name — drives the dial code
  phone: string            // The full phone (dial + number), e.g. "+2348123456789"
  onPhoneChange: (phone: string) => void  // Called with the full phone string
  required?: boolean
}

export default function PhoneInput({ country, phone, onPhoneChange, required }: PhoneInputProps) {
  const dialCode = country ? getDialCode(country) : ''

  // Strip digits-only portion from the phone (remove the dial code prefix)
  const rawDigits = dialCode && phone.startsWith(dialCode)
    ? phone.slice(dialCode.length).replace(/\D/g, '')
    : phone.replace(/\D/g, '')

  // When country changes and we have digits, rebuild the phone with new code
  useEffect(() => {
    if (dialCode && rawDigits) {
      onPhoneChange(dialCode + rawDigits)
    } else if (dialCode && !rawDigits) {
      onPhoneChange('') // country selected but no number yet
    }
  }, [dialCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '')
    if (dialCode) {
      onPhoneChange(dialCode + digits)
    } else {
      onPhoneChange(digits)
    }
  }

  return (
    <div>
      <div className="flex">
        {/* Country code — read-only, auto-filled from country */}
        <div className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600 font-mono min-w-[70px] justify-center select-none">
          {dialCode || '🇺🇳'}
        </div>

        {/* Number input — digits only */}
        <input
          type="tel"
          inputMode="numeric"
          value={rawDigits}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={country ? '812 345 6789' : 'Select country first'}
          required={required}
          disabled={!country}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      {/* Hidden input for form validation */}
      <input
        type="hidden"
        required={required}
        value={phone}
        onChange={() => {}}
      />

      {!country && (
        <p className="text-xs text-amber-600 mt-1">Select a country above to enable the phone field</p>
      )}
    </div>
  )
}
