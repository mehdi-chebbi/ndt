import { useState, SetStateAction, Dispatch } from 'react'
import { Group, GroupedLayers, Layer, Polygon, PolygonGeometry, StatsResult } from './types'

export interface Country {
  name: string
  file: string
}

interface MapState {
  // UI state
  activeBasemap: string
  setActiveBasemap: Dispatch<SetStateAction<string>>
  sidebarOpen: boolean
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  activeTab: 'basemaps' | 'data' | 'stats'
  setActiveTab: Dispatch<SetStateAction<'basemaps' | 'data' | 'stats'>>
  clipMessage: string
  setClipMessage: Dispatch<SetStateAction<string>>

  // Data layers state
  activeDataLayers: string[]
  setActiveDataLayers: Dispatch<SetStateAction<string[]>>
  groupedLayers: GroupedLayers
  setGroupedLayers: Dispatch<SetStateAction<GroupedLayers>>
  expandedGroups: Set<number | string>
  setExpandedGroups: Dispatch<SetStateAction<Set<number | string>>>
  isLoadingLayers: boolean
  setIsLoadingLayers: Dispatch<SetStateAction<boolean>>
  layerError: string
  setLayerError: Dispatch<SetStateAction<string>>
  hasDrawnPolygon: boolean
  setHasDrawnPolygon: Dispatch<SetStateAction<boolean>>

  // Country polygon state
  selectedCountry: Country | null
  setSelectedCountry: Dispatch<SetStateAction<Country | null>>

  // Reporting state
  reportingMode: boolean
  setReportingMode: Dispatch<SetStateAction<boolean>>
  reportingStep: 'draw' | 'comment'
  setReportingStep: Dispatch<SetStateAction<'draw' | 'comment'>>
  invalidAreaPolygon: Polygon | null
  setInvalidAreaPolygon: Dispatch<SetStateAction<Polygon | null>>
  reportComment: string
  setReportComment: Dispatch<SetStateAction<string>>
  currentPolygon: Polygon | null
  setCurrentPolygon: Dispatch<SetStateAction<Polygon | null>>
  selectedLayerId: number | null
  setSelectedLayerId: Dispatch<SetStateAction<number | null>>
  isSubmittingReport: boolean
  setIsSubmittingReport: Dispatch<SetStateAction<boolean>>
  reportMessage: string
  setReportMessage: Dispatch<SetStateAction<string>>

  // Stats state
  statsMode: boolean
  setStatsMode: Dispatch<SetStateAction<boolean>>
  statsLayerId: number | null
  setStatsLayerId: Dispatch<SetStateAction<number | null>>
  statsPolygon: PolygonGeometry | null
  setStatsPolygon: Dispatch<SetStateAction<PolygonGeometry | null>>
  statsPolygonArea: number
  setStatsPolygonArea: Dispatch<SetStateAction<number>>
  statsResults: StatsResult | null
  setStatsResults: Dispatch<SetStateAction<StatsResult | null>>
  isCalculatingStats: boolean
  setIsCalculatingStats: Dispatch<SetStateAction<boolean>>
  statsError: string
  setStatsError: Dispatch<SetStateAction<string>>
  statsMessage: string
  setStatsMessage: Dispatch<SetStateAction<string>>
  statsMessageIsError: boolean
  setStatsMessageIsError: Dispatch<SetStateAction<boolean>>

  // AI Analysis state
  aiAnalysisMode: boolean
  setAiAnalysisMode: Dispatch<SetStateAction<boolean>>
  aiAnalysisLayerId: number | null
  setAiAnalysisLayerId: Dispatch<SetStateAction<number | null>>
  aiAnalysisPolygon: PolygonGeometry | null
  setAiAnalysisPolygon: Dispatch<SetStateAction<PolygonGeometry | null>>
  aiAnalysisArea: number
  setAiAnalysisArea: Dispatch<SetStateAction<number>>
  isComputingStatsForAI: boolean
  setIsComputingStatsForAI: Dispatch<SetStateAction<boolean>>
  aiAnalysisError: string
  setAiAnalysisError: Dispatch<SetStateAction<string>>
}

