/**
 * Validation utilities for API requests
 * These functions throw errors with descriptive messages when validation fails
 */

/**
 * Validates an array of file URLs
 * @throws {Error} if URLs are invalid, not HTTPS, or array size is out of range
 */
export function validateFileUrls(urls: unknown): asserts urls is string[] {
  if (!Array.isArray(urls)) {
    throw new Error('fileUrls must be an array')
  }

  if (urls.length === 0) {
    throw new Error('At least one file URL is required')
  }

  if (urls.length > 30) {
    throw new Error('Maximum 30 files allowed')
  }

  for (const url of urls) {
    if (typeof url !== 'string') {
      throw new Error('All file URLs must be strings')
    }

    const { ok, reason } = isSafeUrl(url)
    if (!ok) {
      throw new Error(`Invalid file URL: ${reason}`)
    }
  }
}

/**
 * Validates a prompt string
 * @throws {Error} if prompt is missing or empty
 */
export function validatePrompt(prompt: unknown): asserts prompt is string {
  if (typeof prompt !== 'string') {
    throw new Error('Prompt must be a string')
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty')
  }
}

/**
 * Validates a group name
 * @throws {Error} if group name exceeds 140 characters
 */
export function validateGroupName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Group name must be a string')
  }

  if (name.length > 140) {
    throw new Error('Group name must be 140 characters or less')
  }
}

/**
 * Validates an email address
 * @throws {Error} if email is invalid
 */
export function validateEmail(email: unknown): asserts email is string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string')
  }

  // Basic email validation regex - more permissive to match real-world emails
  // Allows for local part and domain with at least one dot
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }

  // Additional checks for common invalid patterns
  if (email.startsWith('@') || email.endsWith('@')) {
    throw new Error('Invalid email format')
  }

  if (email.includes('..')) {
    throw new Error('Invalid email format')
  }
}

/**
 * Checks if a hostname is a private IP address
 * @returns true if the hostname is a private IP
 */
export function isPrivateIP(hostname: string): boolean {
  const host = hostname.toLowerCase()

  // Check for localhost and IPv6 loopback (with and without brackets)
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host === '0.0.0.0'
  ) {
    return true
  }

  // Check for private IP ranges (only if it's an IP literal)
  const privateIpPatterns = [
    /^(10)\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, // 10.0.0.0/8
    /^(172)\.(1[6-9]|2[0-9]|3[0-1])\.(\d{1,3})\.(\d{1,3})$/, // 172.16.0.0 - 172.31.255.255
    /^(192)\.(168)\.(\d{1,3})\.(\d{1,3})$/, // 192.168.0.0/16
    /^(169)\.(254)\.(\d{1,3})\.(\d{1,3})$/, // 169.254.0.0/16 (link-local)
  ]

  // Only check IP patterns if hostname looks like an IPv4 address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    for (const pattern of privateIpPatterns) {
      if (pattern.test(host)) {
        return true
      }
    }
  }

  return false
}

/**
 * Checks if a URL is safe to access (SSRF protection)
 * @returns {ok: true} if safe, {ok: false, reason: string} if unsafe
 */
export function isSafeUrl(urlStr: string): { ok: boolean; reason?: string } {
  try {
    const url = new URL(urlStr)

    // Block data: and file: URIs first (before protocol check)
    if (url.protocol === 'data:' || url.protocol === 'file:') {
      return { ok: false, reason: 'Data and file URIs are not allowed' }
    }

    // Only allow HTTPS protocol
    if (url.protocol !== 'https:') {
      return { ok: false, reason: 'Only HTTPS URLs are allowed' }
    }

    // Block localhost and private IPs
    if (isPrivateIP(url.hostname)) {
      return {
        ok: false,
        reason: 'Local and private IP addresses are not allowed',
      }
    }

    return { ok: true }
  } catch {
    return { ok: false, reason: 'Malformed URL' }
  }
}
