# Tutorial System Implementation Guide

## 📋 Overview

This document provides a complete, step-by-step guide for implementing an interactive onboarding tutorial system for the NDT Platform map interface. The tutorial uses a spotlight effect (blurred background with highlighted box) to guide new users through the platform's features.

**Key Features:**
- Auto-trigger after first signup (email/password and OAuth)
- One-time auto-run with manual replay option
- Spotlight effect with step-by-step guidance
- Action-based detection (advances when user performs actions)
- Confirmation dialogs before marking as complete
- Progress tracking in database

---

## 🎯 Tutorial Flow - 23 Steps Total

The tutorial is organized into 6 phases, each focusing on a specific feature set.

### **Phase 1: Map Basics (Steps 1-5)**
**Purpose:** Get familiar with the map interface

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 1 | Base Maps tab button | Click | Highlight the "Base Maps" tab in the sidebar, ask user to click it |
| 2 | Basemap thumbnail | Click | Highlight a basemap (e.g., "OpenStreetMap"), ask user to apply it |
| 3 | Data tab button | Click | Highlight "Data" tab, ask user to click it |
| 4 | Layer button | Click | Highlight a layer (e.g., first available layer), ask user to activate it |
| 5 | Legend | View | Highlight the legend component (bottom right), explain what it shows |

### **Phase 2: Country Selection & Export (Steps 6-7)**
**Purpose:** Navigation and output

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 6 | Country Selector | Select | Highlight country dropdown, ask user to select a country |
| 7 | Export button | Click | Highlight "Export" button, ask user to click to save map as image |

### **Phase 3: Reporting Invalid Data (Steps 8-11)**
**Purpose:** Complex multi-step workflow (reporting data issues)

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 8a | "Report Invalid Data" button | Click | Highlight button in Data tab, ask user to click it |
| 8b | Drawing tools | Select | Highlight draw control (top right), ask user to pick rectangle or polygon tool |
| 8c | Map area | Draw | Ask user to draw a shape on the map (auto-advance when drawn) |
| 8d | Comment textarea | Type | Highlight comment area, ask user to type a comment |
| 8e | Submit button | Click | Highlight "Submit" button, ask user to click it |

### **Phase 4: Compare Layers (Steps 9-14)**
**Purpose:** Side-by-side layer comparison

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 9 | "Compare Layers" button | Click | Highlight button (top right), ask user to click it |
| 10 | Left group selector | Select | In the modal, highlight left group dropdown, ask user to select a group |
| 11 | Left layer selector | Select | Highlight left layer dropdown, ask user to select a layer |
| 12 | Right group selector | Select | Highlight right group dropdown, ask user to select a group |
| 13 | Right layer selector | Select | Highlight right layer dropdown, ask user to select a layer |
| 14 | Compare button (in modal) | Click | Highlight "Compare" button, ask user to click to enter compare mode |
| 15 | Slider | Slide | Highlight the comparison slider handle (middle of screen), ask user to slide it |
| 16 | Left layer label | Click | Highlight left layer label (top left), ask user to click to edit |
| 17 | Layer selection in edit modal | Select | Highlight layer dropdown, ask user to change the layer |
| 18 | Confirm button | Click | Highlight "Confirm" button, ask user to click |
| 19 | Exit button | Click | Highlight "Exit" button (top center), ask user to click it |

### **Phase 5: Statistical Analysis (Steps 20-26)**
**Purpose:** Calculate land cover statistics for drawn areas

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 20 | Stats tab button | Click | Highlight "Stats" tab, ask user to click it |
| 21 | Layer selector | Select | Highlight a layer (with stats capability), ask user to select it |
| 22 | "Start Drawing" button | Click | Highlight button, ask user to click it |
| 23 | Drawing tools | Select | Highlight draw control, ask user to pick rectangle or polygon tool |
| 24 | Map area | Draw | Ask user to draw a small area (auto-advance when drawn, warn if >200,000 km²) |
| 25 | "Calculate Stats" button | Click | Highlight button, ask user to click it |
| 26 | Results chart | View | Highlight the results bar chart, explain what it shows |

### **Phase 6: AI Assistant (Steps 27-28)**
**Purpose:** Interactive AI help

| Step | Element | Action Required | Description |
|------|---------|-----------------|-------------|
| 27 | AI Copilot button | Click | Highlight AI button (right side of screen), ask user to click it |
| 28 | Chat textarea | Type & Send | Highlight chat input, ask user to type a message and send |

### **Final Step: Tour Completion**

| Step | Action | Description |
|------|--------|-------------|
| 29 | End Tour | Show "End Tour" button with confirmation dialog to mark as complete |

---

## 🏗️ Technical Architecture

### **1. Database Changes**

#### **Add `tutorial_completed` Column to Users Table**

**File:** `backend/src/index.ts`

**Location:** In the `initializeDatabase()` function, modify the `users` table creation (around line 106-119):

```typescript
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    phone_number VARCHAR(50),
    country VARCHAR(255),
    job_title VARCHAR(255),
    institution VARCHAR(255),
    profile_complete BOOLEAN NOT NULL DEFAULT true,
    tutorial_completed BOOLEAN NOT NULL DEFAULT false,  // ← ADD THIS LINE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
```

**Important:** Since the database is empty, this table will be created fresh with the new column when the backend starts. No migration needed.

---

### **2. Backend API Endpoints**

#### **A. Get User Profile (with tutorial_completed)**

**File:** `backend/src/routes/userRoutes.ts` (create or modify)

**Endpoint:** `GET /api/admin/me`

**Response:** Should include `tutorial_completed` field:

```typescript
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "tutorial_completed": false,  // ← ADD THIS
  "phone_number": "...",
  "country": "...",
  "job_title": "...",
  "institution": "...",
  "profile_complete": true,
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### **B. Update Tutorial Completion Status**

**File:** Create `backend/src/routes/tutorialRoutes.ts`

**Endpoint:** `PATCH /api/users/me/tutorial`

**Request Body:**
```typescript
{
  "tutorial_completed": boolean
}
```

**Implementation:**
```typescript
import { Router } from 'express';
import pool from '../config/database';

