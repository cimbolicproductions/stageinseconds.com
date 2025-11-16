/**
 * API testing utilities for making HTTP requests to the application
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000'

/**
 * Makes a request to the API
 */
export async function makeRequest(
  path: string,
  options?: globalThis.RequestInit
): Promise<Response> {
  const url = `${BASE_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  return response
}

/**
 * Makes an authenticated request using a session token
 */
export async function authenticatedRequest(
  sessionToken: string,
  path: string,
  options?: globalThis.RequestInit
): Promise<Response> {
  return makeRequest(path, {
    ...options,
    headers: {
      Cookie: `session=${sessionToken}`,
      ...options?.headers,
    },
  })
}

/**
 * Helper to parse JSON response body
 */
export async function getJsonResponse<T = unknown>(
  response: Response
): Promise<T> {
  const text = await response.text()
  if (!text) {
    return null as T
  }
  return JSON.parse(text) as T
}

/**
 * Helper to make a POST request with JSON body
 */
export async function postJson(
  path: string,
  body: unknown,
  options?: globalThis.RequestInit
): Promise<Response> {
  return makeRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Helper to make an authenticated POST request with JSON body
 */
export async function authenticatedPostJson(
  sessionToken: string,
  path: string,
  body: unknown,
  options?: globalThis.RequestInit
): Promise<Response> {
  return authenticatedRequest(sessionToken, path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Helper to make a PATCH request with JSON body
 */
export async function patchJson(
  path: string,
  body: unknown,
  options?: globalThis.RequestInit
): Promise<Response> {
  return makeRequest(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Helper to make an authenticated PATCH request with JSON body
 */
export async function authenticatedPatchJson(
  sessionToken: string,
  path: string,
  body: unknown,
  options?: globalThis.RequestInit
): Promise<Response> {
  return authenticatedRequest(sessionToken, path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Helper to make a DELETE request
 */
export async function deleteRequest(
  path: string,
  options?: globalThis.RequestInit
): Promise<Response> {
  return makeRequest(path, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * Helper to make an authenticated DELETE request
 */
export async function authenticatedDeleteRequest(
  sessionToken: string,
  path: string,
  options?: globalThis.RequestInit
): Promise<Response> {
  return authenticatedRequest(sessionToken, path, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * Helper to extract session token from Set-Cookie header
 */
export function extractSessionToken(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) return null

  const match = setCookie.match(/session=([^;]+)/)
  return match ? match[1] : null
}
