import { http, HttpResponse } from 'msw'

/**
 * Mock Service Worker (MSW) handlers for external API calls
 * These handlers intercept HTTP requests during tests and return mock responses
 */

export const handlers = [
  // ============================================
  // Google Gemini API Mocks
  // ============================================

  /**
   * Mock Gemini File Upload API - Start resumable upload
   */
  http.post(
    'https://generativelanguage.googleapis.com/upload/v1beta/files',
    () => {
      return new HttpResponse(
        JSON.stringify({
          file: {
            name: 'files/test-upload-123',
            displayName: 'upload-1',
            mimeType: 'image/jpeg',
            sizeBytes: '1024',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-upload-123',
          },
        }),
        {
          status: 200,
          headers: {
            'x-goog-upload-url':
              'https://generativelanguage.googleapis.com/upload/v1beta/files/test-upload-123',
          },
        }
      )
    }
  ),

  /**
   * Mock Gemini File Upload API - Finalize upload
   */
  http.post(
    'https://generativelanguage.googleapis.com/upload/v1beta/files/*',
    () => {
      return HttpResponse.json({
        file: {
          name: 'files/test-upload-123',
          displayName: 'upload-1',
          mimeType: 'image/jpeg',
          sizeBytes: '1024',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-upload-123',
        },
      })
    }
  ),

  /**
   * Mock successful Gemini generateContent API response with image data
   */
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/:model/generateContent',
    () => {
      // Return a mock enhanced image as base64
      const mockEnhancedImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      ).toString('base64')

      return HttpResponse.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: mockEnhancedImage,
                  },
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      })
    }
  ),

  /**
   * Mock Gemini API error (for error handling tests)
   */
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/*/error',
    () => {
      return HttpResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid request',
            status: 'INVALID_ARGUMENT',
          },
        },
        { status: 400 }
      )
    }
  ),

  // ============================================
  // Stripe API Mocks
  // ============================================

  /**
   * Mock Stripe checkout session creation
   */
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_mock_session_id',
      object: 'checkout.session',
      url: 'https://checkout.stripe.com/pay/cs_test_mock_session_id',
      customer_email: 'test@example.com',
      mode: 'payment',
      status: 'open',
    })
  }),

  /**
   * Mock Stripe price retrieval
   */
  http.get('https://api.stripe.com/v1/prices/:priceId', ({ params }) => {
    const { priceId } = params
    return HttpResponse.json({
      id: priceId,
      object: 'price',
      active: true,
      currency: 'usd',
      metadata: {
        app: 'stageinseconds',
        credits_per_unit: '20',
        type: 'pack',
      },
      unit_amount: 1000,
      lookup_key: 'pack_20',
    })
  }),

  /**
   * Mock Stripe prices list
   */
  http.get('https://api.stripe.com/v1/prices', () => {
    return HttpResponse.json({
      object: 'list',
      data: [
        {
          id: 'price_payg',
          object: 'price',
          active: true,
          currency: 'usd',
          lookup_key: 'payg',
          metadata: {
            app: 'stageinseconds',
            credits_per_unit: '1',
            type: 'payg',
          },
          unit_amount: 100,
        },
        {
          id: 'price_pack_20',
          object: 'price',
          active: true,
          currency: 'usd',
          lookup_key: 'pack_20',
          metadata: {
            app: 'stageinseconds',
            credits_per_unit: '20',
            type: 'pack',
          },
          unit_amount: 1000,
        },
        {
          id: 'price_pack_50',
          object: 'price',
          active: true,
          currency: 'usd',
          lookup_key: 'pack_50',
          metadata: {
            app: 'stageinseconds',
            credits_per_unit: '50',
            type: 'pack',
          },
          unit_amount: 2000,
        },
        {
          id: 'price_pack_100',
          object: 'price',
          active: true,
          currency: 'usd',
          lookup_key: 'pack_100',
          metadata: {
            app: 'stageinseconds',
            credits_per_unit: '100',
            type: 'pack',
          },
          unit_amount: 3500,
        },
      ],
      has_more: false,
    })
  }),

  // ============================================
  // File Upload/Download Mocks
  // ============================================

  /**
   * Mock successful image file download (valid HTTPS URL)
   */
  http.get('https://example.com/test-image.jpg', () => {
    // Create a mock image buffer (1x1 pixel PNG)
    const mockImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    return new HttpResponse(mockImageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': mockImageBuffer.length.toString(),
      },
    })
  }),

  /**
   * Mock large file download (> 15MB) for size limit testing
   */
  http.get('https://example.com/large-image.jpg', () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': (16 * 1024 * 1024).toString(), // 16MB
      },
    })
  }),

  /**
   * Mock invalid content type (non-image)
   */
  http.get('https://example.com/not-an-image.txt', () => {
    return new HttpResponse('This is not an image', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }),

  /**
   * Mock file upload service (createanything.com upload API)
   */
  http.post('https://api.createanything.com/v0/upload', () => {
    return HttpResponse.json({
      url:
        'https://cdn.createanything.com/files/mock-upload-' +
        Date.now() +
        '.zip',
      mimeType: 'application/zip',
    })
  }),

  // ============================================
  // SSRF Protection Test Mocks
  // ============================================

  /**
   * Mock localhost request (should be blocked by app)
   */
  http.get('http://localhost/*', () => {
    return HttpResponse.json(
      { error: 'Localhost not allowed' },
      { status: 403 }
    )
  }),

  /**
   * Mock 127.0.0.1 request (should be blocked by app)
   */
  http.get('http://127.0.0.1/*', () => {
    return HttpResponse.json(
      { error: 'Localhost not allowed' },
      { status: 403 }
    )
  }),

  /**
   * Mock private IP request (should be blocked by app)
   */
  http.get('http://192.168.1.1/*', () => {
    return HttpResponse.json(
      { error: 'Private IP not allowed' },
      { status: 403 }
    )
  }),
]