const router = Router();

// Update tutorial completion status
router.patch('/me/tutorial', async (req: any, res: any) => {
  try {
    const userId = req.user?.id; // Get from auth middleware
    const { tutorial_completed } = req.body;

    if (typeof tutorial_completed !== 'boolean') {
      return res.status(400).json({ error: 'tutorial_completed must be a boolean' });
    }

    const result = await pool.query(
      'UPDATE users SET tutorial_completed = $1, updated_at = NOW() WHERE id = $2 RETURNING id, tutorial_completed',
      [tutorial_completed, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Tutorial status updated',
      tutorial_completed: result.rows[0].tutorial_completed
    });
  } catch (error: any) {
    console.error('Error updating tutorial status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### **C. Register Tutorial Routes**

**File:** `backend/src/index.ts`

**Location:** Around line 84, add:

```typescript
import tutorialRoutes from './routes/tutorialRoutes';

// ... existing routes ...

app.use('/api/users', tutorialRoutes);
```

---

### **3. Frontend Type Updates**

#### **Update User Interface**

**File:** `frontend/contexts/AuthContext.tsx`

**Location:** Update the User interface (around line 6-17):

```typescript
interface User {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  phone_number?: string
  country?: string
  job_title?: string
  institution?: string
  profile_complete: boolean
  tutorial_completed: boolean  // ← ADD THIS
  created_at: string
}
```

---

### **4. Frontend Components - Core Tutorial System**

#### **A. Tutorial Step Configuration**

**File:** `frontend/components/tutorial/TutorialConfig.tsx` (create new file)

```typescript
export interface TutorialStep {
  id: number
  phase: string
  title: string
  content: string
  target: string  // CSS selector or element reference
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  actionType?: 'click' | 'select' | 'draw' | 'type' | 'slide' | 'submit' | 'none'
  waitForAction?: boolean
  canSkipAfter?: number  // seconds before skip button appears
  validateAction?: () => boolean | Promise<boolean>
  onNext?: () => void | Promise<void>
}

export const tutorialSteps: TutorialStep[] = [
  // Phase 1: Map Basics
  {
    id: 1,
    phase: 'Map Basics',
    title: 'Choose a Base Map',
    content: 'Click on the "Base Maps" tab to see different map styles you can use as the background.',
    target: '[data-tutorial="basemaps-tab"]',
    position: 'right',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 2,
    phase: 'Map Basics',
    title: 'Apply a Base Map',
    content: 'Click on any base map thumbnail to apply it to the map. Try "OpenStreetMap" for a detailed view.',
    target: '[data-tutorial="basemap-openstreetmap"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 3,
    phase: 'Map Basics',
    title: 'Explore Data Layers',
    content: 'Click on the "Data" tab to see available data layers you can overlay on the map.',
    target: '[data-tutorial="data-tab"]',
    position: 'right',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 4,
    phase: 'Map Basics',
    title: 'Activate a Layer',
    content: 'Click on any layer to activate it. The layer will appear on the map with its color scheme.',
    target: '[data-tutorial="layer-first-available"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 5,
    phase: 'Map Basics',
    title: 'Understanding the Legend',
    content: 'The legend shows what each color represents in the active layer. It helps you interpret the map data.',
    target: '[data-tutorial="legend"]',
    position: 'left',
    actionType: 'none',
    waitForAction: false,
  },

  // Phase 2: Country & Export
  {
    id: 6,
    phase: 'Navigation & Export',
    title: 'Select a Country',
    content: 'Use the country selector to zoom to a specific African country and see its boundaries.',
    target: '[data-tutorial="country-selector"]',
    position: 'bottom',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 7,
    phase: 'Navigation & Export',
    title: 'Export Your Map',
    content: 'Click "Export" to save the current map view as an image for reports or presentations.',
    target: '[data-tutorial="export-button"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },

  // Phase 3: Reporting (Steps 8a-8e)
  {
    id: 8,
    phase: 'Reporting Invalid Data',
    title: 'Start Reporting',
    content: 'Found incorrect data? Click "Report Invalid Data" to flag it for review.',
    target: '[data-tutorial="report-button"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 9,
    phase: 'Reporting Invalid Data',
    title: 'Choose a Drawing Tool',
    content: 'Select either the rectangle or polygon tool from the draw control to outline the incorrect area.',
    target: '[data-tutorial="draw-control"]',
    position: 'bottom',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 10,
    phase: 'Reporting Invalid Data',
    title: 'Draw the Area',
    content: 'Draw a shape around the area with incorrect data. Be as precise as possible.',
    target: '[data-tutorial="map-container"]',
    position: 'center',
    actionType: 'draw',
    waitForAction: true,
  },
  {
    id: 11,
    phase: 'Reporting Invalid Data',
    title: 'Add a Comment',
    content: 'Describe what\'s wrong with the data in this area. This helps the team understand and fix the issue.',
    target: '[data-tutorial="report-comment"]',
    position: 'top',
    actionType: 'type',
    waitForAction: true,
  },
  {
    id: 12,
    phase: 'Reporting Invalid Data',
    title: 'Submit Your Report',
    content: 'Click "Submit" to send your report. The team will review and address the issue.',
    target: '[data-tutorial="report-submit"]',
    position: 'top',
    actionType: 'submit',
    waitForAction: true,
  },

  // Phase 4: Compare Layers (Steps 13-19)
  {
    id: 13,
    phase: 'Compare Layers',
    title: 'Start Compare Mode',
    content: 'Click "Compare Layers" to view two different layers side by side and see changes over time.',
    target: '[data-tutorial="compare-button"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 14,
    phase: 'Compare Layers',
    title: 'Select Left Layer Group',
    content: 'Choose a group for the left side of the comparison. This will be your "before" or reference layer.',
    target: '[data-tutorial="compare-left-group"]',
    position: 'right',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 15,
    phase: 'Compare Layers',
    title: 'Select Left Layer',
    content: 'Now select the specific layer to display on the left side.',
    target: '[data-tutorial="compare-left-layer"]',
    position: 'right',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 16,
    phase: 'Compare Layers',
    title: 'Select Right Layer Group',
    content: 'Choose a group for the right side. This will be your "after" or comparison layer.',
    target: '[data-tutorial="compare-right-group"]',
    position: 'left',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 17,
    phase: 'Compare Layers',
    title: 'Select Right Layer',
    content: 'Select the specific layer for the right side of the comparison.',
    target: '[data-tutorial="compare-right-layer"]',
    position: 'left',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 18,
    phase: 'Compare Layers',
    title: 'Enter Compare Mode',
    content: 'Click "Compare" to enter the side-by-side comparison view.',
    target: '[data-tutorial="compare-modal-submit"]',
    position: 'top',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 19,
    phase: 'Compare Layers',
    title: 'Use the Slider',
    content: 'Drag the slider left or right to reveal more of one layer or the other. Compare the differences!',
    target: '[data-tutorial="compare-slider"]',
    position: 'center',
    actionType: 'slide',
    waitForAction: true,
  },
  {
    id: 20,
    phase: 'Compare Layers',
    title: 'Edit Left Layer',
    content: 'Click on the left layer label to change it and try a different comparison.',
    target: '[data-tutorial="compare-left-label"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 21,
    phase: 'Compare Layers',
    title: 'Choose New Layer',
    content: 'Select a different layer from the dropdown and click "Confirm" to update the comparison.',
    target: '[data-tutorial="edit-modal-layer-select"]',
    position: 'top',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 22,
    phase: 'Compare Layers',
    title: 'Exit Compare Mode',
    content: 'Click "Exit" to return to the normal map view.',
    target: '[data-tutorial="compare-exit"]',
    position: 'top',
    actionType: 'click',
    waitForAction: true,
  },

  // Phase 5: Statistics (Steps 23-28)
  {
    id: 23,
    phase: 'Statistical Analysis',
    title: 'Access Statistics',
    content: 'Click on the "Stats" tab to calculate land cover statistics for any area you draw.',
    target: '[data-tutorial="stats-tab"]',
    position: 'right',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 24,
    phase: 'Statistical Analysis',
    title: 'Select a Layer for Stats',
    content: 'Choose a layer that has statistics capability. Look for layers marked with stats support.',
    target: '[data-tutorial="stats-layer-select"]',
    position: 'bottom',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 25,
    phase: 'Statistical Analysis',
    title: 'Start Drawing for Stats',
    content: 'Click "Start Drawing" to begin. You\'ll draw an area to calculate its land cover composition.',
    target: '[data-tutorial="stats-start-drawing"]',
    position: 'bottom',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 26,
    phase: 'Statistical Analysis',
    title: 'Select Drawing Tool',
    content: 'Choose rectangle or polygon tool to draw your analysis area.',
    target: '[data-tutorial="draw-control"]',
    position: 'bottom',
    actionType: 'select',
    waitForAction: true,
  },
  {
    id: 27,
    phase: 'Statistical Analysis',
    title: 'Draw Analysis Area',
    content: 'Draw a small area on the map. Note: Maximum area is 200,000 km² for performance reasons.',
    target: '[data-tutorial="map-container"]',
    position: 'center',
    actionType: 'draw',
    waitForAction: true,
  },
  {
    id: 28,
    phase: 'Statistical Analysis',
    title: 'Calculate Statistics',
    content: 'Click "Calculate Stats" to generate a breakdown of land cover types in your drawn area.',
    target: '[data-tutorial="stats-calculate"]',
    position: 'top',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 29,
    phase: 'Statistical Analysis',
    title: 'View Results',
    content: 'The chart shows the percentage of each land cover type in your area. Use this for analysis and reporting.',
    target: '[data-tutorial="stats-chart"]',
    position: 'left',
    actionType: 'none',
    waitForAction: false,
  },

  // Phase 6: AI Assistant (Steps 30-31)
  {
    id: 30,
    phase: 'AI Assistant',
    title: 'Open AI Copilot',
    content: 'Click the AI button to get help with the map, data, or any questions you have.',
    target: '[data-tutorial="ai-button"]',
    position: 'left',
    actionType: 'click',
    waitForAction: true,
  },
  {
    id: 31,
    phase: 'AI Assistant',
    title: 'Chat with AI',
    content: 'Type your question or request in the chat and press Enter. The AI will help you analyze data or understand features.',
    target: '[data-tutorial="ai-chat-input"]',
    position: 'left',
    actionType: 'type',
    waitForAction: true,
  },

  // Final: Tour Completion
  {
    id: 32,
    phase: 'Complete',
    title: 'Tutorial Complete!',
    content: 'You\'ve learned all the key features! Click "End Tour" to mark it as complete. You can always restart it from the map page.',
    target: 'body',
    position: 'center',
    actionType: 'none',
    waitForAction: false,
  },
];
```

---

#### **B. Tutorial Overlay Component**

**File:** `frontend/components/tutorial/TutorialOverlay.tsx` (create new file)

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { tutorialSteps, TutorialStep } from './TutorialConfig'

interface TutorialOverlayProps {
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  mapState?: any  // Will receive map state for action detection
}

export default function TutorialOverlay({
  isActive,
  onComplete,
  onSkip,
  mapState
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showSkipButton, setShowSkipButton] = useState(false)
  const [isWaitingForAction, setIsWaitingForAction] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmType, setConfirmType] = useState<'skip' | 'complete'>('skip')

  const step = tutorialSteps[currentStep]
  const targetRef = useRef<HTMLElement | null>(null)

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !step) return

    const target = document.querySelector(step.target) as HTMLElement
    if (target) {
      targetRef.current = target
      // Scroll element into view if needed
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isActive, step, currentStep])

  // Handle action-based steps
  useEffect(() => {
    if (!isActive || !step) return

    if (step.waitForAction && step.actionType !== 'none') {
      setIsWaitingForAction(true)
      setupActionListeners(step)
    } else {
      setIsWaitingForAction(false)
    }

    // Show skip button after delay
    if (step.canSkipAfter) {
      const timer = setTimeout(() => {
        setShowSkipButton(true)
      }, step.canSkipAfter * 1000)
      return () => clearTimeout(timer)
    }
  }, [isActive, step, currentStep])

  // Setup event listeners based on action type
  const setupActionListeners = (step: TutorialStep) => {
    const target = document.querySelector(step.target) as HTMLElement
    if (!target) return

    const handleAction = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()

      // Validate action if validation function exists
      if (step.validateAction) {
        const isValid = step.validateAction()
        if (!isValid) return
      }

      // Execute onNext callback if exists
      if (step.onNext) {
        step.onNext()
      }

      // Move to next step
      handleNext()
    }

    // Add appropriate listener based on action type
    switch (step.actionType) {
      case 'click':
      case 'submit':
        target.addEventListener('click', handleAction)
        break
      case 'select':
        target.addEventListener('change', handleAction)
        break
      case 'type':
        // For type actions, wait for Enter key or blur
        const handleTypeAction = (e: KeyboardEvent | FocusEvent) => {
          if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Enter') {
            handleAction(e)
          }
        }
        target.addEventListener('keydown', handleTypeAction)
        target.addEventListener('blur', handleAction)
        break
      case 'draw':
        // Draw actions are detected via map state changes
        // This requires MapComponent to emit events or expose state
        setupDrawListener()
        break
      case 'slide':
        setupSlideListener()
        break
    }

    // Cleanup
    return () => {
      target.removeEventListener('click', handleAction)
      target.removeEventListener('change', handleAction)
      target.removeEventListener('keydown', handleTypeAction as any)
      target.removeEventListener('blur', handleTypeAction as any)
    }
  }

  // Listener for draw actions
  const setupDrawListener = () => {
    // This needs to integrate with MapComponent's draw events
    // MapComponent should emit custom events when drawing completes
    const handleDrawComplete = () => {
      handleNext()
    }

    window.addEventListener('tutorial-draw-complete', handleDrawComplete)
    return () => window.removeEventListener('tutorial-draw-complete', handleDrawComplete)
  }

  // Listener for slide actions (compare mode slider)
  const setupSlideListener = () => {
    const handleSlide = () => {
      handleNext()
    }

    window.addEventListener('tutorial-slide-complete', handleSlide)
    return () => window.removeEventListener('tutorial-slide-complete', handleSlide)
  }

  // Handle next step
  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      setShowSkipButton(false)
    } else {
      // Last step - show completion dialog
      setConfirmType('complete')
      setShowConfirmDialog(true)
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setShowSkipButton(false)
    }
  }

  // Handle skip with confirmation
  const handleSkipClick = () => {
    setConfirmType('skip')
    setShowConfirmDialog(true)
  }

  // Confirm skip or complete
  const handleConfirm = () => {
    setShowConfirmDialog(false)
    if (confirmType === 'skip') {
      onSkip()
    } else {
      onComplete()
    }
  }

  // Cancel confirmation
  const handleCancelConfirm = () => {
    setShowConfirmDialog(false)
  }

  if (!isActive || !step) return null

  return (
    <>
      {/* Blurred overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] pointer-events-none" />

      {/* Highlighted area (clear box around target) */}
      {targetRef.current && (
        <div
          className="absolute z-[9999] border-4 border-green-400 rounded-lg shadow-2xl transition-all duration-300"
          style={{
            top: targetRef.current.getBoundingClientRect().top + window.scrollY - 8,
            left: targetRef.current.getBoundingClientRect().left + window.scrollX - 8,
            width: targetRef.current.offsetWidth + 16,
            height: targetRef.current.offsetHeight + 16,
          }}
        />
      )}

      {/* Tutorial content box */}
      <div
        className="fixed z-[10000] bg-white rounded-xl shadow-2xl p-6 max-w-md transition-all duration-300"
        style={{
          top: targetRef.current
            ? Math.min(
                targetRef.current.getBoundingClientRect().top + window.scrollY,
                window.innerHeight - 300
              )
            : '50%',
          left: targetRef.current
            ? Math.min(
                targetRef.current.getBoundingClientRect().right + window.scrollX + 20,
                window.innerWidth - 400
              )
            : '50%',
          transform: targetRef.current ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{step.phase}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{step.content}</p>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
            >
              Previous
            </button>
          )}

          {!isWaitingForAction && (
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
            >
              {currentStep === tutorialSteps.length - 1 ? 'End Tour' : 'Next'}
            </button>
          )}

          {isWaitingForAction && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2" />
              Waiting for action...
            </div>
          )}

          {showSkipButton && (
            <button
              onClick={handleSkipClick}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition text-sm font-medium"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {confirmType === 'skip' ? 'Skip Tutorial?' : 'Complete Tutorial?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmType === 'skip'
                ? 'This will mark the tutorial as complete. You can always start it again from the "Show Tutorial" button on the map page.'
                : 'You\'ve reached the end of the tutorial! Mark it as complete so it doesn\'t show automatically again?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
              >
                {confirmType === 'skip' ? 'Skip Tour' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

---

#### **C. Tutorial Button (Manual Trigger)**

**File:** `frontend/components/tutorial/TutorialButton.tsx` (create new file)

```typescript
'use client'

import { useState } from 'react'

interface TutorialButtonProps {
  onStart: () => void
  isCompleted?: boolean
}

export default function TutorialButton({ onStart, isCompleted }: TutorialButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    if (isCompleted) {
      setShowConfirm(true)
    } else {
      onStart()
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium"
        title={isCompleted ? 'Show tutorial again' : 'Start tutorial'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isCompleted ? 'Show Tutorial' : 'Start Tutorial'}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Start Tutorial Again?</h3>
            <p className="text-gray-600 mb-6">
              You've already completed the tutorial. Would you like to go through it again?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  onStart()
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
              >
                Start Tutorial
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

---

### **5. Integration with MapComponent**

#### **A. Add Data Attributes to Elements**

**File:** `frontend/components/MapComponent.tsx`

Add `data-tutorial` attributes to key elements:

```typescript
// Base Maps tab button
<button
  data-tutorial="basemaps-tab"
  onClick={() => state.setActiveTab('basemaps')}
  // ... existing props
>
  Base Maps
</button>

// Data tab button
<button
  data-tutorial="data-tab"
  onClick={() => state.setActiveTab('data')}
  // ... existing props
>
  Data
</button>

// Stats tab button
<button
  data-tutorial="stats-tab"
  onClick={() => state.setActiveTab('stats')}
  // ... existing props
>
  Stats
</button>

// Export button
<button
  data-tutorial="export-button"
  onClick={() => handleExport(setIsExporting)}
  // ... existing props
>
  {isExporting ? 'Exporting...' : 'Export'}
</button>

// Compare button
<button
  data-tutorial="compare-button"
  onClick={() => setShowComparePicker(true)}
  // ... existing props
>
  <span className="text-lg">⇔</span>
  Compare Layers
</button>

// Compare mode exit button
<button
  data-tutorial="compare-exit"
  onClick={onExitCompare}
  // ... existing props
>
  Exit
</button>

// Country selector container
<div data-tutorial="country-selector">
  <CountrySelector
    // ... existing props
  />
</div>

// Map container
<div
  data-tutorial="map-container"
  ref={mapContainerRef}
  // ... existing props
/>

// Legend wrapper (if not already wrapped)
<div data-tutorial="legend">
  <Legend legend={activeLayerLegend} layerName={activeLayerName} />
</div>
```

#### **B. BasemapsTab Component Updates**

**File:** `frontend/components/map/BasemapsTab.tsx`

```typescript
export default function BasemapsTab({ activeBasemap, onBasemapChange }: BasemapsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {basemapInfo.map((basemap, index) => (
        <button
          key={basemap.name}
          data-tutorial={index === 0 ? "basemap-openstreetmap" : undefined}  // Mark first basemap
          onClick={() => onBasemapChange(basemap.name)}
          // ... existing props
        >
          {/* ... existing content */}
        </button>
      ))}
    </div>
  )
}
```

#### **C. DataTab Component Updates**

**File:** `frontend/components/map/DataTab.tsx`

```typescript
// Report button
<button
  data-tutorial="report-button"
  onClick={onStartReport}
  // ... existing props
>
  Report Invalid Data
</button>

// First layer button (in renderLayerButton)
<button
  key={layer.id}
  data-tutorial={layer.id === allLayers[0]?.id ? "layer-first-available" : undefined}
  onClick={() => onDataLayerToggle(layer)}
  // ... existing props
>
  {/* ... existing content */}
</button>
```

#### **D. StatsTab Component Updates**

**File:** `frontend/components/map/StatsTab.tsx`

```typescript
// Start Drawing button
<button
  data-tutorial="stats-start-drawing"
  onClick={onStartStats}
  // ... existing props
>
  Start Drawing
</button>

// Calculate Stats button
<button
  data-tutorial="stats-calculate"
  onClick={onCalculateStats}
  // ... existing props
>
  {isCalculatingStats ? 'Calculating...' : 'Calculate Stats'}
</button>

// Stats results chart container
<div data-tutorial="stats-chart">
  <StatsBarChart
    classes={statsResults.classes || []}
    totalArea={statsResults.total_area_km2 || 0}
  />
</div>
```

#### **E. ReportingOverlay Component Updates**

**File:** `frontend/components/map/ReportingOverlay.tsx`

```typescript
// Comment textarea
<textarea
  data-tutorial="report-comment"
  value={reportComment}
  onChange={(e) => onReportCommentChange(e.target.value)}
  // ... existing props
/>

// Submit button
<button
  data-tutorial="report-submit"
  onClick={onSubmitReport}
  // ... existing props
>
  {isSubmittingReport ? 'Submitting...' : 'Submit'}
</button>
```

#### **F. AICopilot Component Updates**

**File:** `frontend/components/AICopilot.tsx`

```typescript
// AI toggle button
<button
  data-tutorial="ai-button"
  onClick={() => setIsOpen(true)}
  // ... existing props
>
  {/* ... existing content */}
</button>

// Chat textarea
<textarea
  data-tutorial="ai-chat-input"
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
  // ... existing props
/>
```

#### **G. Compare Mode Elements**

In MapComponent, add attributes to compare-related elements:

```typescript
// Compare picker modal
{showComparePicker && (
  <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-lg shadow-xl p-6 w-[600px]">
      <h3 className="text-lg font-semibold mb-6 text-gray-900">Compare Layers</h3>

      {/* Left group selector */}
      <select
        data-tutorial="compare-left-group"
        // ... existing props
      >
        {/* ... options */}
      </select>

      {/* Left layer selector */}
      <select
        data-tutorial="compare-left-layer"
        // ... existing props
      >
        {/* ... options */}
      </select>

      {/* Right group selector */}
      <select
        data-tutorial="compare-right-group"
        // ... existing props
      >
        {/* ... options */}
      </select>

      {/* Right layer selector */}
      <select
        data-tutorial="compare-right-layer"
        // ... existing props
      >
        {/* ... options */}
      </select>

      {/* Compare button */}
      <button
        data-tutorial="compare-modal-submit"
        onClick={onStartCompare}
        // ... existing props
      >
        Compare
      </button>

      {/* ... */}
    </div>
  </div>
)}

// Layer change modal
{showLayerChangeModal && (
  <div className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-lg shadow-xl p-6 w-[600px]">
      {/* Layer selector in edit modal */}
      <select
        data-tutorial="edit-modal-layer-select"
        // ... existing props
      >
        {/* ... options */}
      </select>

      {/* Confirm button */}
      <button
        onClick={handleConfirmLayerChange}
        // ... existing props
      >
        Confirm
      </button>
    </div>
  </div>
)}

// Compare mode active - left layer label
{isCompareMode && (
  <div
    data-tutorial="compare-left-label"
    onClick={() => handleOpenLayerChange('left')}
    // ... existing props
  >
    {/* ... content */}
  </div>
)}
```

---

#### **H. Emit Custom Events for Tutorial**

In MapComponent or relevant hooks, emit events when tutorial-relevant actions occur:

```typescript
// In useMapInitialization.ts, after drawing completes for reporting:
useEffect(() => {
  const map = mapRef.current
  if (!map) return

  const handleDrawCreated = (event: any) => {
    if (reportingMode && reportingStep === 'draw') {
      // ... existing code ...

      // Emit event for tutorial
      window.dispatchEvent(new CustomEvent('tutorial-draw-complete'))
    }
  }

  map.on(L.Draw.Event.CREATED, handleDrawCreated)

  return () => {
    map.off(L.Draw.Event.CREATED, handleDrawCreated)
  }
}, [reportingMode, reportingStep])

// Similar for stats mode
useEffect(() => {
  const map = mapRef.current
  if (!map) return

  const handleDrawCreated = (event: any) => {
    if (statsMode) {
      // ... existing code ...

      // Emit event for tutorial
      window.dispatchEvent(new CustomEvent('tutorial-draw-complete'))
    }
  }

  map.on(L.Draw.Event.CREATED, handleDrawCreated)

  return () => {
    map.off(L.Draw.Event.CREATED, handleDrawCreated)
  }
}, [statsMode])

// For compare slider detection, you may need to add event listeners
// to the slider element when compare mode is active
```

---

### **6. Map Page Integration**

**File:** `frontend/app/map/page.tsx`

```typescript
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AICopilot from '@/components/AICopilot'
import { useAuth } from '@/contexts/AuthContext'
import TutorialOverlay from '@/components/tutorial/TutorialOverlay'
import TutorialButton from '@/components/tutorial/TutorialButton'

// ... existing imports and interfaces ...

// Dynamically import the map component
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  ),
})

function MapPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const [reportToView, setReportToView] = useState<ReportToView | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  // Tutorial state
  const [isTutorialActive, setIsTutorialActive] = useState(false)
  const [tutorialInitialized, setTutorialInitialized] = useState(false)

  // Check if user needs tutorial
  useEffect(() => {
    if (!loading && isAuthenticated && user && !tutorialInitialized) {
      setTutorialInitialized(true)

      // Auto-start tutorial if not completed
      const forceStart = searchParams.get('tutorial') === 'true'
      const forceSkip = searchParams.get('tutorial') === 'false'

      if (forceStart || (!user.tutorial_completed && !forceSkip && !reportToView)) {
        // Small delay to ensure map is loaded
        setTimeout(() => {
          setIsTutorialActive(true)
        }, 1000)
      }
    }
  }, [loading, isAuthenticated, user, tutorialInitialized, searchParams, reportToView])

  // Update tutorial completion status
  const handleTutorialComplete = async () => {
    setIsTutorialActive(false)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/tutorial', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tutorial_completed: true }),
      })

      if (!response.ok) {
        console.error('Failed to update tutorial status')
      }
    } catch (error) {
      console.error('Error updating tutorial status:', error)
    }
  }

  // Skip tutorial
  const handleTutorialSkip = async () => {
    setIsTutorialActive(false)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/tutorial', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tutorial_completed: true }),
      })

      if (!response.ok) {
        console.error('Failed to update tutorial status')
      }
    } catch (error) {
      console.error('Error updating tutorial status:', error)
    }
  }

  // ... existing auth and report loading code ...

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 overflow-hidden">
      {/* Tutorial overlay */}
      {isTutorialActive && (
        <TutorialOverlay
          isActive={isTutorialActive}
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Map content */}
      {reportLoading ? (
        // ... existing loading state ...
      ) : reportError ? (
        // ... existing error state ...
      ) : (
        <>
          <MapComponent reportToView={reportToView} />
          <AICopilot />
        </>
      )}

      {/* Tutorial button - position appropriately */}
      {!reportToView && (
        <div className="absolute top-4 left-[420px] z-40">  {/* Adjust position as needed */}
          <TutorialButton
            onStart={() => setIsTutorialActive(true)}
            isCompleted={user?.tutorial_completed}
          />
        </div>
      )}
    </div>
  )
}

