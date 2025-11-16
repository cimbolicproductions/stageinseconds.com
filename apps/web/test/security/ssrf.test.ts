import { describe, it, expect } from 'vitest'
import { isSafeUrl, isPrivateIP } from '@/utils/validators'

describe('SSRF Protection', () => {
  describe('isSafeUrl', () => {
    describe('Protocol Validation', () => {
      it('should allow HTTPS URLs', () => {
        const result = isSafeUrl('https://example.com/image.jpg')

        expect(result.ok).toBe(true)
      })

      it('should block HTTP URLs (only HTTPS allowed)', () => {
        const result = isSafeUrl('http://example.com/image.jpg')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe('Only HTTPS URLs are allowed')
      })

      it('should block data: URIs', () => {
        const result = isSafeUrl('data:text/plain;base64,SGVsbG8gV29ybGQ=')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe('Data and file URIs are not allowed')
      })

      it('should block file:// URIs', () => {
        const result = isSafeUrl('file:///etc/passwd')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe('Data and file URIs are not allowed')
      })

      it('should block ftp:// URLs', () => {
        const result = isSafeUrl('ftp://example.com/file.txt')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe('Only HTTPS URLs are allowed')
      })
    })

    describe('Localhost Blocking', () => {
      it('should block localhost hostname', () => {
        const result = isSafeUrl('https://localhost/image.jpg')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe(
          'Local and private IP addresses are not allowed'
        )
      })

      it('should block 127.0.0.1 (IPv4 loopback)', () => {
        const result = isSafeUrl('https://127.0.0.1/image.jpg')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe(
          'Local and private IP addresses are not allowed'
        )
      })

      it('should block 0.0.0.0', () => {
        const result = isSafeUrl('https://0.0.0.0/image.jpg')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe(
          'Local and private IP addresses are not allowed'
        )
      })

      it('should block ::1 (IPv6 loopback)', () => {
        const result = isSafeUrl('https://[::1]/image.jpg')

        expect(result.ok).toBe(false)
        expect(result.reason).toBe(
          'Local and private IP addresses are not allowed'
        )
      })

      it('should block LOCALHOST in different cases', () => {
        const testCases = [
          'https://LOCALHOST/image.jpg',
          'https://LocalHost/image.jpg',
          'https://localhost/image.jpg',
        ]

        testCases.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe(
            'Local and private IP addresses are not allowed'
          )
        })
      })
    })

    describe('Private IP Blocking', () => {
      it('should block 10.x.x.x range (10.0.0.0/8)', () => {
        const testIPs = [
          'https://10.0.0.1/image.jpg',
          'https://10.1.1.1/image.jpg',
          'https://10.255.255.255/image.jpg',
        ]

        testIPs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe(
            'Local and private IP addresses are not allowed'
          )
        })
      })

      it('should block 192.168.x.x range (192.168.0.0/16)', () => {
        const testIPs = [
          'https://192.168.0.1/image.jpg',
          'https://192.168.1.1/image.jpg',
          'https://192.168.255.255/image.jpg',
        ]

        testIPs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe(
            'Local and private IP addresses are not allowed'
          )
        })
      })

      it('should block 172.16-31.x.x range (172.16.0.0 - 172.31.255.255)', () => {
        const testIPs = [
          'https://172.16.0.1/image.jpg',
          'https://172.20.0.1/image.jpg',
          'https://172.31.255.255/image.jpg',
        ]

        testIPs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe(
            'Local and private IP addresses are not allowed'
          )
        })
      })

      it('should block link-local addresses (169.254.x.x)', () => {
        const testIPs = [
          'https://169.254.0.1/image.jpg',
          'https://169.254.169.254/image.jpg', // AWS metadata endpoint
        ]

        testIPs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe(
            'Local and private IP addresses are not allowed'
          )
        })
      })

      it('should NOT block public IPs that look similar to private ranges', () => {
        const testIPs = [
          'https://172.15.0.1/image.jpg', // Just before 172.16.x.x
          'https://172.32.0.1/image.jpg', // Just after 172.31.x.x
          'https://11.0.0.1/image.jpg', // Just after 10.x.x.x
          'https://192.167.1.1/image.jpg', // Just before 192.168.x.x
          'https://192.169.1.1/image.jpg', // Just after 192.168.x.x
        ]

        testIPs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(true)
        })
      })
    })

    describe('Valid URLs', () => {
      it('should allow valid public HTTPS URLs', () => {
        const validURLs = [
          'https://example.com/image.jpg',
          'https://cdn.example.com/photos/image.png',
          'https://storage.googleapis.com/bucket/file.jpg',
          'https://s3.amazonaws.com/bucket/image.jpg',
          'https://1.1.1.1/image.jpg', // Cloudflare DNS (public IP)
          'https://8.8.8.8/image.jpg', // Google DNS (public IP)
        ]

        validURLs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(true)
        })
      })

      it('should allow URLs with query parameters', () => {
        const result = isSafeUrl(
          'https://example.com/image.jpg?size=large&format=png'
        )

        expect(result.ok).toBe(true)
      })

      it('should allow URLs with fragments', () => {
        const result = isSafeUrl('https://example.com/image.jpg#section')

        expect(result.ok).toBe(true)
      })

      it('should allow URLs with ports', () => {
        const result = isSafeUrl('https://example.com:8443/image.jpg')

        expect(result.ok).toBe(true)
      })

      it('should allow URLs with authentication', () => {
        const result = isSafeUrl('https://user:pass@example.com/image.jpg')

        expect(result.ok).toBe(true)
      })

      it('should allow URLs with subdomains', () => {
        const result = isSafeUrl(
          'https://api.cdn.storage.example.com/image.jpg'
        )

        expect(result.ok).toBe(true)
      })
    })

    describe('Malformed URLs', () => {
      it('should reject malformed URLs', () => {
        const malformedURLs = ['not a url', '://example.com', '']

        malformedURLs.forEach(url => {
          const result = isSafeUrl(url)
          expect(result.ok).toBe(false)
          expect(result.reason).toBe('Malformed URL')
        })
      })

      it('should reject URLs with wrong protocols as non-HTTPS', () => {
        const result1 = isSafeUrl('htp://example.com')
        expect(result1.ok).toBe(false)
        expect(result1.reason).toBe('Only HTTPS URLs are allowed')
      })

      it('should reject incomplete URLs as malformed', () => {
        const result = isSafeUrl('https://')
        expect(result.ok).toBe(false)
        expect(result.reason).toBe('Malformed URL')
      })
    })
  })

  describe('isPrivateIP', () => {
    it('should identify localhost variants as private', () => {
      expect(isPrivateIP('localhost')).toBe(true)
      expect(isPrivateIP('LOCALHOST')).toBe(true)
      expect(isPrivateIP('LocalHost')).toBe(true)
      expect(isPrivateIP('127.0.0.1')).toBe(true)
      expect(isPrivateIP('0.0.0.0')).toBe(true)
      expect(isPrivateIP('::1')).toBe(true)
    })

    it('should identify 10.x.x.x as private', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true)
      expect(isPrivateIP('10.255.255.255')).toBe(true)
      expect(isPrivateIP('10.1.2.3')).toBe(true)
    })

    it('should identify 192.168.x.x as private', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true)
      expect(isPrivateIP('192.168.1.1')).toBe(true)
      expect(isPrivateIP('192.168.255.255')).toBe(true)
    })

    it('should identify 172.16-31.x.x as private', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true)
      expect(isPrivateIP('172.20.0.1')).toBe(true)
      expect(isPrivateIP('172.31.255.255')).toBe(true)
    })

    it('should identify 169.254.x.x as private (link-local)', () => {
      expect(isPrivateIP('169.254.0.1')).toBe(true)
      expect(isPrivateIP('169.254.169.254')).toBe(true)
    })

    it('should identify public IPs as non-private', () => {
      expect(isPrivateIP('1.1.1.1')).toBe(false)
      expect(isPrivateIP('8.8.8.8')).toBe(false)
      expect(isPrivateIP('172.15.0.1')).toBe(false)
      expect(isPrivateIP('172.32.0.1')).toBe(false)
      expect(isPrivateIP('11.0.0.1')).toBe(false)
      expect(isPrivateIP('192.167.1.1')).toBe(false)
      expect(isPrivateIP('192.169.1.1')).toBe(false)
    })

    it('should identify public domain names as non-private', () => {
      expect(isPrivateIP('example.com')).toBe(false)
      expect(isPrivateIP('google.com')).toBe(false)
      expect(isPrivateIP('api.example.com')).toBe(false)
    })
  })
})
