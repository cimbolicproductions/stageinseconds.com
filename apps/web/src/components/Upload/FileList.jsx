import { useEffect, useState } from 'react'
import { FileImage, X } from 'lucide-react'

export default function FileList({ files, removeFile, setFiles }) {
  // NEW: build preview URLs for image files (hooks must run unconditionally)
  const [previews, setPreviews] = useState([])
  useEffect(() => {
    const urls = files.map(file => {
      try {
        if (typeof window !== 'undefined' && file?.type?.startsWith('image/')) {
          return URL.createObjectURL(file)
        }
      } catch {}
      return null
    })
    setPreviews(urls)
    return () => {
      urls.forEach(u => {
        if (u) {
          try {
            URL.revokeObjectURL(u)
          } catch {}
        }
      })
    }
  }, [files])

  if (files.length === 0) return null

  return (
    <div className="mt-8 bg-[#F8F9FA] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#0D0D0D]">
          Selected Files ({files.length}/30)
        </h3>
        <button
          onClick={() => setFiles([])}
          className="text-sm text-[#666666] hover:text-[#333333] transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* NEW: thumbnail grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((file, index) => {
          const preview = previews[index]
          return (
            <div
              key={index}
              className="relative bg-white rounded-xl p-2 border border-[#E6E6EA]"
            >
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-md shadow-sm"
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} className="text-[#666666]" />
              </button>

              {preview ? (
                <img
                  src={preview}
                  alt={file.name}
                  className="w-full h-[120px] object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-[120px] bg-[#F3F4F6] rounded-md flex items-center justify-center">
                  <FileImage size={24} className="text-[#8B70F6]" />
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                <FileImage size={16} className="text-[#8B70F6]" />
                <span
                  className="text-xs text-[#333333] truncate"
                  title={file.name}
                >
                  {file.name}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
