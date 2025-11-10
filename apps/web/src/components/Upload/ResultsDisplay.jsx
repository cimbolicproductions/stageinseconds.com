import { Download } from 'lucide-react'
import UploadHeader from '@/components/Upload/UploadHeader'

export default function ResultsDisplay({ results, fileCount, startOver }) {
  const downloadResults = () => {
    if (results?.downloadUrl) {
      const link = document.createElement('a')
      link.href = results.downloadUrl
      link.download = 'enhanced-photos.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-white">
        <UploadHeader />
        <section className="py-16 px-6">
          <div className="max-w-[800px] mx-auto text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={24} className="text-green-600" />
              </div>
              <h1
                className="text-3xl md:text-4xl font-bold text-[#0D0D0D] mb-4"
                style={{ fontFamily: 'Instrument Serif, serif' }}
              >
                Photos Enhanced Successfully!
              </h1>
              <p className="text-lg text-[#555555] mb-8">
                Your {fileCount} photos have been professionally enhanced and
                are ready for download.
              </p>
            </div>

            <div className="bg-[#F8F9FA] rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#8B70F6] mb-1">
                    {fileCount}
                  </div>
                  <div className="text-sm text-[#666666]">Photos Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#8B70F6] mb-1">
                    ${(fileCount * 1).toFixed(2)}
                  </div>
                  <div className="text-sm text-[#666666]">Total Cost</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#8B70F6] mb-1">
                    ZIP
                  </div>
                  <div className="text-sm text-[#666666]">Download Format</div>
                </div>
              </div>
            </div>

            <button
              onClick={downloadResults}
              className="px-8 py-4 rounded-2xl text-white font-semibold text-lg mb-6 transition-all duration-150 hover:bg-[#7E64F2]"
              style={{
                background: 'linear-gradient(to top, #8B70F6, #9D7DFF)',
              }}
            >
              Download Enhanced Photos
            </button>

            {Array.isArray(results?.previewUrls) &&
              results.previewUrls.length > 0 && (
                <div className="mb-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 place-items-center">
                    {results.previewUrls
                      .slice(0, Math.min(2, results.previewUrls.length))
                      .map((url, idx) => (
                        <div
                          key={idx}
                          className="w-full bg-white border border-[#E6E6EA] rounded-2xl p-2"
                        >
                          <img
                            src={url}
                            alt={`Enhanced preview ${idx + 1}`}
                            className="w-full h-auto rounded-xl object-contain"
                            loading="lazy"
                          />
                        </div>
                      ))}
                  </div>
                  <p className="text-sm text-[#6B7280] mt-3">
                    {fileCount > 1
                      ? 'Here are two previews. Download to get all your enhanced images.'
                      : 'Preview of your enhanced image.'}
                  </p>
                </div>
              )}

            <div>
              <button
                onClick={startOver}
                className="px-6 py-3 border border-[#D9D9DE] text-[#121212] font-semibold text-sm rounded-2xl hover:bg-[#F5F4F3] transition-colors"
              >
                Process More Photos
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
