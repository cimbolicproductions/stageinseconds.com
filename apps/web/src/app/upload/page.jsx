'use client'

import useUser from '@/utils/useUser'
import useUploadPage from '@/hooks/useUploadPage'
import UploadHeader from '@/components/Upload/UploadHeader'
import SignedOutGate from '@/components/Upload/SignedOutGate'
import ResultsDisplay from '@/components/Upload/ResultsDisplay'
import UploadArea from '@/components/Upload/UploadArea'
import NoCreditsModal from '@/components/Upload/NoCreditsModal'

export default function UploadPage() {
  const {
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
    // NEW: progress props
    progress,
    stage,
    uploadedCount,
  } = useUploadPage()

  if (results) {
    return (
      <ResultsDisplay
        results={results}
        fileCount={files.length}
        startOver={startOver}
      />
    )
  }

  if (!user && !results) {
    return <SignedOutGate />
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white">
        <UploadHeader />
        <UploadArea
          error={error}
          dragActive={dragActive}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          handleFileInput={handleFileInput}
          files={files}
          removeFile={removeFile}
          setFiles={setFiles}
          me={me}
          products={products}
          createCheckout={createCheckout}
          handleProcess={handleProcess}
          processing={processing}
          // NEW: pass progress props
          progress={progress}
          stage={stage}
          uploadedCount={uploadedCount}
        />
        <NoCreditsModal
          show={showNoCredits}
          onClose={closeNoCredits}
          creditsNeeded={creditsNeeded}
          me={me}
          products={products}
          createCheckout={createCheckout}
          noCreditsMessage={noCreditsMessage}
        />
      </div>
    </>
  )
}
