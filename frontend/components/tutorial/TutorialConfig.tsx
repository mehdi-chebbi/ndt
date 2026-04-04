export interface TutorialStep {
  id: number
  phase: string
  title: string
  content: string
  target: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  actionType?: 'click' | 'select' | 'draw' | 'type' | 'slide' | 'submit' | 'activate_layer' | 'none'
  waitForAction?: boolean
  onNext?: () => void | Promise<void>
  disableAutoScroll?: boolean
}

export const tutorialSteps: TutorialStep[] = [
  // ─── Phase 1: Map Basics (Steps 1–4) ───────────────────────────
  {
    id: 1,
    phase: 'Map Basics',
    title: 'Base Maps Tab',
    content: 'Click on the Base Maps tab to see different map styles you can use as the background.',
    target: '[data-tutorial="basemaps-tab"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
  },
  {
    id: 2,
    phase: 'Map Basics',
    title: 'Choose a Base Map',
    content: 'Choose any base map you like from here. Each gives you a different visual style for the map background.',
    target: '[data-tutorial="basemaps-content"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
    disableAutoScroll: true,
  },
  {
    id: 3,
    phase: 'Data Layers',
    title: 'Data Tab',
    content: 'Click on the Data tab to see all available data layers you can overlay on the map.',
    target: '[data-tutorial="data-tab"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
  },
  {
    id: 4,
    phase: 'Data Layers',
    title: 'Explore Data Layers',
    content: 'Browse and activate any layer you want. Layers contain different types of geospatial data like land cover, vegetation, and more.',
    target: '[data-tutorial="data-tab-content"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Phase 2: Reporting (Step 5) ───────────────────────────────
  {
    id: 5,
    phase: 'Reporting',
    title: 'Report Invalid Data',
    content: 'Found incorrect data? Click this button to report issues. You can draw a shape around the problem area and submit it for review.',
    target: '[data-tutorial="report-button"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Phase 3: Navigation (Step 6) ───────────────────────────────
  {
    id: 6,
    phase: 'Navigation',
    title: 'Country Selector',
    content: 'Use this to zoom to any African country and see its boundaries clearly.',
    target: '[data-tutorial="country-selector"]',
    position: 'bottom',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Phase 4: Compare Layers (Step 7) ───────────────────────────
  {
    id: 7,
    phase: 'Compare Layers',
    title: 'Compare Layers',
    content: 'Click this to compare two different layers side by side. Great for seeing changes over time or comparing different data types.',
    target: '[data-tutorial="compare-button"]',
    position: 'bottom',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Phase 5: Statistics (Step 8) ───────────────────────────────
  {
    id: 8,
    phase: 'Statistics',
    title: 'Statistics',
    content: 'Calculate land cover statistics for any area you draw. Useful for quantitative analysis of specific regions.',
    target: '[data-tutorial="stats-tab"]',
    position: 'right',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Phase 6: AI Assistant (Step 9) ─────────────────────────────
  {
    id: 9,
    phase: 'AI Assistant',
    title: 'AI Assistant',
    content: 'Need help? Click here to chat with our AI assistant. Ask questions about the map, data, or any features.',
    target: '[data-tutorial="ai-button"]',
    position: 'left',
    actionType: 'none',
    waitForAction: false,
  },

  // ─── Final Step ─────────────────────────────────────────────────
  {
    id: 10,
    phase: 'Complete',
    title: 'Tutorial Complete!',
    content: 'You\'ve learned all the key features! Click "End Tour" to mark it as complete. You can always restart it from the "Show Tutorial" button in the sidebar.',
    target: 'body',
    position: 'center',
    actionType: 'none',
    waitForAction: false,
  },
]
