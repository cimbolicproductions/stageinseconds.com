import { useState, useEffect } from 'react'
import useUpload from '@/utils/useUpload'
import useUser from '@/utils/useUser'
import useBilling from '@/hooks/useBilling'

const DEFAULT_PROMPT =
  'make this into a professionally staged house for posting for sale as if taken by a dslr camera. make sure all structure stays the same'

export default function useUploadPage() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [upload] = useUpload()

  const [showNoCredits, setShowNoCredits] = useState(false)
  const [creditsNeeded, setCreditsNeeded] = useState(1)
  const [noCreditsMessage, setNoCreditsMessage] = useState('')

  // --- NEW: lightweight progress + stage UX ---
  const [progress, setProgress] = useState(0) // 0-100
  const [stage, setStage] = useState('idle') // idle | uploading | enhancing | done
  const [uploadedCount, setUploadedCount] = useState(0)

  const { data: user, loading: userLoading } = useUser()
  const { me, products, createCheckout, refetchMe } = useBilling()

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileInput = e => {
    const selectedFiles = Array.from(e.target.files)
    addFiles(selectedFiles)
  }

  const addFiles = newFiles => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic']
      return (
        validTypes.includes(file.type.toLowerCase()) ||
        file.name.toLowerCase().includes('.heic')
      )
    })

    if (validFiles.length !== newFiles.length) {
      setError(
        'Some files were skipped. Only JPG, PNG, and HEIC files are supported.'
      )
    }

    setFiles(prev => {
      const combined = [...prev, ...validFiles]
      if (combined.length > 30) {
        setError('Maximum 30 files allowed. Some files were not added.')
        return combined.slice(0, 30)
      }
      return combined
    })
  }

  const removeFile = index => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please add files to proceed')
      return
    }
    if (!user && !userLoading) {
      window.location.href = '/account/signin?redirect=/upload'
      return
    }

    setProcessing(true)
    setError(null)
    setStage('uploading')
    setProgress(0)
    setUploadedCount(0)

    try {
      const uploadedUrls = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { url, error: uploadError } = await upload({ file })
        if (uploadError) throw new Error(uploadError)
        uploadedUrls.push(url)
        // basic stepped progress during upload (70% allocated)
        const pct = Math.max(5, Math.round(((i + 1) / files.length) * 70))
        setUploadedCount(i + 1)
        setProgress(pct)
      }

      setStage('enhancing')
      // bump progress into the enhancing phase
      setProgress(p => (p < 80 ? 80 : p))

      const response = await fetch('/api/process-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrls: uploadedUrls,
          prompt: DEFAULT_PROMPT,
          fileCount: files.length,
        }),
      })

      if (!response.ok) {
        let message = `Processing failed: ${response.status} ${response.statusText}`
        let detailsJson = null
        try {
          detailsJson = await response.json()
        } catch {}

        if (
          response.status === 402 ||
          detailsJson?.error === 'Not enough credits'
        ) {
          const needed = Math.max(
            1,
            Number(detailsJson?.needed || files.length)
          )
          setCreditsNeeded(needed)
          setNoCreditsMessage(
            detailsJson?.details ||
              "You don't have enough credits to process these photos."
          )
          setShowNoCredits(true)
          return
        }

        if (detailsJson?.details) {
          message = `${message} — ${detailsJson.details}`
        } else if (detailsJson?.error) {
          message = `${message} — ${detailsJson.error}`
        }
        throw new Error(message)
      }

      const result = await response.json()
      setResults({
        ...result,
        photoCount: files.length,
        cost: files.length * 1.0,
      })
      setProgress(100)
      setStage('done')
      refetchMe()
    } catch (err) {
      if (!showNoCredits) {
        setError(err.message || 'Failed to process photos')
      }
    } finally {
      setProcessing(false)
    }
  }

  const startOver = () => {
    setFiles([])
    setResults(null)
    setError(null)
    setProcessing(false)
    setProgress(0)
    setStage('idle')
    setUploadedCount(0)
  }

  const closeNoCredits = () => {
    setShowNoCredits(false)
  }

  return {
    files,
    setFiles,
    processing,
    results,
    dragActive,
    error,
    showNoCredits,
    creditsNeeded,
    noCreditsMessage,
    user,
    userLoading,
    me,
    products,
    createCheckout,
    handleDrag,
    handleDrop,
    handleFileInput,
    removeFile,
    handleProcess,
    startOver,
    closeNoCredits,
    // NEW exports for UX
    progress,
    stage,
    uploadedCount,
  }
}
