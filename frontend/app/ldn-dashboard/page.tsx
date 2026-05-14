'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/authFetch'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { Doughnut } from 'react-chartjs-2'
import africaContinentalStats from '@/data/africa_continental_stats.json'
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

// ─── Types ────────────────────────────────────────────────────────────────────

interface CountryOption {
  name: string
  file: string
}

interface StatsClass {
  class_id: number
  class_name: string | { en: string; fr: string }
  pixels: number
  area_km2: number
  percentage: number
}

interface LayerStats {
  layer_name: string | null
  country_file: string
  total_area_km2: number
  pixel_size_m: number
  classes: StatsClass[]
  computed_at: string
}

interface LayerInfo {
  id: number
  geoserver_name: string
  display_name: string
  hasStats: boolean
}

// ─── Essential SO1 Layer Mapping ──────────────────────────────────────────────

// ─── Africa Option ───────────────────────────────────────────────────────────

const AFRICA_OPTION: CountryOption = { name: 'Africa', file: '__africa__' }

const isAfrica = (country: CountryOption | null): boolean => country?.file === '__africa__'

// Mapping from SO1_LAYERS keys to JSON keys in africa_continental_stats.json
const AFRICA_SO1_JSON_KEYS: Record<string, string> = {
  sdgBaseline: 'sdg_15_3_1_baseline_COG.tif',
  sdgReporting: 'sdg_15_3_1_reporting_COG.tif',
  landcover2023: 'LandCoverOSS2023V2COG.tif',
  lcChangeReporting: 'LC_change_OSS_Reporting_COG.tif',
  lpdReporting: 'LP_OSS_reporting_COG.tif',
  socBaseline: 'SOC_baseline_COG.tif',
  socReporting: 'SOC_reporting_COG.tif',
}

// SPI JSON keys for Africa
const AFRICA_SPI_JSON_KEYS = [
  { key: 'band_01_SPI_min_2000-2003_COG.tif', period: '2000-2003', startYear: 2000, endYear: 2003 },
  { key: 'band_03_SPI_min_2004-2007_COG.tif', period: '2004-2007', startYear: 2004, endYear: 2007 },
  { key: 'band_05_SPI_min_2008-2011_COG.tif', period: '2008-2011', startYear: 2008, endYear: 2011 },
  { key: 'band_07_SPI_min_2012-2015_COG.tif', period: '2012-2015', startYear: 2012, endYear: 2015 },
  { key: 'band_09_SPI_min_2016-2019_COG.tif', period: '2016-2019', startYear: 2016, endYear: 2019 },
  { key: 'band_11_SPI_min_2020-2023_COG.tif', period: '2020-2023', startYear: 2020, endYear: 2023 },
]

// Convert Africa JSON entry to LayerStats
function africaJsonToLayerStats(jsonKey: string): LayerStats | null {
  const entry = (africaContinentalStats as Record<string, any>)[jsonKey]
  if (!entry) return null
  // Filter out "No data" classes and recalculate percentages on meaningful area only
  const meaningfulClasses = entry.classes.filter((cls: any) => {
    const en = (cls.label?.en ?? '').toLowerCase()
    const fr = (cls.label?.fr ?? '').toLowerCase()
    return !en.includes('no data') && !fr.includes('aucune donnée')
  })
  const meaningfulArea = meaningfulClasses.reduce((sum: number, cls: any) => sum + cls.area_km2, 0)
  return {
    layer_name: jsonKey,
    country_file: '__africa__',
    total_area_km2: meaningfulArea,
    pixel_size_m: entry.pixel_size_m,
    computed_at: '',
    classes: meaningfulClasses.map((cls: any) => ({
      class_id: cls.class_id,
      class_name: cls.label, // { en, fr } format — already compatible with StatsClass
      pixels: cls.pixels,
      area_km2: cls.area_km2,
      percentage: Math.round((cls.area_km2 / meaningfulArea) * 1000) / 10,
    })),
  }
}

const SO1_LAYERS = {
  sdgBaseline: 'SDG:sdg_15_3_1_baseline_COG',
  sdgReporting: 'SDG:sdg_15_3_1_reporting_COG',
  landcover2023: 'LC:LandCoverOSS2023V2COG',
  lcChangeReporting: 'LCC:LC_change_OSS_Reporting_COG',
  lpdReporting: 'LP:LP_OSS_reporting_COG',
  socBaseline: 'SoilOrganicCarbon:SOC_baseline_COG',
  socReporting: 'SoilOrganicCarbon:SOC_reporting_COG',
}

// ─── SO2 Hardcoded Data (WaterWatch + GiniWatch) ─────────────────────────────

type WaterAccessEntry = { name: string; y2000: number | null; y2020: number | null; change: number | null }
type WaterGapEntry = { name: string; urban: number | null; rural: number | null }
type GiniReading = { year: number; val: number }
type GiniEntry = { name: string; readings: GiniReading[] }

const WATER_ACCESS: WaterAccessEntry[] = [
  { name: 'Morocco', y2000: 40.7, y2020: 73.3, change: 32.6 },
  { name: 'Uganda', y2000: 26.2, y2020: 56.3, change: 30.0 },
  { name: 'Tanzania', y2000: 28.6, y2020: 58.4, change: 29.8 },
  { name: 'Zambia', y2000: 46.2, y2020: 69.1, change: 22.9 },
  { name: 'Sierra Leone', y2000: 40.9, y2020: 63.4, change: 22.5 },
  { name: 'Gambia', y2000: 23.3, y2020: 45.5, change: 22.2 },
  { name: 'Ghana', y2000: 65.5, y2020: 85.8, change: 20.3 },
  { name: 'Lesotho', y2000: 8.7, y2020: 27.5, change: 18.8 },
  { name: 'Congo, Rep.', y2000: 27.9, y2020: 45.7, change: 17.8 },
  { name: 'Togo', y2000: 45.8, y2020: 62.0, change: 16.2 },
  { name: 'Nigeria', y2000: 12.6, y2020: 27.8, change: 15.2 },
  { name: 'Sudan', y2000: 45.7, y2020: 61.1, change: 15.3 },
  { name: 'Mozambique', y2000: 9.0, y2020: 23.3, change: 14.3 },
  { name: 'Madagascar', y2000: 7.3, y2020: 19.8, change: 12.4 },
  { name: 'Cote d\'Ivoire', y2000: 25.4, y2020: 38.7, change: 13.3 },
  { name: 'Egypt', y2000: 65.3, y2020: 76.6, change: 11.3 },
  { name: 'Sao Tome & Pr.', y2000: 26.0, y2020: 35.6, change: 9.7 },
  { name: 'Malawi', y2000: 7.0, y2020: 16.4, change: 9.5 },
  { name: 'Eswatini', y2000: 27.4, y2020: 36.7, change: 9.3 },
  { name: 'Botswana', y2000: 59.2, y2020: 65.8, change: 6.6 },
  { name: 'Ethiopia', y2000: 5.4, y2020: 12.0, change: 6.7 },
  { name: 'Tunisia', y2000: 87.5, y2020: 95.1, change: 7.6 },
  { name: 'Senegal', y2000: 20.0, y2020: 26.0, change: 5.9 },
  { name: 'Guinea-Bissau', y2000: 17.7, y2020: 23.4, change: 5.8 },
  { name: 'Algeria', y2000: 69.5, y2020: 70.5, change: 1.0 },
  { name: 'Benin', y2000: 14.2, y2020: 17.1, change: 2.9 },
  { name: 'Seychelles', y2000: 62.0, y2020: 64.2, change: 2.3 },
  { name: 'Chad', y2000: 5.5, y2020: 6.2, change: 0.6 },
  { name: 'Zimbabwe', y2000: 67.9, y2020: 67.2, change: -0.8 },
  { name: 'DR Congo', y2000: 12.2, y2020: 11.2, change: -1.0 },
  { name: 'Comoros', y2000: 87.3, y2020: 85.5, change: -1.9 },
  { name: 'C.A.R.', y2000: 8.5, y2020: 6.2, change: -2.4 },
  { name: 'Libya', y2000: null, y2020: 95.3, change: null },
]

