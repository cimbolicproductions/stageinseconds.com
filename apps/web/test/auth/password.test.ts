import { describe, it, expect } from 'vitest'
import { hash, verify } from 'argon2'

describe('Password Hashing with Argon2', () => {
  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hash(password)

      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
      expect(hashed).not.toBe(password)
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'mySecurePassword123'
      const hash1 = await hash(password)
      const hash2 = await hash(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should hash empty strings', async () => {
      const password = ''
      const hashed = await hash(password)

      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
    })
  })

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hash(password)
      const isValid = await verify(hashed, password)

      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'mySecurePassword123'
      const wrongPassword = 'wrongPassword456'
      const hashed = await hash(password)
      const isValid = await verify(hashed, wrongPassword)

      expect(isValid).toBe(false)
    })

    it('should reject empty password when hash is not empty', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hash(password)
      const isValid = await verify(hashed, '')

      expect(isValid).toBe(false)
    })

    it('should be case-sensitive', async () => {
      const password = 'Password123'
      const hashed = await hash(password)
      const isValidLower = await verify(hashed, 'password123')
      const isValidUpper = await verify(hashed, 'PASSWORD123')

      expect(isValidLower).toBe(false)
      expect(isValidUpper).toBe(false)
    })
  })

  describe('Security Properties', () => {
    it('should never store passwords in plain text', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hash(password)

      // Hash should not contain the plain password
      expect(hashed).not.toContain(password)
      expect(hashed.toLowerCase()).not.toContain(password.toLowerCase())
    })

    it('should produce hashes that start with argon2 identifier', async () => {
      const password = 'mySecurePassword123'
      const hashed = await hash(password)

      // Argon2 hashes start with $argon2
      expect(hashed).toMatch(/^\$argon2/)
    })

    it('should handle special characters in passwords', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?'
      const hashed = await hash(password)
      const isValid = await verify(hashed, password)

      expect(isValid).toBe(true)
    })

    it('should handle unicode characters in passwords', async () => {
      const password = 'пароль密码🔐'
      const hashed = await hash(password)
      const isValid = await verify(hashed, password)

      expect(isValid).toBe(true)
    })

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000)
      const hashed = await hash(password)
      const isValid = await verify(hashed, password)

      expect(isValid).toBe(true)
    })
  })
})
