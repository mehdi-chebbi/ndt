/**
 * Analytics tracking utility
 * Fires fire-and-forget tracking calls to the backend.
 * Never blocks or throws — errors are silently swallowed.
 */

type ActionType = 'layer_view' | 'compare_started' | 'map_exported'

export function trackAction(actionType: ActionType, metadata?: Record<string, any>) {
  // Don't block the UI — fire and forget
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action_type: actionType, metadata }),
    }).catch(() => {
      // Silent fail — analytics should never break the app
    })
  } catch {
    // Silent fail
  }
}