const WATER_GAP: WaterGapEntry[] = [
  { name: 'Gambia', urban: 66.9, rural: 9.6 },
  { name: 'Lesotho', urban: 66.3, rural: 11.7 },
  { name: 'Eswatini', urban: 77.8, rural: 23.6 },
  { name: 'Malawi', urban: 50.8, rural: 9.2 },
  { name: 'Mozambique', urban: 45.5, rural: 10.2 },
  { name: 'Morocco', urban: 88.3, rural: 47.0 },
  { name: 'Madagascar', urban: 35.7, rural: 9.8 },
  { name: 'DR Congo', urban: 23.9, rural: 0.5 },
  { name: 'C.A.R.', urban: 11.5, rural: 2.3 },
  { name: 'Chad', urban: 17.5, rural: 2.7 },
  { name: 'Ethiopia', urban: 38.0, rural: 4.8 },
  { name: 'Guinea-Bissau', urban: 36.4, rural: 13.2 },
  { name: 'Nigeria', urban: 35.1, rural: 19.9 },
  { name: 'Senegal', urban: 40.8, rural: 12.2 },
  { name: 'Cote d\'Ivoire', urban: 53.5, rural: 22.8 },
  { name: 'Congo, Rep.', urban: 58.6, rural: 18.4 },
  { name: 'Sao Tome & Pr.', urban: 39.8, rural: 23.6 },
  { name: 'Tanzania', urban: 83.2, rural: 44.9 },
  { name: 'Uganda', urban: 78.3, rural: 49.0 },
  { name: 'Sudan', urban: 71.9, rural: 55.2 },
  { name: 'Togo', urban: 74.6, rural: 52.6 },
  { name: 'Zambia', urban: 89.0, rural: 53.1 },
  { name: 'Zimbabwe', urban: 93.9, rural: 54.5 },
  { name: 'Ghana', urban: 95.8, rural: 72.4 },
  { name: 'South Africa', urban: 98.3, rural: 76.4 },
  { name: 'Algeria', urban: 73.6, rural: 62.0 },
  { name: 'Comoros', urban: 89.8, rural: 83.7 },
  { name: 'Tunisia', urban: 98.3, rural: 87.8 },
  { name: 'Rwanda', urban: 49.1, rural: null },
]