// ... existing export default ...
```

---

### **7. Authentication Flow Updates**

#### **A. Update Auth Redirects After Signup/Login**

**File:** `frontend/app/signup/page.tsx` and `frontend/app/login/page.tsx`

After successful signup/login, redirect to map page instead of dashboard/admin:

```typescript
// In signup page, after successful signup:
res.json({
  message: 'User created successfully',
  token,
  user: {
    // ... user data
  },
  // Add redirect info
  redirectTo: '/map'  // or handle this in frontend
})

// In frontend, after successful login/signup:
const handleLoginSuccess = (data: any) => {
  login(data.token, data.user)

  // Check if tutorial is needed
  if (!data.user.tutorial_completed) {
    router.push('/map?tutorial=true')
  } else {
    router.push(data.user.role === 'admin' ? '/admin' : '/dashboard')
  }
}
```

**File:** `frontend/app/auth/callback/page.tsx` (OAuth callback)

```typescript
// After successful OAuth:
useEffect(() => {
  const token = searchParams.get('token')
  const userStr = searchParams.get('user')

  if (token && userStr) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr))
      login(token, user)

      // Check if tutorial is needed
      if (!user.profile_complete) {
        router.push('/complete-profile')
      } else if (!user.tutorial_completed) {
        router.push('/map?tutorial=true')
      } else {
        if (user.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login?error=invalid_callback_data')
    }
  } else {
    router.push('/login?error=no_token_provided')
  }
}, [router, searchParams, login])
```

---

## 🧪 Testing Checklist

### **Phase 1: Foundation**
- [ ] Database table creates with `tutorial_completed` column
- [ ] `GET /api/admin/me` returns `tutorial_completed` field
- [ ] `PATCH /api/users/me/tutorial` updates the field
- [ ] Tutorial button appears on map page
- [ ] Tutorial auto-starts for new users after signup
- [ ] Tutorial auto-starts for OAuth users after first login
- [ ] Tutorial doesn't auto-start for users with `tutorial_completed: true`

### **Phase 2: Map Basics (Steps 1-5)**
- [ ] Step 1 highlights Base Maps tab
- [ ] Clicking Base Maps tab advances to step 2
- [ ] Step 2 highlights a basemap thumbnail
- [ ] Clicking basemap advances to step 3
- [ ] Step 3 highlights Data tab
- [ ] Clicking Data tab advances to step 4
- [ ] Step 4 highlights a layer
- [ ] Clicking layer advances to step 5
- [ ] Step 5 highlights legend
- [ ] "Next" button advances to step 6

### **Phase 3: Country & Export (Steps 6-7)**
- [ ] Step 6 highlights country selector
- [ ] Selecting a country advances to step 7
- [ ] Step 7 highlights Export button
- [ ] Clicking Export advances to step 8

### **Phase 4: Reporting (Steps 8a-8e)**
- [ ] Step 8a highlights Report button
- [ ] Clicking Report button opens reporting mode, advances to 8b
- [ ] Step 8b highlights draw control
- [ ] Selecting tool enables drawing, advances to 8c
- [ ] Step 8c shows drawing instruction
- [ ] Drawing shape auto-advances to 8d
- [ ] Step 8d highlights comment textarea
- [ ] Typing comment and pressing Enter advances to 8e
- [ ] Step 8e highlights Submit button
- [ ] Clicking Submit submits report, advances to step 9

### **Phase 5: Compare Layers (Steps 9-14)**
- [ ] Step 9 highlights Compare button
- [ ] Clicking Compare opens modal, advances to step 10
- [ ] Step 10 highlights left group selector
- [ ] Selecting group advances to step 11
- [ ] Step 11 highlights left layer selector
- [ ] Selecting layer advances to step 12
- [ ] Step 12 highlights right group selector
- [ ] Selecting group advances to step 13
- [ ] Step 13 highlights right layer selector
- [ ] Selecting layer advances to step 14
- [ ] Step 14 highlights Compare button in modal
- [ ] Clicking Compare enters compare mode, advances to step 15
- [ ] Step 15 highlights slider
- [ ] Sliding advances to step 16
- [ ] Step 16 highlights left layer label
- [ ] Clicking label opens edit modal, advances to step 17
- [ ] Step 17 highlights layer selector in edit modal
- [ ] Selecting layer and clicking Confirm advances to step 18
- [ ] Step 18 shows updated comparison
- [ ] Clicking Next advances to step 19
- [ ] Step 19 highlights Exit button
- [ ] Clicking Exit exits compare mode, advances to step 20

### **Phase 6: Statistics (Steps 20-26)**
- [ ] Step 20 highlights Stats tab
- [ ] Clicking Stats tab advances to step 21
- [ ] Step 21 highlights layer selector
- [ ] Selecting layer advances to step 22
- [ ] Step 22 highlights "Start Drawing" button
- [ ] Clicking button enables drawing, advances to step 23
- [ ] Step 23 highlights draw control
- [ ] Selecting tool enables drawing, advances to step 24
- [ ] Step 24 shows drawing instruction
- [ ] Drawing shape auto-advances to step 25
- [ ] Step 25 highlights "Calculate Stats" button
- [ ] Clicking button calculates stats, advances to step 26
- [ ] Step 26 highlights results chart
- [ ] Clicking Next advances to step 27

### **Phase 7: AI Assistant (Steps 27-28)**
- [ ] Step 27 highlights AI button
- [ ] Clicking AI button opens chat, advances to step 28
- [ ] Step 28 highlights chat input
- [ ] Typing message and sending advances to final step

### **Phase 8: Completion**
- [ ] Final step shows completion message
- [ ] Clicking "End Tour" shows confirmation dialog
- [ ] Confirming marks tutorial as complete in DB
- [ ] Tutorial closes and doesn't auto-start again
- [ ] Tutorial button changes to "Show Tutorial"

### **Edge Cases**
- [ ] User clicks "Skip" at any point → Confirmation → Tutorial marked complete
- [ ] User refreshes page during tutorial → Tutorial continues from start (or restarts)
- [ ] User navigates away during tutorial → Tutorial closes, not marked complete
- [ ] User clicks "Show Tutorial" button → Confirmation → Tutorial starts from beginning
- [ ] URL parameter `?tutorial=true` forces tutorial start
- [ ] URL parameter `?tutorial=false` skips tutorial even if not completed
- [ ] Tutorial works with both email/password and OAuth users
- [ ] Tutorial doesn't interfere with normal map usage when not active

---

## 🔧 Troubleshooting

### **Issue: Tutorial doesn't auto-start after signup**
**Possible causes:**
1. `tutorial_completed` field not in user object
2. Auth redirect goes to dashboard instead of map
3. Tutorial state not initialized correctly

**Solution:**
1. Check `GET /api/admin/me` response includes `tutorial_completed`
2. Verify redirect logic in auth callback and login pages
3. Check console for errors in map page useEffect

### **Issue: Target element not found/highlighted**
**Possible causes:**
1. `data-tutorial` attribute missing
2. Element not rendered yet (timing issue)
3. CSS selector incorrect

**Solution:**
1. Verify all elements have correct `data-tutorial` attributes
2. Add delay in TutorialOverlay useEffect for elements that render asynchronously
3. Check browser dev tools for element existence

### **Issue: Action not detected/doesn't auto-advance**
**Possible causes:**
1. Event listener not attached
2. Wrong action type in step config
3. Custom event not emitted from MapComponent

**Solution:**
1. Add console.log in action listener to verify attachment
2. Check actionType matches user interaction (click vs change vs input)
3. Verify MapComponent emits `tutorial-draw-complete` and `tutorial-slide-complete` events

### **Issue: Compare slider not detected**
**Possible causes:**
1. Slider is created dynamically by leaflet-side-by-side library
2. Event listener not attached to slider element

**Solution:**
1. Add observer or interval to detect when slider appears
2. Attach mouse/touch event listeners to slider for drag detection
3. Emit custom event when drag ends

### **Issue: Tutorial interferes with map interactions**
**Possible causes:**
1. Overlay has wrong z-index
2. Overlay blocks clicks when it shouldn't
3. Highlight box positioned incorrectly

**Solution:**
1. Ensure overlay z-index is below map controls but above map
2. Add `pointer-events-none` to overlay blur div
3. Recalculate highlight box position on scroll/resize

---

## 📝 Implementation Order (Recommended)

1. **Phase 1: Foundation** (1-2 hours)
   - Add database column
   - Create backend API endpoints
   - Update frontend types
   - Create TutorialConfig with all steps
   - Create TutorialOverlay component
   - Create TutorialButton component
   - Test: Tutorial system initializes, button shows, auto-start triggers

2. **Phase 2: Integration with UI** (2-3 hours)
   - Add `data-tutorial` attributes to all elements
   - Integrate TutorialOverlay into map page
   - Integrate TutorialButton into map page
   - Update auth redirect logic
   - Test: Tutorial starts, highlights elements correctly

3. **Phase 3: Action Detection** (2-3 hours)
   - Implement event listeners for all action types
   - Add custom event emitters in MapComponent
   - Test: Each action correctly advances tutorial

4. **Phase 4: Compare Mode Special Handling** (1-2 hours)
   - Implement slider detection
   - Handle modal elements
   - Test: Compare mode steps work correctly

5. **Phase 5: Polish & Edge Cases** (1-2 hours)
   - Add confirmation dialogs
   - Implement skip functionality
   - Test edge cases
   - Test OAuth flow
   - Test replay functionality

**Total Estimated Time: 7-12 hours**

---

## 🎨 Customization Tips

### **Styling the Tutorial Overlay**
- Modify colors in TutorialOverlay.tsx (green-600 for primary, gray-200 for secondary)
- Adjust spacing and padding in the tutorial box
- Customize progress bar colors and animations

### **Adjusting Timing**
- Modify `canSkipAfter` values in TutorialConfig for each step
- Add delays in useEffect for async elements
- Adjust auto-advance timing in action listeners

### **Adding/Removing Steps**
- Add or remove steps in TutorialConfig.tsx
- Update step numbers in comments
- Update testing checklist accordingly

### **Changing Target Elements**
- Update `target` CSS selector in TutorialConfig
- Ensure corresponding `data-tutorial` attribute exists
- Test highlighting with different element positions

---

## 📚 Additional Resources

### **Related Files**
- `frontend/contexts/AuthContext.tsx` - User authentication and state
- `frontend/components/MapComponent.tsx` - Main map component
- `frontend/components/map/useMapState.ts` - Map state management
- `frontend/components/map/useMapInitialization.ts` - Map initialization and events
- `backend/src/index.ts` - Backend server and database initialization
- `backend/src/routes/authRoutes.ts` - Authentication endpoints

### **Key Concepts**
- **Spotlight Effect**: Achieved with backdrop blur and clear highlight box
- **Action Detection**: Event listeners on target elements + custom events
- **State Management**: React state for tutorial, database for completion status
- **Auto-Start Logic**: Check `tutorial_completed` on page load, respect URL params

### **Libraries Used**
- Next.js 15 with App Router
- React hooks (useState, useEffect, useRef)
- Tailwind CSS for styling
- Leaflet and leaflet-draw for map interactions
- leaflet-side-by-side for compare mode

---

## ✅ Success Criteria

The tutorial system is complete when:

1. ✅ New users (email/password and OAuth) are automatically redirected to map after signup/first login
2. ✅ Tutorial auto-starts with spotlight effect on first map visit
3. ✅ All 32 steps work correctly with proper element highlighting
4. ✅ Actions are detected and tutorial auto-advances appropriately
5. ✅ Skip and End Tour buttons show confirmation dialogs
6. ✅ Tutorial completion status is saved to database
7. ✅ Tutorial doesn't auto-start for returning users
8. ✅ "Show Tutorial" button allows manual replay anytime
9. ✅ Tutorial works seamlessly with all map features (reporting, compare, stats, AI)
10. ✅ Edge cases are handled (refresh, navigation away, OAuth, etc.)

---

## 🚀 Next Steps

After implementing this tutorial system:

1. **User Testing**: Have actual users go through the tutorial and gather feedback
2. **Analytics**: Track tutorial completion rates and drop-off points
3. **Optimization**: Adjust step timing, content, and highlighting based on feedback
4. **Localization**: Translate tutorial content for different languages
5. **Advanced Features**: Consider adding:
   - Keyboard shortcuts (Escape to skip, arrows to navigate)
   - Progress saving (resume from where user left off)
   - Multiple tutorial paths (basic vs advanced)
   - Context-sensitive help (click ? icon to show relevant tutorial step)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
**Maintainer:** Development Team
