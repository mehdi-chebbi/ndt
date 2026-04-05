export interface LegendItem {
  class: string
  color: string
}

export interface Layer {
  id: number
  name: string
  geoserver_name: string
  layerName: string
  wmsUrl: string
  bounds: [[number, number], [number, number]]
  hasStats: boolean
  group_id: number | null
  group_name: string | null
  group_legend: LegendItem[] | null
  legend: LegendItem[] | null
}

export interface Group {
  id: number
  name: string
  description: string | null
  legend: LegendItem[] | null
  parent_id: number | null
  children: Group[]
  layers: Layer[]
}

export interface GroupedLayers {
  groups: Group[]
  ungroupedLayers: Layer[]
}

export interface Polygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface MultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type PolygonGeometry = Polygon | MultiPolygon

export interface StatsResult {
  layer_name: string
  total_area_km2: number
  pixel_size_m: number
  classes: Array<{
    class_id: number
    class_name: string
    area_km2: number
    percentage: number
  }>
}

// Props for tab components
export interface BasemapsTabProps {
  activeBasemap: string
  onBasemapChange: (basemapName: string) => void
}

export interface DataTabProps {
  groupedLayers: GroupedLayers
  expandedGroups: Set<number | string>
  activeDataLayers: string[]
  isLoadingLayers: boolean
  layerError: string
  hasDrawnPolygon: boolean
  reportingMode: boolean
  reportingStep: 'draw' | 'comment'
  invalidAreaPolygon: Polygon | null
  reportComment: string
  isSubmittingReport: boolean
  reportMessage: string
  selectedLayerId: number | null
  allLayers: Layer[]
  onToggleGroup: (groupId: number | string) => void
  onDataLayerToggle: (layer: Layer) => void
  onClearDrawings: () => void
  onStartReport: () => void
  onSubmitReport: () => void
  onCancelReport: () => void
  onReportCommentChange: (comment: string) => void
  // AI Analysis props
  aiAnalysisMode: boolean
  aiAnalysisLayerId: number | null
  aiAnalysisPolygon: PolygonGeometry | null
  aiAnalysisArea: number
  isComputingStats: boolean
  aiAnalysisError: string
  onStartAIAnalysis: () => void
  onAnalyzeArea: () => void
  onCancelAIAnalysis: () => void
  onAIAnalysisLayerChange: (layerId: number | null) => void
}

export interface StatsTabProps {
  statsMode: boolean
  statsLayerId: number | null
  statsPolygon: PolygonGeometry | null
  statsPolygonArea: number
  statsResults: StatsResult | null
  isCalculatingStats: boolean
  statsError: string
  groupedLayers: GroupedLayers
  expandedGroups: Set<number | string>
  allLayers: Layer[]
  onStartStats: () => void
  onCalculateStats: () => void
  onCancelStats: () => void
  onStatsLayerChange: (layerId: number | null) => void
  onToggleGroup: (groupId: number | string) => void
  onSetStatsMessage: (message: string, isError: boolean) => void
}

export interface AIAnalysisTabProps {
  aiAnalysisMode: boolean
  aiAnalysisLayerId: number | null
  aiAnalysisPolygon: PolygonGeometry | null
  aiAnalysisArea: number
  isComputingStats: boolean
  aiAnalysisError: string
  groupedLayers: GroupedLayers
  expandedGroups: Set<number | string>
  allLayers: Layer[]
  onStartAIAnalysis: () => void
  onAnalyzeArea: () => void
  onCancelAIAnalysis: () => void
  onToggleGroup: (groupId: number | string) => void
  onAIAnalysisLayerChange: (layerId: number | null) => void
  onSetAIAnalysisPolygon: (polygon: PolygonGeometry | null) => void
  onSetAIAnalysisArea: (area: number) => void
}