const GINI_DATA: GiniEntry[] = [
  { name: 'Algeria', readings: [{ year: 2011, val: 27.6 }] },
  { name: 'Angola', readings: [{ year: 2000, val: 51.9 }, { year: 2008, val: 42.7 }, { year: 2018, val: 51.3 }] },
  { name: 'Benin', readings: [{ year: 2003, val: 38.6 }, { year: 2011, val: 43.4 }, { year: 2015, val: 47.6 }, { year: 2018, val: 37.9 }, { year: 2021, val: 34.4 }] },
  { name: 'Botswana', readings: [{ year: 2002, val: 61.5 }, { year: 2009, val: 56.9 }, { year: 2015, val: 54.9 }] },
  { name: 'Burkina Faso', readings: [{ year: 2003, val: 43.3 }, { year: 2009, val: 39.8 }, { year: 2014, val: 35.3 }, { year: 2018, val: 43.0 }, { year: 2021, val: 37.4 }] },
  { name: 'Burundi', readings: [{ year: 2006, val: 33.4 }, { year: 2013, val: 38.6 }, { year: 2020, val: 37.5 }] },
  { name: 'Cabo Verde', readings: [{ year: 2001, val: 52.5 }, { year: 2007, val: 47.2 }, { year: 2015, val: 42.4 }] },
  { name: 'Cameroon', readings: [{ year: 2001, val: 42.1 }, { year: 2007, val: 42.8 }, { year: 2014, val: 46.6 }, { year: 2021, val: 42.2 }] },
  { name: 'Central African Rep.', readings: [{ year: 2008, val: 56.2 }, { year: 2021, val: 43.0 }] },
  { name: 'Chad', readings: [{ year: 2003, val: 39.8 }, { year: 2011, val: 43.3 }, { year: 2019, val: 37.5 }, { year: 2023, val: 37.4 }] },
  { name: 'Comoros', readings: [{ year: 2004, val: 55.9 }, { year: 2014, val: 45.3 }] },
  { name: 'Congo, Dem. Rep.', readings: [{ year: 2004, val: 41.6 }, { year: 2012, val: 42.1 }, { year: 2020, val: 44.7 }] },
  { name: 'Congo, Rep.', readings: [{ year: 2005, val: 47.3 }, { year: 2011, val: 48.9 }] },
  { name: "Cote d'Ivoire", readings: [{ year: 2002, val: 41.3 }, { year: 2008, val: 43.2 }, { year: 2015, val: 41.5 }, { year: 2018, val: 37.2 }, { year: 2021, val: 35.3 }] },
  { name: 'Djibouti', readings: [{ year: 2002, val: 40.0 }, { year: 2013, val: 45.1 }, { year: 2014, val: 44.1 }, { year: 2017, val: 41.6 }] },
  { name: 'Egypt', readings: [{ year: 2004, val: 31.8 }, { year: 2008, val: 31.1 }, { year: 2010, val: 30.2 }, { year: 2012, val: 28.3 }, { year: 2015, val: 31.8 }, { year: 2017, val: 31.5 }, { year: 2019, val: 31.9 }, { year: 2021, val: 28.5 }] },
  { name: 'Equatorial Guinea', readings: [{ year: 2022, val: 38.5 }] },
  { name: 'Eswatini', readings: [{ year: 2000, val: 53.1 }, { year: 2010, val: 51.4 }, { year: 2016, val: 54.6 }] },
  { name: 'Ethiopia', readings: [{ year: 2004, val: 29.8 }, { year: 2010, val: 33.2 }, { year: 2015, val: 35.0 }, { year: 2021, val: 31.1 }] },
  { name: 'Gabon', readings: [{ year: 2005, val: 42.2 }, { year: 2017, val: 38.0 }] },
  { name: 'Gambia', readings: [{ year: 2003, val: 47.3 }, { year: 2010, val: 43.6 }, { year: 2015, val: 35.9 }, { year: 2020, val: 38.8 }] },
  { name: 'Ghana', readings: [{ year: 2005, val: 42.8 }, { year: 2012, val: 42.4 }, { year: 2016, val: 43.5 }] },
  { name: 'Guinea', readings: [{ year: 2002, val: 43.0 }, { year: 2007, val: 39.4 }, { year: 2012, val: 33.7 }, { year: 2018, val: 29.6 }] },
  { name: 'Guinea-Bissau', readings: [{ year: 2002, val: 35.6 }, { year: 2010, val: 50.6 }, { year: 2018, val: 34.8 }, { year: 2021, val: 33.4 }] },
  { name: 'Kenya', readings: [{ year: 2005, val: 46.4 }, { year: 2015, val: 40.8 }, { year: 2020, val: 36.2 }, { year: 2021, val: 38.7 }, { year: 2022, val: 37.7 }] },
  { name: 'Lesotho', readings: [{ year: 2002, val: 51.2 }, { year: 2017, val: 44.9 }] },
  { name: 'Liberia', readings: [{ year: 2007, val: 36.4 }, { year: 2014, val: 33.2 }, { year: 2016, val: 35.3 }] },
  { name: 'Madagascar', readings: [{ year: 2001, val: 47.4 }, { year: 2005, val: 39.9 }, { year: 2010, val: 42.4 }, { year: 2012, val: 42.6 }, { year: 2021, val: 36.8 }] },
  { name: 'Malawi', readings: [{ year: 2004, val: 39.9 }, { year: 2010, val: 45.5 }, { year: 2016, val: 44.7 }, { year: 2019, val: 38.5 }] },
  { name: 'Mali', readings: [{ year: 2001, val: 39.9 }, { year: 2006, val: 38.9 }, { year: 2009, val: 33.0 }, { year: 2018, val: 36.0 }, { year: 2021, val: 35.7 }] },
  { name: 'Mauritania', readings: [{ year: 2000, val: 39.0 }, { year: 2004, val: 40.2 }, { year: 2008, val: 35.7 }, { year: 2014, val: 32.6 }, { year: 2019, val: 32.0 }] },
  { name: 'Mauritius', readings: [{ year: 2006, val: 35.7 }, { year: 2012, val: 38.5 }, { year: 2017, val: 36.8 }] },
  { name: 'Morocco', readings: [{ year: 2000, val: 40.6 }, { year: 2006, val: 40.7 }, { year: 2013, val: 39.5 }] },
  { name: 'Mozambique', readings: [{ year: 2002, val: 46.9 }, { year: 2008, val: 45.5 }, { year: 2014, val: 54.0 }, { year: 2019, val: 50.7 }, { year: 2022, val: 49.6 }] },
  { name: 'Namibia', readings: [{ year: 2003, val: 63.3 }, { year: 2009, val: 61.0 }, { year: 2015, val: 59.1 }] },
  { name: 'Niger', readings: [{ year: 2005, val: 44.4 }, { year: 2007, val: 37.3 }, { year: 2011, val: 31.5 }, { year: 2014, val: 34.3 }, { year: 2018, val: 37.3 }, { year: 2021, val: 32.9 }] },
  { name: 'Nigeria', readings: [{ year: 2003, val: 40.1 }, { year: 2009, val: 35.7 }, { year: 2011, val: 35.5 }, { year: 2015, val: 35.9 }, { year: 2018, val: 35.1 }, { year: 2022, val: 33.9 }] },
  { name: 'Rwanda', readings: [{ year: 2000, val: 48.5 }, { year: 2005, val: 52.0 }, { year: 2010, val: 47.2 }, { year: 2013, val: 45.1 }, { year: 2016, val: 43.7 }, { year: 2023, val: 39.4 }] },
  { name: 'Sao Tome & Pr.', readings: [{ year: 2000, val: 32.1 }, { year: 2010, val: 30.8 }, { year: 2017, val: 40.7 }] },
  { name: 'Senegal', readings: [{ year: 2001, val: 41.2 }, { year: 2005, val: 39.2 }, { year: 2011, val: 40.3 }, { year: 2018, val: 38.3 }, { year: 2021, val: 36.2 }] },
  { name: 'Seychelles', readings: [{ year: 2006, val: 42.8 }, { year: 2013, val: 46.8 }, { year: 2018, val: 32.1 }] },
  { name: 'Sierra Leone', readings: [{ year: 2003, val: 40.2 }, { year: 2011, val: 34.0 }, { year: 2018, val: 35.7 }] },
  { name: 'South Africa', readings: [{ year: 2000, val: 57.8 }, { year: 2005, val: 64.8 }, { year: 2008, val: 63.0 }, { year: 2010, val: 63.4 }, { year: 2014, val: 63.0 }] },
  { name: 'South Sudan', readings: [{ year: 2009, val: 46.3 }, { year: 2016, val: 44.0 }] },
  { name: 'Sudan', readings: [{ year: 2009, val: 35.4 }, { year: 2014, val: 34.2 }] },
  { name: 'Tanzania', readings: [{ year: 2000, val: 37.3 }, { year: 2007, val: 40.3 }, { year: 2011, val: 37.8 }, { year: 2019, val: 40.5 }] },
  { name: 'Togo', readings: [{ year: 2006, val: 42.2 }, { year: 2011, val: 46.0 }, { year: 2015, val: 43.0 }, { year: 2018, val: 42.5 }, { year: 2021, val: 37.9 }] },
  { name: 'Tunisia', readings: [{ year: 2000, val: 40.8 }, { year: 2005, val: 37.7 }, { year: 2010, val: 38.5 }, { year: 2015, val: 32.8 }, { year: 2021, val: 33.7 }] },
  { name: 'Uganda', readings: [{ year: 2002, val: 45.2 }, { year: 2005, val: 42.9 }, { year: 2009, val: 44.2 }, { year: 2012, val: 41.0 }, { year: 2016, val: 42.8 }, { year: 2019, val: 42.7 }] },
  { name: 'Zambia', readings: [{ year: 2002, val: 42.1 }, { year: 2004, val: 54.3 }, { year: 2006, val: 54.6 }, { year: 2010, val: 52.0 }, { year: 2015, val: 55.8 }, { year: 2022, val: 51.5 }] },
  { name: 'Zimbabwe', readings: [{ year: 2011, val: 43.2 }, { year: 2017, val: 44.3 }, { year: 2019, val: 50.3 }] },
]

// Country name aliases for matching (key = name from backend/dropdown, values = possible names in SO2 data)
const COUNTRY_ALIASES: Record<string, string[]> = {
  'Central African Republic': ['C.A.R.', 'Central African Rep.'],
  'Democratic Republic of the Congo': ['DR Congo', 'Congo, Dem. Rep.'],
  'Republic of the Congo': ['Congo, Rep.'],
  "Côte d'Ivoire": ["Cote d'Ivoire"],
  'Cabo Verde': ['Cabo Verde'],
  'Eswatini': ['Eswatini'],
  'São Tomé and Príncipe': ['Sao Tome & Pr.'],
  'South Africa': ['South Africa'],
}

function findWaterAccess(countryName: string): WaterAccessEntry | null {
  const direct = WATER_ACCESS.find(d => d.name === countryName)
  if (direct) return direct
  const aliases = COUNTRY_ALIASES[countryName]
  if (aliases) {
    for (const alias of aliases) {
      const found = WATER_ACCESS.find(d => d.name === alias)
      if (found) return found
    }
  }
  // Fuzzy: check if the country name contains or is contained in any data name
  const lower = countryName.toLowerCase()
  return WATER_ACCESS.find(d => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) || null
}

