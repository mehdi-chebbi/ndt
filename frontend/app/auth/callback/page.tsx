'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    const token = searchParams.get('token')
    const userStr = searchParams.get('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))

        login(token, user)

        if (!user.profile_complete) {
          router.push('/complete-profile')
          return
        }

        if (user.role === 'admin') {
          router.push('/admin')
        } else if (!user.tutorial_completed) {
          router.push('/map?autoTutorial=true')
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/login?error=invalid_callback_data')
      }
    } else {
      router.push('/login?error=no_token_provided')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('signingYouIn')}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  const { t } = useTranslation()

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