export function useMapState(): MapState {
  // UI state
  const [activeBasemap, setActiveBasemap] = useState('OpenStreetMap')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'basemaps' | 'data' | 'stats'>('basemaps')
  const [clipMessage, setClipMessage] = useState('')

  // Data layers state
  const [activeDataLayers, setActiveDataLayers] = useState<string[]>([])
  const [groupedLayers, setGroupedLayers] = useState<GroupedLayers>({ groups: [], ungroupedLayers: [] })
  const [expandedGroups, setExpandedGroups] = useState<Set<number | string>>(new Set())
  const [isLoadingLayers, setIsLoadingLayers] = useState(true)
  const [layerError, setLayerError] = useState('')
  const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false)

  // Country polygon state
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)

  // Reporting state
  const [reportingMode, setReportingMode] = useState(false)
  const [reportingStep, setReportingStep] = useState<'draw' | 'comment'>('draw')
  const [invalidAreaPolygon, setInvalidAreaPolygon] = useState<Polygon | null>(null)
  const [reportComment, setReportComment] = useState('')
  const [currentPolygon, setCurrentPolygon] = useState<Polygon | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

  // Stats state
  const [statsMode, setStatsMode] = useState(false)
  const [statsLayerId, setStatsLayerId] = useState<number | null>(null)
  const [statsPolygon, setStatsPolygon] = useState<PolygonGeometry | null>(null)
  const [statsPolygonArea, setStatsPolygonArea] = useState(0)
  const [statsResults, setStatsResults] = useState<StatsResult | null>(null)
  const [isCalculatingStats, setIsCalculatingStats] = useState(false)
  const [statsError, setStatsError] = useState('')
  const [statsMessage, setStatsMessage] = useState('')
  const [statsMessageIsError, setStatsMessageIsError] = useState(false)

  // AI Analysis state
  const [aiAnalysisMode, setAiAnalysisMode] = useState(false)
  const [aiAnalysisLayerId, setAiAnalysisLayerId] = useState<number | null>(null)
  const [aiAnalysisPolygon, setAiAnalysisPolygon] = useState<PolygonGeometry | null>(null)
  const [aiAnalysisArea, setAiAnalysisArea] = useState(0)
  const [isComputingStatsForAI, setIsComputingStatsForAI] = useState(false)
  const [aiAnalysisError, setAiAnalysisError] = useState('')

  return {
    // UI state
    activeBasemap,
    setActiveBasemap,
    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
    clipMessage,
    setClipMessage,

    // Data layers state
    activeDataLayers,
    setActiveDataLayers,
    groupedLayers,
    setGroupedLayers,
    expandedGroups,
    setExpandedGroups,
    isLoadingLayers,
    setIsLoadingLayers,
    layerError,
    setLayerError,
    hasDrawnPolygon,
    setHasDrawnPolygon,

    // Country polygon state
    selectedCountry,
    setSelectedCountry,

    // Reporting state
    reportingMode,
    setReportingMode,
    reportingStep,
    setReportingStep,
    invalidAreaPolygon,
    setInvalidAreaPolygon,
    reportComment,
    setReportComment,
    currentPolygon,
    setCurrentPolygon,
    selectedLayerId,
    setSelectedLayerId,
    isSubmittingReport,
    setIsSubmittingReport,
    reportMessage,
    setReportMessage,

    // Stats state
    statsMode,
    setStatsMode,
    statsLayerId,
    setStatsLayerId,
    statsPolygon,
    setStatsPolygon,
    statsPolygonArea,
    setStatsPolygonArea,
    statsResults,
    setStatsResults,
    isCalculatingStats,
    setIsCalculatingStats,
    statsError,
    setStatsError,
    statsMessage,
    setStatsMessage,
    statsMessageIsError,
    setStatsMessageIsError,

    // AI Analysis state
    aiAnalysisMode,
    setAiAnalysisMode,
    aiAnalysisLayerId,
    setAiAnalysisLayerId,
    aiAnalysisPolygon,
    setAiAnalysisPolygon,
    aiAnalysisArea,
    setAiAnalysisArea,
    isComputingStatsForAI,
    setIsComputingStatsForAI,
    aiAnalysisError,
    setAiAnalysisError,
  }
}

// Helper to flatten layers from groups
export function flattenLayers(groups: Group[]): Layer[] {
  const result: Layer[] = []
  const flatten = (groupList: Group[]) => {
    groupList.forEach(g => {
      result.push(...g.layers)
      if (g.children?.length > 0) {
        flatten(g.children)
      }
    })
  }
  flatten(groups)
  return result
}
