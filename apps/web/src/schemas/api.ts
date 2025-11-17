import { z } from 'zod'

/**
 * Validation schemas for API endpoints
 * Using Zod for type-safe request validation
 */

/**
 * Helper: Validates HTTPS URLs and prevents SSRF attacks
 */
const httpsUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(url => url.startsWith('https://'), {
    message: 'Only HTTPS URLs are allowed',
  })
  .refine(
    url => {
      try {
        const urlObj = new URL(url)
        const host = urlObj.hostname.toLowerCase()

        // Block localhost and loopback
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '0.0.0.0' ||
          host === '::1'
        ) {
          return false
        }

        // Block AWS metadata endpoint
        if (host === '169.254.169.254') {
          return false
        }

        // Block private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
        const match = host.match(ipv4Regex)
        if (match) {
          const [, a, b] = match.map(Number)
          if (
            a === 10 ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168)
          ) {
            return false
          }
        }

        return true
      } catch {
        return false
      }
    },
    { message: 'URL must not point to internal/private resources' }
  )

/**
 * Process Photos Endpoint Schema
 * POST /api/process-photos
 */
export const ProcessPhotosSchema = z.object({
  fileUrls: z
    .array(httpsUrlSchema)
    .min(1, 'At least one file URL is required')
    .max(30, 'Maximum 30 files allowed'),
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(500, 'Prompt must be 500 characters or less')
    .optional(),
  groupName: z
    .string()
    .max(140, 'Group name must be 140 characters or less')
    .optional(),
})

export type ProcessPhotosInput = z.infer<typeof ProcessPhotosSchema>

/**
 * Update Job Endpoint Schema
 * PATCH /api/jobs/:id
 */
export const UpdateJobSchema = z.object({
  groupName: z
    .string()
    .max(140, 'Group name must be 140 characters or less')
    .optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
})

export type UpdateJobInput = z.infer<typeof UpdateJobSchema>

/**
 * Create Checkout Session Schema
 * POST /api/billing/create-checkout
 */
export const CreateCheckoutSchema = z.object({
  lookupKey: z.string().min(1, 'Lookup key is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .min(1, 'Minimum 1')
    .max(500, 'Maximum 500 per purchase')
    .optional()
    .default(1),
  redirectURL: z.string().optional(),
})

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>

/**
 * Sign Up Schema
 * POST /api/auth/signup
 */
export const SignUpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform(email => email.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
})

export type SignUpInput = z.infer<typeof SignUpSchema>

/**
 * Sign In Schema
 * POST /api/auth/signin
 */
export const SignInSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform(email => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be 128 characters or less'),
})

export type SignInInput = z.infer<typeof SignInSchema>

/**
 * Send Verification Email Schema
 * POST /api/auth/send-verification
 */
export const SendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform(email => email.toLowerCase().trim()),
})

export type SendVerificationInput = z.infer<typeof SendVerificationSchema>
