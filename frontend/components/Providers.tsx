'use client'

import { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { AuthProvider } from '@/contexts/AuthContext'
import i18n from '@/i18n/config'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </I18nextProvider>
  )
}
