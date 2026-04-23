import i18next from 'i18next'

/**
 * Bilingual text shape: { en: "...", fr: "..." }
 * Used for data-driven labels that need to display in the user's language.
 */
export interface BilingualText {
  en: string
  fr: string
}

/**
 * Resolve a value that may be a plain string or a BilingualText object
 * to the current i18n language. Falls back to English if current language
 * is not found.
 *
 * - string       → returned as-is (backward compatible)
 * - BilingualText → returns the value for current language
 * - null/undefined → returns fallback string
 */
export function resolveBilingualText(
  value: string | BilingualText | null | undefined,
  fallback = ''
): string {
  if (value == null) return fallback
  if (typeof value === 'string') return value
  const lang = (i18next.language || 'en').split('-')[0] as keyof BilingualText
  return value[lang] || value.en || fallback
}

/**
 * African country name translations (EN → FR).
 * Only countries whose names differ between English and French are listed.
 * Used to resolve API-returned country names to the current language.
 */
const COUNTRY_NAME_MAP: Record<string, Record<string, string>> = {
  en: {},
  fr: {
    'Algeria': 'Algérie',
    'Benin': 'Bénin',
    'Burkina Faso': 'Burkina Faso',
    'Burundi': 'Burundi',
    'Cameroon': 'Cameroun',
    'Cape Verde': 'Cap-Vert',
    'Cabo Verde': 'Cap-Vert',
    'Central African Republic': 'République centrafricaine',
    'Chad': 'Tchad',
    'Comoros': 'Comores',
    'Congo': 'Congo',
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Côte d'Ivoire": "Côte d'Ivoire",
    'Democratic Republic of the Congo': 'RD Congo',
    'DR Congo': 'RD Congo',
    'Djibouti': 'Djibouti',
    'Egypt': 'Égypte',
    'Equatorial Guinea': 'Guinée équatoriale',
    'Eritrea': 'Érythrée',
    'Eswatini': 'Eswatini',
    'Ethiopia': 'Éthiopie',
    'Gabon': 'Gabon',
    'Gambia': 'Gambie',
    'Ghana': 'Ghana',
    'Guinea': 'Guinée',
    'Guinea-Bissau': 'Guinée-Bissau',
    'Kenya': 'Kenya',
    'Lesotho': 'Lesotho',
    'Liberia': 'Libéria',
    'Libya': 'Libye',
    'Madagascar': 'Madagascar',
    'Malawi': 'Malawi',
    'Mali': 'Mali',
    'Mauritania': 'Mauritanie',
    'Mauritius': 'Maurice',
    'Morocco': 'Maroc',
    'Mozambique': 'Mozambique',
    'Namibia': 'Namibie',
    'Niger': 'Niger',
    'Nigeria': 'Nigeria',
    'Rwanda': 'Rwanda',
    'Sao Tome and Principe': 'Sao Tomé-et-Principe',
    'Senegal': 'Sénégal',
    'Seychelles': 'Seychelles',
    'Sierra Leone': 'Sierra Leone',
    'Somalia': 'Somalie',
    'South Africa': 'Afrique du Sud',
    'South Sudan': 'Soudan du Sud',
    'Sudan': 'Soudan',
    'Tanzania': 'Tanzanie',
    'Togo': 'Togo',
    'Tunisia': 'Tunisie',
    'Uganda': 'Ouganda',
    'Zambia': 'Zambie',
    'Zimbabwe': 'Zimbabwe',
    'Western Sahara': 'Sahara occidental',
  },
}

/**
 * Resolve an API-returned country name to the current language.
 * Falls back to the original name if no translation exists.
 */
export function resolveCountryName(name: string | null | undefined): string {
  if (!name) return ''
  const lang = (i18next.language || 'en').split('-')[0]
  if (lang === 'en') return name // English is the source language, no lookup needed
  return COUNTRY_NAME_MAP[lang]?.[name] || name
}