function findWaterGap(countryName: string): WaterGapEntry | null {
  const direct = WATER_GAP.find(d => d.name === countryName)
  if (direct) return direct
  const aliases = COUNTRY_ALIASES[countryName]
  if (aliases) {
    for (const alias of aliases) {
      const found = WATER_GAP.find(d => d.name === alias)
      if (found) return found
    }
  }
  const lower = countryName.toLowerCase()
  return WATER_GAP.find(d => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) || null
}

function findGiniData(countryName: string): GiniEntry | null {
  const direct = GINI_DATA.find(d => d.name === countryName)
  if (direct) return direct
  const aliases = COUNTRY_ALIASES[countryName]
  if (aliases) {
    for (const alias of aliases) {
      const found = GINI_DATA.find(d => d.name === alias)
      if (found) return found
    }
  }
  const lower = countryName.toLowerCase()
  return GINI_DATA.find(d => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase())) || null
}

function giniColor(v: number): string {
  if (v < 35) return '#22c55e'   // Low inequality = green
  if (v < 45) return '#eab308'   // Moderate = yellow
  return '#ef4444'                // High inequality = red
}

// ─── SO3 SPI Layer Discovery ─────────────────────────────────────────────────

interface SpiPeriodData {
  period: string        // e.g. "2000-2005"
  startYear: number
  endYear: number
  layerId: number
  geoserverName: string
  displayName: string
  stats: LayerStats | null
}

function extractSpiPeriod(name: string): { period: string; startYear: number; endYear: number } | null {
  // Try patterns like "2000-2005", "2000_2005", "2020-2023" in the name
  const match = name.match(/(\d{4})[-_](\d{4})/)
  if (match) {
    return { period: `${match[1]}-${match[2]}`, startYear: parseInt(match[1]), endYear: parseInt(match[2]) }
  }
  // Try single year like "spi2005"
  const singleMatch = name.match(/(?:spi|SPI)[_-]?(\d{4})/)
  if (singleMatch) {
    const y = parseInt(singleMatch[1])
    return { period: `${y}`, startYear: y, endYear: y }
  }
  return null
}

function isSpiLayer(geoserverName: string): boolean {
  const n = geoserverName.toLowerCase()
  return (n.includes('so3:') || n.includes('spi')) && !n.startsWith('clip_')
}

function getSpiDroughtPct(stats: LayerStats | null): number {
  if (!stats || !stats.classes) return 0
  // UNCCD/SPI convention: only Moderate + Severe + Extreme count as drought.
  // "Mild drought" / "abnormally dry" is transitional and NOT counted.
  // "No drought" / "wet" classes are also excluded.
  let pct = 0
  for (const cls of stats.classes) {
    const name = resolveClassName(cls.class_name).toLowerCase()
    const isNoDrought = name.includes('no drought') || name.includes('not drought') || name.includes('non drought') || name.includes('wet')
    const isMildDrought = name.includes('mild') && name.includes('drought')
    if (isNoDrought || isMildDrought) continue
    // Count moderate, severe, extreme drought
    if (name.includes('moderate') || name.includes('severe') || name.includes('extreme')) {
      pct += cls.percentage
    }
  }
  return Math.round(pct * 10) / 10
}

function getSpiColor(pct: number): string {
  if (pct < 10) return '#22c55e'   // Low drought = green
  if (pct < 25) return '#eab308'   // Moderate = yellow
  if (pct < 50) return '#f97316'   // High = orange
  return '#ef4444'                  // Severe = red
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function resolveClassName(name: string | { en: string; fr: string }): string {
  if (typeof name === 'string') return name
  return name.en || name.fr || 'Unknown'
}

function getSdgColor(className: string): string {
  const n = className.toLowerCase()
  if (n.includes('degrad') || n.includes('declin')) return '#ef4444'
  if (n.includes('improv') || n.includes('increas')) return '#22c55e'
  if (n.includes('stable')) return '#eab308'
  return '#6b7280'
}

function getLpdColor(className: string): string {
  const n = className.toLowerCase()
  if (n.includes('declin')) return '#ef4444'
  if (n.includes('moderate decline') || n.includes('early sig')) return '#f97316'
  if (n.includes('stressed')) return '#eab308'
  if (n.includes('stable') && !n.includes('stress')) return '#84cc16'
  if (n.includes('increas') || n.includes('improv')) return '#22c55e'
  return '#6b7280'
}

function getSocColor(className: string): string {
  const n = className.toLowerCase()
  if (n.includes('decreas') || n.includes('declin') || n.includes('degrad') || n.includes('loss')) return '#ef4444'
  if (n.includes('stable') || n.includes('no change')) return '#eab308'
  if (n.includes('increas') || n.includes('improv') || n.includes('gain')) return '#22c55e'
  return '#6b7280'
}

function getLcChangeColor(className: string): string {
  const n = className.toLowerCase()
  if (n.includes('loss') || n.includes('decreas') || n.includes('degrad') || n.includes('declin')) return '#ef4444'
  if (n.includes('gain') || n.includes('increas') || n.includes('improv')) return '#22c55e'
  if (n.includes('stable') || n.includes('no change')) return '#eab308'
  return '#6b7280'
}

const LC_COLORS = [
  '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280', '#a3a3a3',
]

// ─── Donut Chart Component ────────────────────────────────────────────────────

function DonutChart({
  classes,
  colorFn,
  height = 180,
}: {
  classes: StatsClass[]
  colorFn: (name: string) => string
  height?: number
}) {
  if (!classes || classes.length === 0) return null

  const sortedClasses = [...classes].sort((a, b) => b.percentage - a.percentage)
  const labels = sortedClasses.map(c => resolveClassName(c.class_name))
  const colors = sortedClasses.map(c => colorFn(resolveClassName(c.class_name)))

  const data = {
    labels,
    datasets: [{
      data: sortedClasses.map(c => c.percentage),
      backgroundColor: colors,
      borderColor: '#0a0f0d',
      borderWidth: 2,
      hoverBorderColor: '#ffffff',
      hoverBorderWidth: 2,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const cls = sortedClasses[ctx.dataIndex]
            return `${resolveClassName(cls.class_name)}: ${cls.percentage}% (${cls.area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²)`
          },
        },
      },
    },
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <Doughnut data={data} options={options} />
    </div>
  )
}

// ─── Class List Component ─────────────────────────────────────────────────────

