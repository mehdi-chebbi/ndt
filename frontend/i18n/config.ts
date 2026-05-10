import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enCommon from '@/locales/en/common.json'
import frCommon from '@/locales/fr/common.json'
import enLogin from '@/locales/en/login.json'
import frLogin from '@/locales/fr/login.json'
import enSignup from '@/locales/en/signup.json'
import frSignup from '@/locales/fr/signup.json'
import enForgotPassword from '@/locales/en/forgot-password.json'
import frForgotPassword from '@/locales/fr/forgot-password.json'
import enCompleteProfile from '@/locales/en/complete-profile.json'
import frCompleteProfile from '@/locales/fr/complete-profile.json'
import enLanding from '@/locales/en/landing.json'
import frLanding from '@/locales/fr/landing.json'
import enDashboard from '@/locales/en/dashboard.json'
import frDashboard from '@/locales/fr/dashboard.json'
import enProfile from '@/locales/en/profile.json'
import frProfile from '@/locales/fr/profile.json'
import enReportView from '@/locales/en/report-view.json'
import frReportView from '@/locales/fr/report-view.json'
import enMap from '@/locales/en/map.json'
import frMap from '@/locales/fr/map.json'
import enReports from '@/locales/en/reports.json'
import frReports from '@/locales/fr/reports.json'
import enWaterwatch from '@/locales/en/waterwatch.json'
import frWaterwatch from '@/locales/fr/waterwatch.json'
import enGiniwatch from '@/locales/en/giniwatch.json'
import frGiniwatch from '@/locales/fr/giniwatch.json'
import enAdmin from '@/locales/en/admin.json'
import frAdmin from '@/locales/fr/admin.json'
import enTutorial from '@/locales/en/tutorial.json'
import frTutorial from '@/locales/fr/tutorial.json'
import enAiCopilot from '@/locales/en/ai-copilot.json'
import frAiCopilot from '@/locales/fr/ai-copilot.json'
import enLdnInAfrica from '@/locales/en/ldn-in-africa.json'
import frLdnInAfrica from '@/locales/fr/ldn-in-africa.json'
import enGeoportail from '@/locales/en/geoportail.json'
import frGeoportail from '@/locales/fr/geoportail.json'
import enLdnDashboard from '@/locales/en/ldn-dashboard.json'
import frLdnDashboard from '@/locales/fr/ldn-dashboard.json'
import enSuccessStories from '@/locales/en/success-stories.json'
import frSuccessStories from '@/locales/fr/success-stories.json'
import enStory from '@/locales/en/story.json'
import frStory from '@/locales/fr/story.json'
import enContribution from '@/locales/en/contribution.json'
import frContribution from '@/locales/fr/contribution.json'
import enResources from '@/locales/en/resources.json'
import frResources from '@/locales/fr/resources.json'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from './settings'

const resources = {
  en: {
    common: enCommon,
    login: enLogin,
    signup: enSignup,
    'forgot-password': enForgotPassword,
    'complete-profile': enCompleteProfile,
    landing: enLanding,
    dashboard: enDashboard,
    profile: enProfile,
    'report-view': enReportView,
    map: enMap,
    reports: enReports,
    waterwatch: enWaterwatch,
    giniwatch: enGiniwatch,
    admin: enAdmin,
    tutorial: enTutorial,
    'ai-copilot': enAiCopilot,
    'ldn-in-africa': enLdnInAfrica,
    geoportail: enGeoportail,
    'ldn-dashboard': enLdnDashboard,
    'success-stories': enSuccessStories,
    story: enStory,
    contribution: enContribution,
    resources: enResources,
  },
  fr: {
    common: frCommon,
    login: frLogin,
    signup: frSignup,
    'forgot-password': frForgotPassword,
    'complete-profile': frCompleteProfile,
    landing: frLanding,
    dashboard: frDashboard,
    profile: frProfile,
    'report-view': frReportView,
    map: frMap,
    reports: frReports,
    waterwatch: frWaterwatch,
    giniwatch: frGiniwatch,
    admin: frAdmin,
    tutorial: frTutorial,
    'ai-copilot': frAiCopilot,
    'ldn-in-africa': frLdnInAfrica,
    geoportail: frGeoportail,
    'ldn-dashboard': frLdnDashboard,
    'success-stories': frSuccessStories,
    story: frStory,
    contribution: frContribution,
    resources: frResources,
  },
}

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    load: 'languageOnly',
  })

export default i18next
