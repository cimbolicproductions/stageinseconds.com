import { describe, it, expect } from 'vitest'
import {
  ProcessPhotosSchema,
  UpdateJobSchema,
  CreateCheckoutSchema,
  SignUpSchema,
  SignInSchema,
  SendVerificationSchema,
} from '../../src/schemas/api'

describe('API Validation Schemas', () => {
  describe('ProcessPhotosSchema', () => {
    it('should validate valid input', () => {
      const input = {
        fileUrls: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
        ],
        prompt: 'Enhance the lighting',
        groupName: 'Vacation Photos',
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileUrls).toHaveLength(2)
        expect(result.data.prompt).toBe('Enhance the lighting')
        expect(result.data.groupName).toBe('Vacation Photos')
      }
    })

    it('should validate without optional fields', () => {
      const input = {
        fileUrls: ['https://example.com/photo1.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject non-HTTPS URLs', () => {
      const input = {
        fileUrls: ['http://example.com/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('HTTPS')
      }
    })

    it('should reject localhost URLs (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://localhost/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject 127.0.0.1 URLs (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://127.0.0.1/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject AWS metadata endpoint (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://169.254.169.254/latest/meta-data/'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject private IP ranges 10.x.x.x (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://10.0.0.1/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject private IP ranges 192.168.x.x (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://192.168.1.1/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject private IP ranges 172.16-31.x.x (SSRF protection)', () => {
      const input = {
        fileUrls: ['https://172.16.0.1/photo.jpg'],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('internal/private')
      }
    })

    it('should reject empty fileUrls array', () => {
      const input = {
        fileUrls: [],
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one')
      }
    })

    it('should reject more than 30 files', () => {
      const input = {
        fileUrls: Array(31).fill('https://example.com/photo.jpg'),
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 30')
      }
    })

    it('should reject prompt longer than 500 characters', () => {
      const input = {
        fileUrls: ['https://example.com/photo.jpg'],
        prompt: 'x'.repeat(501),
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500')
      }
    })

    it('should reject groupName longer than 140 characters', () => {
      const input = {
        fileUrls: ['https://example.com/photo.jpg'],
        groupName: 'x'.repeat(141),
      }
      const result = ProcessPhotosSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('140')
      }
    })
  })

  describe('UpdateJobSchema', () => {
    it('should validate valid input', () => {
      const input = {
        groupName: 'Updated Group',
        status: 'completed' as const,
      }
      const result = UpdateJobSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate with only groupName', () => {
      const input = {
        groupName: 'New Group',
      }
      const result = UpdateJobSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate with only status', () => {
      const input = {
        status: 'processing',
      }
      const result = UpdateJobSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const input = {
        status: 'invalid-status',
      }
      const result = UpdateJobSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject groupName longer than 140 characters', () => {
      const input = {
        groupName: 'x'.repeat(141),
      }
      const result = UpdateJobSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateCheckoutSchema', () => {
    it('should validate valid input', () => {
      const input = {
        lookupKey: 'credits_100',
        quantity: 5,
        redirectURL: '/success',
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should use default quantity of 1', () => {
      const input = {
        lookupKey: 'credits_100',
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(1)
      }
    })

    it('should reject missing lookupKey', () => {
      const input = {
        quantity: 5,
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject quantity less than 1', () => {
      const input = {
        lookupKey: 'credits_100',
        quantity: 0,
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject quantity greater than 500', () => {
      const input = {
        lookupKey: 'credits_100',
        quantity: 501,
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer quantity', () => {
      const input = {
        lookupKey: 'credits_100',
        quantity: 5.5,
      }
      const result = CreateCheckoutSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('SignUpSchema', () => {
    it('should validate valid input', () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123',
        name: 'John Doe',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should transform email to lowercase', () => {
      const input = {
        email: 'USER@EXAMPLE.COM',
        password: 'Password123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject email with whitespace (invalid format)', () => {
      const input = {
        email: '  user@example.com  ',
        password: 'Password123',
      }
      const result = SignUpSchema.safeParse(input)
      // Email with leading/trailing whitespace is invalid
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const input = {
        email: 'not-an-email',
        password: 'Password123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email')
      }
    })

    it('should reject password shorter than 8 characters', () => {
      const input = {
        email: 'user@example.com',
        password: 'Pass1',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8')
      }
    })

    it('should reject password without uppercase letter', () => {
      const input = {
        email: 'user@example.com',
        password: 'password123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase')
      }
    })

    it('should reject password without lowercase letter', () => {
      const input = {
        email: 'user@example.com',
        password: 'PASSWORD123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase')
      }
    })

    it('should reject password without number', () => {
      const input = {
        email: 'user@example.com',
        password: 'PasswordABC',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number')
      }
    })

    it('should reject password longer than 128 characters', () => {
      const input = {
        email: 'user@example.com',
        password: 'Password1' + 'x'.repeat(120),
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject email longer than 255 characters', () => {
      const input = {
        email: 'x'.repeat(250) + '@example.com',
        password: 'Password123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject name longer than 100 characters', () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123',
        name: 'x'.repeat(101),
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should validate without optional name', () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123',
      }
      const result = SignUpSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('SignInSchema', () => {
    it('should validate valid input', () => {
      const input = {
        email: 'user@example.com',
        password: 'mypassword',
      }
      const result = SignInSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should transform email to lowercase', () => {
      const input = {
        email: 'USER@EXAMPLE.COM',
        password: 'mypassword',
      }
      const result = SignInSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject email with whitespace (invalid format)', () => {
      const input = {
        email: '  user@example.com  ',
        password: 'mypassword',
      }
      const result = SignInSchema.safeParse(input)
      // Email with leading/trailing whitespace is invalid
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const input = {
        email: 'not-an-email',
        password: 'mypassword',
      }
      const result = SignInSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const input = {
        email: 'user@example.com',
        password: '',
      }
      const result = SignInSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject password longer than 128 characters', () => {
      const input = {
        email: 'user@example.com',
        password: 'x'.repeat(129),
      }
      const result = SignInSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('SendVerificationSchema', () => {
    it('should validate valid input', () => {
      const input = {
        email: 'user@example.com',
      }
      const result = SendVerificationSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should transform email to lowercase', () => {
      const input = {
        email: 'USER@EXAMPLE.COM',
      }
      const result = SendVerificationSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject email with whitespace (invalid format)', () => {
      const input = {
        email: '  user@example.com  ',
      }
      const result = SendVerificationSchema.safeParse(input)
      // Email with leading/trailing whitespace is invalid
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const input = {
        email: 'not-an-email',
      }
      const result = SendVerificationSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject email longer than 255 characters', () => {
      const input = {
        email: 'x'.repeat(250) + '@example.com',
      }
      const result = SendVerificationSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})
