const API_BASE = '/api'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Fetch wrapper that:
 * 1. Automatically adds Authorization header with token
 * 2. Auto-logs out on 401 (invalid/expired token)
 * 3. Redirects to login page
 */
export async function authFetch(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, headers = {}, ...restOptions } = options

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Add auth header if token exists and not skipped
  if (token && !skipAuth) {
    (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: finalHeaders,
  })

  // Auto-logout on 401 Unauthorized
  if (response.status === 401 && !skipAuth) {
    // Clear auth data
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // Redirect to login
    window.location.href = '/login'
  }

  return response
}

/**
 * Convenience methods
 */
export const api = {
  get: (endpoint: string, options?: FetchOptions) =>
    authFetch(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, body?: any, options?: FetchOptions) =>
    authFetch(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint: string, body?: any, options?: FetchOptions) =>
    authFetch(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: (endpoint: string, body?: any, options?: FetchOptions) =>
    authFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (endpoint: string, options?: FetchOptions) =>
    authFetch(endpoint, { ...options, method: 'DELETE' }),
}
