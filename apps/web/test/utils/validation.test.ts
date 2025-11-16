import { describe, it, expect } from 'vitest'
import {
  validateFileUrls,
  validatePrompt,
  validateGroupName,
  validateEmail,
} from '@/utils/validators'

describe('Input Validation', () => {
  describe('validateFileUrls', () => {
    it('should accept valid HTTPS URLs', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://cdn.example.com/image2.png',
        'https://storage.example.com/photos/image3.gif',
      ]

      expect(() => validateFileUrls(urls)).not.toThrow()
    })

    it('should reject HTTP URLs (only HTTPS allowed)', () => {
      const urls = ['http://example.com/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Only HTTPS URLs are allowed'
      )
    })

    it('should reject localhost URLs', () => {
      const urls = ['https://localhost/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject 127.0.0.1 URLs', () => {
      const urls = ['https://127.0.0.1/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject 0.0.0.0 URLs', () => {
      const urls = ['https://0.0.0.0/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject private IP addresses (10.x.x.x)', () => {
      const urls = ['https://10.0.0.1/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject private IP addresses (192.168.x.x)', () => {
      const urls = ['https://192.168.1.1/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject private IP addresses (172.16-31.x.x)', () => {
      const urls = ['https://172.16.0.1/image.jpg']

      expect(() => validateFileUrls(urls)).toThrow(
        'Local and private IP addresses are not allowed'
      )
    })

    it('should reject more than 30 files', () => {
      const urls = Array.from(
        { length: 31 },
        (_, i) => `https://example.com/image${i}.jpg`
      )

      expect(() => validateFileUrls(urls)).toThrow('Maximum 30 files allowed')
    })

    it('should reject empty file array', () => {
      const urls: string[] = []

      expect(() => validateFileUrls(urls)).toThrow(
        'At least one file URL is required'
      )
    })

    it('should reject non-array input', () => {
      expect(() => validateFileUrls('not an array')).toThrow(
        'fileUrls must be an array'
      )
    })

    it('should reject array with non-string elements', () => {
      const urls = [
        'https://example.com/image1.jpg',
        123,
        'https://example.com/image2.jpg',
      ]

      expect(() => validateFileUrls(urls)).toThrow(
        'All file URLs must be strings'
      )
    })

    it('should accept exactly 30 files', () => {
      const urls = Array.from(
        { length: 30 },
        (_, i) => `https://example.com/image${i}.jpg`
      )

      expect(() => validateFileUrls(urls)).not.toThrow()
    })

    it('should accept exactly 1 file', () => {
      const urls = ['https://example.com/image.jpg']

      expect(() => validateFileUrls(urls)).not.toThrow()
    })

    it('should reject malformed URLs', () => {
      const urls = ['not a url at all']

      expect(() => validateFileUrls(urls)).toThrow('Malformed URL')
    })

    it('should reject data: URIs', () => {
      const urls = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ]

      expect(() => validateFileUrls(urls)).toThrow(
        'Data and file URIs are not allowed'
      )
    })

    it('should reject file:// URIs', () => {
      const urls = ['file:///etc/passwd']

      expect(() => validateFileUrls(urls)).toThrow(
        'Data and file URIs are not allowed'
      )
    })
  })

  describe('validatePrompt', () => {
    it('should accept valid non-empty prompt', () => {
      const prompt = 'Convert these photos to have a vintage look'

      expect(() => validatePrompt(prompt)).not.toThrow()
    })

    it('should reject empty string prompt', () => {
      const prompt = ''

      expect(() => validatePrompt(prompt)).toThrow('Prompt cannot be empty')
    })

    it('should reject whitespace-only prompt', () => {
      const prompt = '   '

      expect(() => validatePrompt(prompt)).toThrow('Prompt cannot be empty')
    })

    it('should reject missing prompt', () => {
      expect(() => validatePrompt(undefined)).toThrow('Prompt must be a string')
      expect(() => validatePrompt(null)).toThrow('Prompt must be a string')
    })

    it('should reject non-string prompt', () => {
      expect(() => validatePrompt(123)).toThrow('Prompt must be a string')
      expect(() => validatePrompt({})).toThrow('Prompt must be a string')
      expect(() => validatePrompt([])).toThrow('Prompt must be a string')
    })

    it('should accept prompt with special characters', () => {
      const prompt = 'Add "vintage" effect with 50% opacity & sepia tone!'

      expect(() => validatePrompt(prompt)).not.toThrow()
    })

    it('should accept very long prompts', () => {
      const prompt = 'a'.repeat(10000)

      expect(() => validatePrompt(prompt)).not.toThrow()
    })
  })

  describe('validateGroupName', () => {
    it('should accept valid group name', () => {
      const name = 'Summer Vacation 2024'

      expect(() => validateGroupName(name)).not.toThrow()
    })

    it('should accept empty group name', () => {
      const name = ''

      expect(() => validateGroupName(name)).not.toThrow()
    })

    it('should reject group name longer than 140 characters', () => {
      const name = 'a'.repeat(141)

      expect(() => validateGroupName(name)).toThrow(
        'Group name must be 140 characters or less'
      )
    })

    it('should accept group name with exactly 140 characters', () => {
      const name = 'a'.repeat(140)

      expect(() => validateGroupName(name)).not.toThrow()
    })

    it('should reject non-string group name', () => {
      expect(() => validateGroupName(123)).toThrow(
        'Group name must be a string'
      )
      expect(() => validateGroupName(null)).toThrow(
        'Group name must be a string'
      )
    })

    it('should accept group name with emojis', () => {
      const name = '🌅 Summer Vacation 2024 🏖️'

      expect(() => validateGroupName(name)).not.toThrow()
    })

    it('should accept group name with special characters', () => {
      const name = 'Client: Smith & Co. - Project #42 (Final)'

      expect(() => validateGroupName(name)).not.toThrow()
    })
  })

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+filter@domain.com',
        'user123@test-domain.org',
      ]

      validEmails.forEach(email => {
        expect(() => validateEmail(email)).not.toThrow()
      })
    })

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
        'user..name@example.com',
      ]

      invalidEmails.forEach(email => {
        expect(() => validateEmail(email)).toThrow('Invalid email format')
      })
    })

    it('should reject empty email', () => {
      expect(() => validateEmail('')).toThrow(
        'Email is required and must be a string'
      )
    })

    it('should reject missing email', () => {
      expect(() => validateEmail(undefined)).toThrow(
        'Email is required and must be a string'
      )
      expect(() => validateEmail(null)).toThrow(
        'Email is required and must be a string'
      )
    })

    it('should reject non-string email', () => {
      expect(() => validateEmail(123)).toThrow(
        'Email is required and must be a string'
      )
      expect(() => validateEmail({})).toThrow(
        'Email is required and must be a string'
      )
    })

    it('should accept email with subdomain', () => {
      const email = 'user@mail.example.com'

      expect(() => validateEmail(email)).not.toThrow()
    })

    it('should reject email with consecutive dots', () => {
      expect(() => validateEmail('user..name@example.com')).toThrow(
        'Invalid email format'
      )
    })

    it('should reject email starting or ending with @', () => {
      expect(() => validateEmail('@example.com')).toThrow(
        'Invalid email format'
      )
      expect(() => validateEmail('user@')).toThrow('Invalid email format')
    })
  })
})
