import FileDropzone from '@/components/Upload/FileDropzone'
import FileList from '@/components/Upload/FileList'
import CreditsBar from '@/components/Upload/CreditsBar'
import { Loader2, CheckCircle } from 'lucide-react'

export default function UploadArea({
  error,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileInput,
  files,
  removeFile,
  setFiles,
  me,
  products,
  createCheckout,
  handleProcess,
  processing,
  // NEW: lightweight progress props
  progress,
  stage,
  uploadedCount,
}) {
  const isReadyToEnhance = files.length > 0 && !processing

  const buttonLabel = (() => {
    if (processing) return 'Working...'
    const plural = files.length !== 1 ? 's' : ''
    return `Enhance ${files.length} Photo${plural} Now`
  })()

  const stageText =
    stage === 'uploading'
      ? `Uploading ${uploadedCount} of ${files.length}`
      : stage === 'enhancing'
        ? 'Enhancing your photos...'
        : stage === 'done'
          ? 'Finalizing...'
          : ''

  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <h1
            className="text-3xl md:text-5xl font-bold text-[#0A0A0F] mb-4"
            style={{ fontFamily: 'Instrument Serif, serif' }}
          >
            You’re one click away from a staged, professional showing
          </h1>
          <p className="text-lg text-[#484A53]">
            Drop your photos below — we’ll do the rest.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <CreditsBar
          me={me}
          products={products}
          createCheckout={createCheckout}
          files={files}
        />

        <FileDropzone
          dragActive={dragActive}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          handleFileInput={handleFileInput}
        />

        <FileList files={files} removeFile={removeFile} setFiles={setFiles} />

        {/* NEW: Ready hint */}
        {isReadyToEnhance && (
          <div className="mt-4 flex items-center gap-2 bg-[#F2F7F2] border border-[#D9F0DA] text-[#1B5E20] px-3 py-2 rounded-xl">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm">
              Looks good — click Enhance to stage your photos.
            </span>
          </div>
        )}

        {/* NEW: Progress bar */}
        {processing && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#484A53]">{stageText}</span>
              <span className="text-sm text-[#484A53]">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-[#EDECF8] rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(to right, #8B70F6, #9D7DFF)',
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={handleProcess}
            disabled={files.length === 0 || processing}
            className="px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7E64F2]"
            style={{
              background:
                files.length === 0
                  ? '#CCCCCC'
                  : 'linear-gradient(to top, #8B70F6, #9D7DFF)',
            }}
          >
            {processing ? (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 size={20} className="animate-spin" />
                <span>
                  {stage === 'uploading' ? 'Uploading' : 'Enhancing'}…{' '}
                  {progress}%
                </span>
              </div>
            ) : (
              buttonLabel
            )}
          </button>

          {files.length > 0 && (
            <p className="text-sm text-[#666666] mt-3">
              Cost: $1 per photo • Total: ${(files.length * 1).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