function ClassList({ classes, colorFn }: { classes: StatsClass[]; colorFn: (name: string) => string }) {
  if (!classes || classes.length === 0) return null

  const sortedClasses = [...classes].sort((a, b) => b.percentage - a.percentage)

  return (
    <div className="space-y-2">
      {sortedClasses.map((cls, i) => {
        const name = resolveClassName(cls.class_name)
        const color = colorFn(name)
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm text-gray-300 flex-1 truncate">{name}</span>
            <span className="text-sm font-semibold text-white tabular-nums">{cls.percentage}%</span>
            <span className="text-xs text-gray-500 tabular-nums w-24 text-right">
              {cls.area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Gini Line Chart Component ────────────────────────────────────────────────

function GiniLineChart({ readings }: { readings: GiniReading[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!chartRef.current || readings.length < 2) return

    const sorted = [...readings].sort((a, b) => a.year - b.year)

    // Destroy previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, 140)
    gradient.addColorStop(0, 'rgba(124,58,237,0.15)')
    gradient.addColorStop(1, 'rgba(124,58,237,0)')

    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(r => String(r.year)),
        datasets: [{
          data: sorted.map(r => r.val),
          borderColor: '#7c3aed',
          borderWidth: 2,
          backgroundColor: gradient,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: sorted.map(r => giniColor(r.val)),
          pointBorderColor: '#0a0f0d',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            borderColor: 'rgba(124,58,237,0.4)',
            borderWidth: 1,
            titleColor: '#a78bfa',
            bodyColor: '#f9fafb',
            padding: 10,
            cornerRadius: 6,
            titleFont: { family: 'monospace', size: 10 },
            bodyFont: { size: 14 },
            callbacks: {
              label: (ctx: any) => i18next.t('ldn-dashboard:giniTooltipLabel', { value: ctx.parsed.y.toFixed(1) }),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#6b7280', font: { size: 10, family: 'monospace' } },
            grid: { color: 'rgba(255,255,255,0.03)' },
          },
          y: {
            ticks: { color: '#6b7280', font: { size: 10, family: 'monospace' } },
            grid: { color: 'rgba(255,255,255,0.03)' },
          },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [readings])

  return <canvas ref={chartRef} />
}

// ─── SPI Time Series Chart Component ──────────────────────────────────────────

function SpiTimeSeriesChart({ labels, values }: { labels: string[]; values: number[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!chartRef.current || labels.length === 0) return

    // Destroy previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, 200)
    gradient.addColorStop(0, 'rgba(245,158,11,0.20)')
    gradient.addColorStop(1, 'rgba(245,158,11,0)')

    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          backgroundColor: gradient,
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: values.map(v => getSpiColor(v)),
          pointBorderColor: '#0a0f0d',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            borderColor: 'rgba(245,158,11,0.4)',
            borderWidth: 1,
            titleColor: '#fbbf24',
            bodyColor: '#f9fafb',
            padding: 10,
            cornerRadius: 6,
            titleFont: { family: 'monospace', size: 10 },
            bodyFont: { size: 14 },
            callbacks: {
              label: (ctx: any) => i18next.t('ldn-dashboard:droughtTooltipLabel', { value: ctx.parsed.y.toFixed(1) }),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#6b7280', font: { size: 10, family: 'monospace' } },
            grid: { color: 'rgba(255,255,255,0.03)' },
          },
          y: {
            ticks: {
              color: '#6b7280',
              font: { size: 10, family: 'monospace' },
              callback: (value: any) => `${value}%`,
            },
            grid: { color: 'rgba(255,255,255,0.03)' },
            min: 0,
          },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [labels, values])

  return <canvas ref={chartRef} />
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LdnDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation('ldn-dashboard')

  // Data state
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(AFRICA_OPTION)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const countryDropdownRef = useRef<HTMLDivElement>(null)

  // Stats state
  const [stats, setStats] = useState<Record<string, LayerStats | null>>({})
  const [statsLoading, setStatsLoading] = useState(false)

  // SO3 SPI state
  const [spiPeriods, setSpiPeriods] = useState<SpiPeriodData[]>([])

  // ─── Auth guard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login'
    }
  }, [authLoading, user])

  // ─── Fetch countries ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await authFetch('/countries', { skipAuth: true })
        if (!res.ok) throw new Error('Failed to fetch countries')
        const data = await res.json()
        setCountries(data)

        // Default to Africa
        setSelectedCountry(AFRICA_OPTION)
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      }
    }
    fetchCountries()
  }, [])

  // ─── Fetch layers ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const res = await authFetch('/clip/layers', { skipAuth: true })
        if (!res.ok) throw new Error('Failed to fetch layers')
        const data = await res.json()

        // Flatten all layers from groups
        const allLayers: LayerInfo[] = []
        const extractLayers = (groups: any[]) => {
          for (const group of groups) {
            if (group.layers) {
              for (const layer of group.layers) {
                allLayers.push({
                  id: layer.id,
                  geoserver_name: layer.geoserver_name,
                  display_name: layer.display_name || layer.geoserver_name,
                  hasStats: layer.hasStats || false,
                })
              }
            }
            if (group.children) {
              extractLayers(group.children)
            }
          }
        }

        if (data.groups) extractLayers(data.groups)
        if (data.ungroupedLayers) {
          for (const layer of data.ungroupedLayers) {
            allLayers.push({
              id: layer.id,
              geoserver_name: layer.geoserver_name,
              display_name: layer.display_name || layer.geoserver_name,
              hasStats: layer.hasStats || false,
            })
          }
        }

        setLayers(allLayers)
      } catch (error) {
        console.error('Failed to fetch layers:', error)
      }
    }
    fetchLayers()
  }, [])

  // ─── Find layer ID by geoserver name ──────────────────────────────────
  const findLayerId = useCallback((geoserverName: string): number | null => {
    const layer = layers.find(l => l.geoserver_name === geoserverName)
    return layer ? layer.id : null
  }, [layers])

  // ─── Discover SPI layers ──────────────────────────────────────────────
  const discoveredSpiLayers = useCallback((): SpiPeriodData[] => {
    return layers
      .filter(l => isSpiLayer(l.geoserver_name))
      .map(l => {
        const period = extractSpiPeriod(l.display_name || l.geoserver_name)
        return {
          period: period?.period ?? 'Unknown',
          startYear: period?.startYear ?? 0,
          endYear: period?.endYear ?? 0,
          layerId: l.id,
          geoserverName: l.geoserver_name,
          displayName: l.display_name || l.geoserver_name,
          stats: null,
        }
      })
      .filter(p => p.startYear > 0)
      .sort((a, b) => a.startYear - b.startYear)
  }, [layers])

  // ─── Fetch stats for selected country ─────────────────────────────────
  useEffect(() => {
    if (!selectedCountry) return

    // ── Africa: load from JSON ──
    if (isAfrica(selectedCountry)) {
      setStatsLoading(true)
      const newStats: Record<string, LayerStats | null> = {}
      for (const [key, jsonKey] of Object.entries(AFRICA_SO1_JSON_KEYS)) {
        newStats[key] = africaJsonToLayerStats(jsonKey)
      }
      setStats(newStats)

      // Build SPI periods from Africa JSON
      const newSpiPeriods: SpiPeriodData[] = AFRICA_SPI_JSON_KEYS
        .map(spi => ({
          period: spi.period,
          startYear: spi.startYear,
          endYear: spi.endYear,
          layerId: -1,
          geoserverName: spi.key,
          displayName: `SPI ${spi.period}`,
          stats: africaJsonToLayerStats(spi.key),
        }))
        .filter(p => p.stats !== null)
      setSpiPeriods(newSpiPeriods)
      setStatsLoading(false)
      return
    }

    // ── Country: fetch from backend ──
    if (layers.length === 0) return

    const fetchAllStats = async () => {
      setStatsLoading(true)
      const newStats: Record<string, LayerStats | null> = {}

      // Fetch SO1 layers
      const layerEntries = Object.entries(SO1_LAYERS)

      const results = await Promise.allSettled(
        layerEntries.map(async ([key, geoserverName]) => {
          const layerId = findLayerId(geoserverName)
          if (!layerId) {
            console.warn(`Layer not found: ${geoserverName}`)
            return { key, stats: null }
          }

          try {
            const res = await authFetch(`/stats/country/${selectedCountry.file}/layer/${layerId}`)
            if (!res.ok) {
              if (res.status === 404) {
                return { key, stats: null }
              }
              throw new Error(`Failed to fetch stats for ${geoserverName}`)
            }
            const data = await res.json()
            return { key, stats: data }
          } catch (err) {
            console.error(`Error fetching stats for ${geoserverName}:`, err)
            return { key, stats: null }
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          newStats[result.value.key] = result.value.stats
        }
      }

      setStats(newStats)

      // Fetch SO3 SPI layers
      const spiLayers = layers
        .filter(l => isSpiLayer(l.geoserver_name))
        .map(l => ({
          ...l,
          period: extractSpiPeriod(l.display_name || l.geoserver_name),
        }))
        .filter(l => l.period && l.period.startYear > 0)
        .sort((a, b) => a.period!.startYear - b.period!.startYear)

      if (spiLayers.length > 0) {
        const spiResults = await Promise.allSettled(
          spiLayers.map(async (l) => {
            try {
              const res = await authFetch(`/stats/country/${selectedCountry.file}/layer/${l.id}`)
              if (!res.ok) return { layer: l, stats: null }
              const data = await res.json()
              return { layer: l, stats: data as LayerStats }
            } catch {
              return { layer: l, stats: null }
            }
          })
        )

        const newSpiPeriods: SpiPeriodData[] = spiResults
          .filter((r): r is PromiseFulfilledResult<{ layer: any; stats: LayerStats | null }> => r.status === 'fulfilled')
          .map(r => ({
            period: r.value.layer.period!.period,
            startYear: r.value.layer.period!.startYear,
            endYear: r.value.layer.period!.endYear,
            layerId: r.value.layer.id,
            geoserverName: r.value.layer.geoserver_name,
            displayName: r.value.layer.display_name || r.value.layer.geoserver_name,
            stats: r.value.stats,
          }))

        setSpiPeriods(newSpiPeriods)
      } else {
        setSpiPeriods([])
      }

      setStatsLoading(false)
    }

    fetchAllStats()
  }, [selectedCountry, layers, findLayerId])

  // ─── Close dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Filter countries by search ───────────────────────────────────────
  const filteredCountries = [
    ...(countrySearch.toLowerCase() === '' || 'africa'.includes(countrySearch.toLowerCase()) ? [AFRICA_OPTION] : []),
    ...countries.filter(c =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase())
    ),
  ]

  // ─── Helper: get degraded % from SDG stats ───────────────────────────
  const getSdgHeadline = (stat: LayerStats | null) => {
    if (!stat || !stat.classes) return { degradedPct: null, degradedArea: null, totalArea: null }
    const degradedClass = stat.classes.find(c => {
      const name = resolveClassName(c.class_name).toLowerCase()
      return name.includes('degrad')
    })
    return {
      degradedPct: degradedClass?.percentage ?? null,
      degradedArea: degradedClass?.area_km2 ?? null,
      totalArea: stat.total_area_km2,
    }
  }

  // ─── Auth loading ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const sdgReporting = stats.sdgReporting
  const sdgBaseline = stats.sdgBaseline
  const sdgHeadline = getSdgHeadline(sdgReporting)

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* ─── Header + Country Selector ──────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#0a0f0d] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-green-400 mb-1">{t('headerBadge')}</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('headerTitle')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('headerSubtitle')}</p>
            </div>

            {/* Country Selector */}
            <div ref={countryDropdownRef} className="relative w-full sm:w-72">
              <button
                onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                disabled={statsLoading}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{selectedCountry?.name || t('selectCountry')}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {countryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[#111714] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-white/[0.06]">
                    <input
                      type="text"
                      placeholder={t('searchCountry')}
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.file}
                        onClick={() => {
                          setSelectedCountry(country)
                          setCountrySearch('')
                          setCountryDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                          selectedCountry?.file === country.file ? 'bg-green-500/10 text-green-400' : 'text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isAfrica(country) && (
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z"/>
                              <path d="M7 6.5a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0zm-2.5 6.5C8 13 6.5 11.5 6.5 10h7c0 1.5-1.5 3-3.5 3h-.5z"/>
                            </svg>
                          )}
                          <span>{country.name}</span>
                          {isAfrica(country) && <span className="ml-auto text-[10px] font-mono text-amber-500/60 uppercase tracking-wider">Continental</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {statsLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400 mx-auto"></div>
              <p className="mt-4 text-gray-500 text-sm">{t('loadingStatsFor', { country: selectedCountry?.name })}</p>
            </div>
          </div>
        )}

        {!statsLoading && (
          <>
            {/* ─── SO1 Section Header ────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('so1Title')}</h2>
                <p className="text-sm text-gray-500">{t('so1Description')}</p>
              </div>
            </div>

            {/* ─── SDG 15.3.1 Hero Card ────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] p-6 sm:p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t('sdgTitle')} <span className="text-sm font-normal text-amber-400">{t('sdgReporting')}</span></h2>
                  <p className="text-sm text-gray-500">{t('sdgDescription')}</p>
                </div>
              </div>

              {!sdgReporting ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t('noStatsForCountry', { country: selectedCountry?.name })}</p>
                  <p className="text-xs text-gray-600 mt-1">{t('statsComputing')}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left: Donut */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-64 h-64">
                      <DonutChart classes={sdgReporting.classes} colorFn={getSdgColor} height={256} />
                      {/* Center label */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-400">{sdgHeadline.degradedPct ?? '—'}%</p>
                          <p className="text-xs text-gray-500 mt-0.5">{t('degraded')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Class breakdown */}
                  <div className="flex flex-col justify-center">
                    <ClassList classes={sdgReporting.classes} colorFn={getSdgColor} />

                    {/* Total area */}
                    <div className="mt-6 pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{t('totalArea')}</span>
                        <span className="text-sm font-semibold text-white">
                          {sdgReporting.total_area_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²
                        </span>
                      </div>
                      {sdgHeadline.degradedArea && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-red-400">{t('degradedArea')}</span>
                          <span className="text-sm font-semibold text-red-400">
                            {sdgHeadline.degradedArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Baseline vs Reporting comparison */}
                    {sdgBaseline && sdgReporting && (
                      <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">{t('baselineToReporting')}</p>
                        {sdgReporting.classes.map((cls, i) => {
                          const baselineClass = sdgBaseline.classes?.find(
                            bc => resolveClassName(bc.class_name) === resolveClassName(cls.class_name)
                          )
                          const baselinePct = baselineClass?.percentage ?? 0
                          const diff = cls.percentage - baselinePct
                          return (
                            <div key={i} className="flex items-center justify-between text-xs py-1">
                              <span className="text-gray-400">{resolveClassName(cls.class_name)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{baselinePct}%</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-white font-medium">{cls.percentage}%</span>
                                {diff !== 0 && (
                                  <span className={`font-mono ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Three Sub-Indicator Cards ──────────────────────────── */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Land Cover Card */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t('landCover')}</h3>
                    <p className="text-xs text-gray-500">{t('landCoverSubtitle')}</p>
                  </div>
                </div>

                {!stats.landcover2023 ? (
                  <div className="py-8 text-center text-sm text-gray-600">{t('noData')}</div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-36 h-36">
                        <DonutChart
                          classes={stats.landcover2023.classes}
                          colorFn={(name) => {
                            const idx = stats.landcover2023!.classes.findIndex(c => resolveClassName(c.class_name) === name)
                            return LC_COLORS[idx % LC_COLORS.length]
                          }}
                          height={144}
                        />
                      </div>
                    </div>
                    <ClassList
                      classes={stats.landcover2023.classes}
                      colorFn={(name) => {
                        const idx = stats.landcover2023!.classes.findIndex(c => resolveClassName(c.class_name) === name)
                        return LC_COLORS[idx % LC_COLORS.length]
                      }}
                    />
                  </>
                )}
              </div>

              {/* Land Productivity Card */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t('landProductivity')}</h3>
                    <p className="text-xs text-gray-500">{t('landProductivitySubtitle')}</p>
                  </div>
                </div>

                {!stats.lpdReporting ? (
                  <div className="py-8 text-center text-sm text-gray-600">{t('noData')}</div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="w-36 h-36">
                        <DonutChart classes={stats.lpdReporting.classes} colorFn={getLpdColor} height={144} />
                      </div>
                    </div>
                    <ClassList classes={stats.lpdReporting.classes} colorFn={getLpdColor} />
                  </>
                )}
              </div>

              {/* Soil Organic Carbon Card */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t('soilOrganicCarbon')}</h3>
                    <p className="text-xs text-gray-500">{t('soilOrganicCarbonSubtitle')}</p>
                  </div>
                </div>

                {!stats.socBaseline && !stats.socReporting ? (
                  <div className="py-8 text-center text-sm text-gray-600">{t('noData')}</div>
                ) : (
                  <div className="space-y-4">
                    {/* SOC Baseline */}
                    {stats.socBaseline && (
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">{t('baseline')}</p>
                        <div className="flex justify-center mb-2">
                          <div className="w-28 h-28">
                            <DonutChart classes={stats.socBaseline.classes} colorFn={getSocColor} height={112} />
                          </div>
                        </div>
                        <ClassList classes={stats.socBaseline.classes} colorFn={getSocColor} />
                      </div>
                    )}

                    {/* SOC Reporting */}
                    {stats.socReporting && (
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">{t('reporting')}</p>
                        <div className="flex justify-center mb-2">
                          <div className="w-28 h-28">
                            <DonutChart classes={stats.socReporting.classes} colorFn={getSocColor} height={112} />
                          </div>
                        </div>
                        <ClassList classes={stats.socReporting.classes} colorFn={getSocColor} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── LC Change Card ────────────────────────────────────────── */}
            {stats.lcChangeReporting && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t('landCoverChange')}</h3>
                    <p className="text-xs text-gray-500">{t('landCoverChangeSubtitle')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex justify-center">
                    <div className="w-48 h-48">
                      <DonutChart classes={stats.lcChangeReporting.classes} colorFn={getLcChangeColor} height={192} />
                    </div>
                  </div>
                  <ClassList classes={stats.lcChangeReporting.classes} colorFn={getLcChangeColor} />
                </div>
              </div>
            )}

            {/* ─── SO2 — Living Conditions (countries only) ──────────────── */}
            {!isAfrica(selectedCountry) && (
            <div className="mt-10 pt-8 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t('so2Title')}</h2>
                  <p className="text-sm text-gray-500">{t('so2Description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* ─── Water Access Card ─────────────────────────────── */}
                {(() => {
                  const wa = selectedCountry ? findWaterAccess(selectedCountry.name) : null
                  const wg = selectedCountry ? findWaterGap(selectedCountry.name) : null
                  return (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c-4 6-8 9-8 13a8 8 0 1016 0c0-4-4-7-8-13z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{t('waterAccess')}</h3>
                          <p className="text-xs text-gray-500">{t('waterAccessSubtitle')}</p>
                        </div>
                      </div>

                      {!wa ? (
                        <div className="py-8 text-center text-sm text-gray-600">{t('noDataForCountry', { country: selectedCountry?.name })}</div>
                      ) : (
                        <div className="space-y-4">
                          {/* Main metric */}
                          <div className="flex items-end gap-3">
                            <p className="text-4xl font-bold" style={{ color: wa.y2020 !== null ? (wa.y2020 >= 70 ? '#22c55e' : wa.y2020 >= 40 ? '#eab308' : '#ef4444') : '#6b7280' }}>
                              {wa.y2020 !== null ? `${wa.y2020.toFixed(1)}%` : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500 mb-1">{t('accessIn', { year: wa.y2000 !== null ? '2020' : 'latest' })}</p>
                          </div>

                          {/* Change badge */}
                          {wa.change !== null && (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                                wa.change > 0
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : wa.change < 0
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {wa.change > 0 ? '+' : ''}{wa.change.toFixed(1)} pp
                              </span>
                              <span className="text-xs text-gray-500">{t('y2000To2020')}</span>
                            </div>
                          )}

                          {/* Year comparison */}
                          {wa.y2000 !== null && wa.y2020 !== null && (
                            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">2000</span>
                                <span className="text-white font-medium">{wa.y2000.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1 bg-white/[0.06] rounded-full my-2">
                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-green-500/60" style={{ width: `${wa.y2020}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">2020</span>
                                <span className="text-white font-medium">{wa.y2020.toFixed(1)}%</span>
                              </div>
                            </div>
                          )}

                          {/* Urban vs Rural */}
                          {wg && wg.urban !== null && wg.rural !== null && (
                            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">{t('urbanVsRuralGap')}</p>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-cyan-400">{t('urban')}</span>
                                    <span className="text-white font-medium">{wg.urban.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full">
                                    <div className="h-full rounded-full bg-cyan-500" style={{ width: `${wg.urban}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-green-400">{t('rural')}</span>
                                    <span className="text-white font-medium">{wg.rural.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full">
                                    <div className="h-full rounded-full bg-green-500" style={{ width: `${wg.rural}%` }} />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                                  <span className="text-xs text-gray-400">{t('gap')}</span>
                                  <span className={`text-xs font-mono font-medium ${(wg.urban - wg.rural) > 40 ? 'text-red-400' : (wg.urban - wg.rural) > 20 ? 'text-amber-400' : 'text-green-400'}`}>
                                    {(wg.urban - wg.rural).toFixed(0)} pp
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] text-gray-600">{t('waterSource')}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ─── Gini Index Card ──────────────────────────────── */}
                {(() => {
                  const gini = selectedCountry ? findGiniData(selectedCountry.name) : null
                  const latestReading = gini && gini.readings.length > 0
                    ? gini.readings.reduce((a, b) => b.year > a.year ? b : a)
                    : null
                  const earliestReading = gini && gini.readings.length > 0
                    ? gini.readings.reduce((a, b) => b.year < a.year ? b : a)
                    : null
                  const giniChange = (latestReading && earliestReading && latestReading !== earliestReading)
                    ? parseFloat((latestReading.val - earliestReading.val).toFixed(1))
                    : null

                  return (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{t('incomeInequality')}</h3>
                          <p className="text-xs text-gray-500">{t('incomeInequalitySubtitle')}</p>
                        </div>
                      </div>

                      {!gini || gini.readings.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-600">{t('noDataForCountry', { country: selectedCountry?.name })}</div>
                      ) : (
                        <div className="space-y-4">
                          {/* Main metric */}
                          <div className="flex items-end gap-3">
                            <p className="text-4xl font-bold" style={{ color: latestReading ? giniColor(latestReading.val) : '#6b7280' }}>
                              {latestReading ? latestReading.val.toFixed(1) : 'N/A'}
                            </p>
                            <div className="mb-1">
                              <p className="text-sm text-gray-500">
                                {t('giniIn', { year: latestReading?.year })}
                              </p>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                latestReading && latestReading.val < 35
                                  ? 'bg-green-500/10 text-green-400'
                                  : latestReading && latestReading.val < 45
                                    ? 'bg-yellow-500/10 text-yellow-400'
                                    : 'bg-red-500/10 text-red-400'
                              }`}>
                                {latestReading && latestReading.val < 35 ? t('lowInequality') : latestReading && latestReading.val < 45 ? t('moderate') : t('highInequality')}
                              </span>
                            </div>
                          </div>

                          {/* Change badge */}
                          {giniChange !== null && (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                                giniChange < 0
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : giniChange > 0
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {giniChange > 0 ? '+' : ''}{giniChange.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {earliestReading?.year} → {latestReading?.year}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                ({t('readings', { count: gini.readings.length })})
                              </span>
                            </div>
                          )}

                          {/* Gini Timeline Chart */}
                          {gini.readings.length >= 2 && (
                            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">{t('giniOverTime')}</p>
                              <div style={{ height: '140px' }}>
                                <GiniLineChart readings={gini.readings} />
                              </div>
                            </div>
                          )}

                          {/* Readings list if few */}
                          {gini.readings.length > 0 && gini.readings.length <= 4 && (
                            <div className="space-y-1">
                              {gini.readings.map((r, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1">
                                  <span className="text-gray-400">{r.year}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium" style={{ color: giniColor(r.val) }}>{r.val.toFixed(1)}</span>
                                    {i > 0 && (() => {
                                      const diff = r.val - gini.readings[i - 1].val
                                      return (
                                        <span className={`font-mono ${diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-[10px] text-gray-600">{t('giniSource')}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
            )}

            {/* ─── SO3 — Drought ─────────────────────────────────────────────── */}
            <div className="mt-10 pt-8 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t('so3Title')}</h2>
                  <p className="text-sm text-gray-500">{t('so3Description')}</p>
                </div>
              </div>

              {spiPeriods.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
                  <svg className="w-12 h-12 text-amber-500/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-500">{t('noSpiLayers', { country: selectedCountry?.name })}</p>
                  <p className="text-xs text-gray-600 mt-1">{t('spiDataNeedsUpload')}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] p-6 sm:p-8">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{t('droughtTimeSeries')}</h3>
                      <p className="text-xs text-gray-500">{t('droughtTimeSeriesSubtitle')}</p>
                    </div>
                  </div>

                  {/* Summary metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {(() => {
                      const periodsWithData = spiPeriods.filter(p => p.stats)
                      const latestPeriod = periodsWithData.length > 0 ? periodsWithData[periodsWithData.length - 1] : null
                      const earliestPeriod = periodsWithData.length > 0 ? periodsWithData[0] : null
                      const latestDroughtPct = latestPeriod ? getSpiDroughtPct(latestPeriod.stats) : null
                      const earliestDroughtPct = earliestPeriod ? getSpiDroughtPct(earliestPeriod.stats) : null
                      const trend = (latestDroughtPct !== null && earliestDroughtPct !== null && periodsWithData.length >= 2)
                        ? latestDroughtPct - earliestDroughtPct
                        : null
                      const peakPct = periodsWithData.length > 0
                        ? Math.max(...periodsWithData.map(p => getSpiDroughtPct(p.stats)))
                        : null
                      const peakPeriod = periodsWithData.length > 0
                        ? periodsWithData.reduce((a, b) => getSpiDroughtPct(a.stats) >= getSpiDroughtPct(b.stats) ? a : b)
                        : null

                      return (
                        <>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">{t('currentDrought')}</p>
                            <p className="text-2xl font-bold" style={{ color: latestDroughtPct !== null ? getSpiColor(latestDroughtPct) : '#6b7280' }}>
                              {latestDroughtPct !== null ? `${latestDroughtPct}%` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-600">{latestPeriod?.period ?? ''}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">{t('trend')}</p>
                            <p className="text-2xl font-bold" style={{ color: trend !== null ? (trend > 0 ? '#ef4444' : trend < 0 ? '#22c55e' : '#eab308') : '#6b7280' }}>
                              {trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} pp` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-600">{earliestPeriod?.period ?? ''} → {latestPeriod?.period ?? ''}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">{t('peakDrought')}</p>
                            <p className="text-2xl font-bold" style={{ color: peakPct !== null ? getSpiColor(peakPct) : '#6b7280' }}>
                              {peakPct !== null ? `${peakPct}%` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-600">{peakPeriod?.period ?? ''}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                            <p className="text-xs text-gray-500 mb-1">{t('periods')}</p>
                            <p className="text-2xl font-bold text-amber-400">{periodsWithData.length}</p>
                            <p className="text-[10px] text-gray-600">{t('withData')}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Time Series Chart */}
                  {(() => {
                    const periodsWithData = spiPeriods.filter(p => p.stats)
                    if (periodsWithData.length < 1) {
                      return (
                        <div className="py-8 text-center text-sm text-gray-600">{t('noSpiStatsForCountry', { country: selectedCountry?.name })}</div>
                      )
                    }

                    const chartLabels = periodsWithData.map(p => p.period)
                    const droughtPcts = periodsWithData.map(p => getSpiDroughtPct(p.stats))

                    return (
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">{t('droughtSeverityOverTime')}</p>
                        <div style={{ height: '220px' }}>
                          <SpiTimeSeriesChart labels={chartLabels} values={droughtPcts} />
                        </div>

                        {/* Period breakdown below chart */}
                        <div className="mt-4 space-y-1.5">
                          {periodsWithData.map((p, i) => {
                            const pct = getSpiDroughtPct(p.stats)
                            const prevPct = i > 0 ? getSpiDroughtPct(periodsWithData[i - 1].stats) : null
                            const diff = prevPct !== null ? pct - prevPct : null
                            return (
                              <div key={i} className="flex items-center justify-between text-xs py-1">
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: getSpiColor(pct) }} />
                                  <span className="text-gray-400 font-mono">{p.period}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-white font-medium tabular-nums">{pct.toFixed(1)}%</span>
                                  {diff !== null && diff !== 0 && (
                                    <span className={`font-mono ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                    </span>
                                  )}
                                  {/* Mini bar */}
                                  <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${Math.min(pct, 100)}%`,
                                        backgroundColor: getSpiColor(pct),
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <p className="text-[10px] text-gray-600 mt-4">{t('spiSource')}</p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
