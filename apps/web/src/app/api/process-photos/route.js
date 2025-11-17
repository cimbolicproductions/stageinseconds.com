import sql from '@/app/api/utils/sql'
import upload from '@/app/api/utils/upload' // NEW: use platform uploader to store generated files (zip)
import { auth } from '@/auth' // Enforce sign-in and track credits
import { ProcessPhotosSchema } from '@/schemas/api'
import { logError, logEvent } from '@/app/api/utils/logger.js'

export async function POST(request) {
  let session
  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validation = ProcessPhotosSchema.safeParse(body)
    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { fileUrls, prompt, groupName } = validation.data
    const fileCount = fileUrls.length

    // Enforce authentication (trial requires sign-in)
    session = await auth()
    const userId = session?.user?.id || null
    if (!userId) {
      return Response.json(
        { error: 'Please sign in to use the free trial and process photos.' },
        { status: 401 }
      )
    }

    // Calculate cost ($1 per photo)
    const cost = fileCount * 1.0

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    if (!GOOGLE_API_KEY) {
      return Response.json(
        { error: 'Missing GOOGLE_API_KEY environment variable' },
        { status: 400 }
      )
    }

    // Allow running without a database configured
    const hasDB = Boolean(process.env.DATABASE_URL)

    // Credits check: 3 free photos total per user, then consume purchased credits
    const FREE_LIMIT = 3
    let freeUsed = 0
    let credits = 0
    if (hasDB) {
      const rows =
        await sql`SELECT free_used, credits FROM user_credits WHERE user_id = ${userId}`
      if (rows.length === 0) {
        await sql`INSERT INTO user_credits (user_id, free_used, credits) VALUES (${userId}, 0, 0)`
      } else {
        freeUsed = rows[0].free_used || 0
        credits = rows[0].credits || 0
      }
    }

    const freeRemaining = Math.max(0, FREE_LIMIT - freeUsed)
    const willBeFree = Math.min(fileCount, freeRemaining)
    const needsPaid = fileCount - willBeFree

    if (hasDB && needsPaid > credits) {
      return Response.json(
        {
          error: 'Not enough credits',
          details: `You need ${needsPaid} credits but only have ${credits}. Purchase a pack or use pay-as-you-go.`,
          needed: needsPaid,
          credits,
        },
        { status: 402 }
      )
    }

    let job = null
    if (hasDB) {
      // ADD: persist user_id with the job so dashboard can filter by user
      const jobResult = await sql`
        INSERT INTO photo_jobs (user_id, prompt, photo_count, cost, status, group_name)
        VALUES (${userId}, ${prompt?.trim() || ''}, ${fileCount}, ${cost}, 'processing', ${groupName || null})
        RETURNING id, prompt, photo_count, cost, status, created_at, group_name
      `
      job = jobResult[0]
    }

    try {
      // 1) Call Gemini to enhance each image using the provided prompt
      const enhancedFiles = await generateEnhancedImagesWithGemini({
        fileUrls,
        prompt,
        apiKey: GOOGLE_API_KEY,
      })

      if (enhancedFiles.length === 0) {
        throw new Error('No images returned from Gemini')
      }

      // NEW: Upload up to two preview images for instant gratification on results page
      const previewCandidates = enhancedFiles.slice(
        0,
        Math.min(2, enhancedFiles.length)
      )
      const previewUrls = []
      for (const pf of previewCandidates) {
        try {
          const { url: purl } = await upload({ buffer: pf.buffer })
          if (purl) previewUrls.push(purl)
        } catch (e) {
          // Non-fatal: continue without this preview
          console.error('Preview upload failed:', e)
        }
      }

      // 2) Package all generated images into a ZIP buffer (no compression, store)
      const zipBuffer = createZipFromFiles(enhancedFiles)

      // 3) Upload ZIP and get a public URL
      const { url: downloadUrl } = await upload({ buffer: zipBuffer })

      // 4) Update DB job (if present) and consume credits/trial
      if (hasDB) {
        // FIX: sql.transaction must receive an array of queries (or a function that RETURNS an array).
        // We avoid dependent reads inside the transaction by using arithmetic based on precomputed
        // willBeFree/needsPaid and clamping free_used with LEAST to the FREE_LIMIT.
        const queries = []
        if (job?.id) {
          queries.push(sql`
              UPDATE photo_jobs
              SET status = 'completed', download_url = ${downloadUrl}, updated_at = CURRENT_TIMESTAMP
              WHERE id = ${job.id}
            `)
        }
        queries.push(sql`
            UPDATE user_credits
            SET 
              free_used = LEAST(${FREE_LIMIT}, free_used + ${willBeFree}),
              credits   = GREATEST(0, credits - ${needsPaid}),
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${userId}
          `)
        await sql.transaction(queries)
      }

      logEvent('photo_processing_completed', request, {
        userId,
        jobId: job?.id,
        photoCount: fileCount,
        cost,
        freeUsed: willBeFree,
        creditsUsed: needsPaid,
      })

      return Response.json({
        success: true,
        job: job
          ? {
              id: job.id,
              prompt: job.prompt,
              photoCount: job.photo_count,
              cost: job.cost,
              status: 'completed',
              createdAt: job.created_at,
            }
          : {
              id: null,
              prompt: prompt.trim(),
              photoCount: fileCount,
              cost,
              status: 'completed',
              createdAt: new Date().toISOString(),
            },
        downloadUrl,
        previewUrls, // NEW: return preview image URLs for the results screen
        message: 'Photos processed successfully.',
        applied: { free: willBeFree, paid: needsPaid },
      })
    } catch (apiError) {
      logError(apiError, request, {
        apiRoute: 'process-photos',
        userId,
        jobId: job?.id,
        photoCount: fileCount,
        statusCode: 502,
        errorType: 'gemini_api_error',
      })

      if (hasDB && job?.id) {
        try {
          await sql`
            UPDATE photo_jobs
            SET status = 'failed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${job.id}
          `
        } catch (e) {
          logError(e, request, {
            apiRoute: 'process-photos',
            userId,
            jobId: job?.id,
            errorType: 'job_status_update_failed',
          })
        }
      }

      const message =
        apiError instanceof Error ? apiError.message : String(apiError)
      return Response.json(
        {
          error: 'Failed to process images with Google Gemini',
          details: message,
        },
        { status: 502 }
      )
    }
  } catch (error) {
    logError(error, request, {
      apiRoute: 'process-photos',
      userId: session?.user?.id,
      statusCode: 500,
    })
    return Response.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// --- Helpers ---

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// SECURITY: SSRF protection now handled by centralized validators in @/utils/validators

// Calls Google Gemini 2.5 Flash Image Preview to create enhanced images
async function generateEnhancedImagesWithGemini({ fileUrls, prompt, apiKey }) {
  // Import validators locally for use in this function
  const { validateFileUrls } = await import('@/utils/validators.ts')
  const modelPrimary = 'gemini-2.5-flash-image-preview'
  const modelFallback = 'gemini-2.5-flash'
  const results = []

  for (let i = 0; i < fileUrls.length; i++) {
    const srcUrl = fileUrls[i]

    // SECURITY: validate again inside the generator for defense in depth
    try {
      validateFileUrls([srcUrl])
    } catch (error) {
      throw new Error(`Blocked source URL [${i + 1}]: ${error.message}`)
    }

    const imgResp = await fetch(srcUrl)
    if (!imgResp.ok) {
      throw new Error(
        `Failed to fetch uploaded image [${i}]: ${imgResp.status} ${imgResp.statusText}`
      )
    }
    const contentTypeHeader = (
      imgResp.headers.get('content-type') || ''
    ).toLowerCase()

    // SECURITY: ensure the fetched content is an image
    if (!contentTypeHeader.startsWith('image/')) {
      throw new Error(
        `Uploaded file is not an image [${i + 1}]: content-type=${contentTypeHeader}`
      )
    }

    // SECURITY: optionally enforce a max size (15MB) if server returns the header
    const contentLength = Number(imgResp.headers.get('content-length') || 0)
    if (contentLength && contentLength > 15 * 1024 * 1024) {
      throw new Error(
        `Uploaded file too large [${i + 1}]: ${(contentLength / (1024 * 1024)).toFixed(1)} MB`
      )
    }

    const arrayBuf = await imgResp.arrayBuffer()
    const bytes = Buffer.from(arrayBuf)

    // If content-length header missing, still enforce size on the bytes read
    if (bytes.length > 15 * 1024 * 1024) {
      throw new Error(
        `Uploaded file too large after download [${i + 1}]: ${(bytes.length / (1024 * 1024)).toFixed(1)} MB`
      )
    }

    const inputB64 = bytes.toString('base64')

    let mimeType = 'image/jpeg'
    if (contentTypeHeader.includes('image/png')) mimeType = 'image/png'
    else if (contentTypeHeader.includes('image/webp')) mimeType = 'image/webp'
    else if (contentTypeHeader.includes('image/heic')) mimeType = 'image/heic'
    else if (contentTypeHeader.includes('image/heif')) mimeType = 'image/heif'
    else if (
      contentTypeHeader.includes('image/jpeg') ||
      contentTypeHeader.includes('image/jpg')
    )
      mimeType = 'image/jpeg'

    const displayName = `upload-${i + 1}`
    const startRes = await fetch(
      'https://generativelanguage.googleapis.com/upload/v1beta/files',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(bytes.length),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      }
    )

    if (!startRes.ok) {
      const msg = await safeReadText(startRes)
      throw new Error(`Gemini Files start error [${startRes.status}]: ${msg}`)
    }

    const uploadUrl = startRes.headers.get('x-goog-upload-url')
    if (!uploadUrl) {
      throw new Error('Gemini Files API did not return an upload URL')
    }

    const finalizeRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Length': String(bytes.length),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: bytes,
    })

    if (!finalizeRes.ok) {
      const msg = await safeReadText(finalizeRes)
      throw new Error(
        `Gemini Files upload error [${finalizeRes.status}]: ${msg}`
      )
    }

    const fileInfo = await finalizeRes.json()
    const fileUri = fileInfo?.file?.uri || fileInfo?.file?.name
    const fileMime = fileInfo?.file?.mimeType || mimeType
    if (!fileUri) {
      throw new Error('Gemini Files API response missing file uri/name')
    }

    const genOnce = async ({ useFile, model }) => {
      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Enhance this real estate listing photo. ${prompt}. Preserve the original room layout and architecture. Return only enhanced image data and no text.`,
              },
              useFile
                ? { fileData: { mimeType: fileMime, fileUri: fileUri } }
                : { inlineData: { mimeType: fileMime, data: inputB64 } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      }

      let last = { ok: false, status: 0, msg: '' }
      for (let attempt = 0; attempt < 3; attempt++) {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
          }
        )

        if (resp.ok) {
          const data = await resp.json()
          return { ok: true, data }
        }
        const msg = await safeReadText(resp)
        last = { ok: false, status: resp.status, msg }
        if (resp.status !== 429 && resp.status !== 500) break
        await sleep(300 * Math.pow(2, attempt))
      }
      return last
    }

    const attempts = [
      { useFile: false, model: modelPrimary },
      { useFile: true, model: modelPrimary },
      { useFile: false, model: modelFallback },
      { useFile: true, model: modelFallback },
    ]

    let lastErr = null
    let data = null
    for (const a of attempts) {
      const r = await genOnce(a)
      if (r.ok) {
        data = r.data
        lastErr = null
        break
      }
      lastErr = `Gemini API error [${r.status}]: ${r.msg}`
      if (r.status !== 404 && r.status !== 429 && r.status !== 500) {
        break
      }
    }

    if (!data) {
      throw new Error(lastErr || 'Gemini generation failed')
    }

    const parts =
      (data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts) ||
      []

    const imageParts = parts.filter(
      p =>
        (p.inlineData && p.inlineData.data) ||
        (p.inline_data && p.inline_data.data)
    )

    if (imageParts.length === 0) {
      const maybeText = parts
        .map(p => p.text)
        .filter(Boolean)
        .join('\n')
      throw new Error(
        `Gemini returned no image data for input ${i}. ${maybeText ? `Notes: ${maybeText}` : ''}`
      )
    }

    for (let j = 0; j < imageParts.length; j++) {
      const part = imageParts[j]
      const outB64 = part.inlineData?.data || part.inline_data?.data
      const outMime =
        part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png'
      const buffer = Buffer.from(outB64, 'base64')
      const ext = guessExtensionFromInlineMime(outMime)
      const filename = `enhanced-${i + 1}${imageParts.length > 1 ? `-${j + 1}` : ''}.${ext}`
      results.push({ filename, buffer })
    }
  }

  return results
}

function guessExtensionFromInlineMime(mime) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  return 'jpg'
}

async function safeReadText(resp) {
  try {
    return await resp.text()
  } catch {
    return ''
  }
}

// Build a minimal ZIP (store method) from an array of { filename, buffer }
function createZipFromFiles(files) {
  const encoder = new TextEncoder()

  const localFileHeaders = []
  const centralDirectory = []
  let offset = 0
  const fileDataSegments = []

  for (const { filename, buffer } of files) {
    const nameBytes = encoder.encode(filename)
    const crc = crc32(buffer)
    const size = buffer.length >>> 0

    const dos = dosDateTime(new Date())
    const modTime = dos.time
    const modDate = dos.date

    // Local file header
    const lf = new Uint8Array(30 + nameBytes.length)
    const dv = new DataView(lf.buffer)

    writeUint32LE(dv, 0, 0x04034b50) // local file header signature
    writeUint16LE(dv, 4, 20) // version needed to extract
    writeUint16LE(dv, 6, 0) // general purpose bit flag
    writeUint16LE(dv, 8, 0) // compression (0 = store)
    writeUint16LE(dv, 10, modTime)
    writeUint16LE(dv, 12, modDate)
    writeUint32LE(dv, 14, crc >>> 0)
    writeUint32LE(dv, 18, size)
    writeUint32LE(dv, 22, size)
    writeUint16LE(dv, 26, nameBytes.length)
    writeUint16LE(dv, 28, 0) // extra length
    lf.set(nameBytes, 30)

    localFileHeaders.push(lf)
    fileDataSegments.push(new Uint8Array(buffer))

    // Central directory header
    const cd = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(cd.buffer)
    writeUint32LE(cdv, 0, 0x02014b50) // central dir signature
    writeUint16LE(cdv, 4, 20) // version made by
    writeUint16LE(cdv, 6, 20) // version needed
    writeUint16LE(cdv, 8, 0) // flags
    writeUint16LE(cdv, 10, 0) // compression
    writeUint16LE(cdv, 12, modTime)
    writeUint16LE(cdv, 14, modDate)
    writeUint32LE(cdv, 16, crc >>> 0)
    writeUint32LE(cdv, 20, size)
    writeUint32LE(cdv, 24, size)
    writeUint16LE(cdv, 28, nameBytes.length)
    writeUint16LE(cdv, 30, 0) // extra len
    writeUint16LE(cdv, 32, 0) // comment len
    writeUint16LE(cdv, 34, 0) // disk number start
    writeUint16LE(cdv, 36, 0) // internal attrs
    writeUint32LE(cdv, 38, 0) // external attrs
    writeUint32LE(cdv, 42, offset) // relative offset of local header
    cd.set(nameBytes, 46)

    centralDirectory.push(cd)

    // Update offset by size of local header + file name + data
    offset += lf.length + size
  }

  // Concatenate local file headers + data
  const localAndData = concatUint8(localFileHeaders.concat(fileDataSegments))

  // Concatenate central directory
  const central = concatUint8(centralDirectory)

  // End of central directory
  const end = new Uint8Array(22)
  const endv = new DataView(end.buffer)
  writeUint32LE(endv, 0, 0x06054b50)
  writeUint16LE(endv, 4, 0) // number of this disk
  writeUint16LE(endv, 6, 0) // disk with start of central directory
  writeUint16LE(endv, 8, files.length)
  writeUint16LE(endv, 10, files.length)
  writeUint32LE(endv, 12, central.length)
  writeUint32LE(endv, 16, localAndData.length)
  writeUint16LE(endv, 20, 0) // comment length

  // Final ZIP buffer
  const zip = concatUint8([localAndData, central, end])
  return Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength)
}

function concatUint8(chunks) {
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function writeUint16LE(dv, offset, value) {
  dv.setUint16(offset, value & 0xffff, true)
}
function writeUint32LE(dv, offset, value) {
  dv.setUint32(offset, value >>> 0, true)
}

function dosDateTime(date) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = Math.floor(date.getUTCSeconds() / 2)
  const dosTime = (hours << 11) | (minutes << 5) | seconds
  const dosDate = ((year - 1980) << 9) | (month << 5) | day
  return { time: dosTime & 0xffff, date: dosDate & 0xffff }
}

// CRC32 implementation (IEEE 802.3)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}
