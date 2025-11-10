import { useRef } from 'react'
import { Upload } from 'lucide-react'

export default function FileDropzone({
  dragActive,
  handleDrag,
  handleDrop,
  handleFileInput,
}) {
  const fileInputRef = useRef(null)

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200
        ${
          dragActive
            ? 'border-[#8B70F6] bg-[#F0EFFF]'
            : 'border-[#D9D9DE] hover:border-[#8B70F6] hover:bg-[#FAFAFA]'
        }
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.heic"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-[#F0EFFF] rounded-2xl flex items-center justify-center mb-4">
          <Upload size={24} className="text-[#8B70F6]" />
        </div>
        <h3 className="text-xl font-semibold text-[#0D0D0D] mb-2">
          Drop photos here
        </h3>
        <p className="text-[#666666] mb-4">or click to choose</p>
        <p className="text-sm text-[#888888]">
          JPG, PNG, HEIC • Up to 30 files
        </p>
      </div>
    </div>
  )
}
