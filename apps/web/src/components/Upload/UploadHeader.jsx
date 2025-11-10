import useUser from '@/utils/useUser'
import { ArrowLeft } from 'lucide-react'

export default function UploadHeader() {
  const { data: user } = useUser()

  const headerInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email || ' ').slice(0, 1).toUpperCase()
  const headerLabel = user?.name || user?.email || ''

  const RightHeader = user ? (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl border border-[#E6E6EA] bg-white">
        <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs text-[#374151]">
          {headerInitials}
        </div>
        <span className="text-sm text-[#0D0D0D] max-w-[160px] truncate">
          {headerLabel}
        </span>
      </div>
      <a
        href="/account/logout"
        className="px-4 py-2 rounded-xl border border-[#E6E6EA] text-[#0D0D0D] text-sm font-semibold hover:bg-[#F9F9FB] transition"
      >
        Logout
      </a>
    </div>
  ) : (
    <a
      href="/account/signin?redirect=/upload"
      className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition"
      style={{ background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)' }}
    >
      Sign in
    </a>
  )

  return (
    <header
      className="bg-[#F5F6FA] h-16 px-6 border-b border-[#E6E6EA]"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between h-full">
        <div className="flex items-center min-w-0">
          <a href="/" className="flex items-center">
            <img
              src="https://ucarecdn.com/1ca97820-b9c3-4d00-94b1-9130ba303fa0/-/format/auto/"
              alt="StageInSeconds logo"
              className="h-8 md:h-9 lg:h-10 w-auto object-contain shrink-0"
              loading="eager"
              decoding="async"
            />
            {/* Website name + tagline (clean typography). Hide on very small screens; show name on sm+, tagline on md+ */}
            <div className="ml-3 hidden sm:block leading-tight">
              <span
                className="block text-[#0A0A0F] font-semibold text-sm md:text-base tracking-[-0.01em]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                StageInSeconds
              </span>
              <span className="hidden md:block text-[#6B7280] text-xs">
                Because buyers don’t wait.
              </span>
            </div>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-[#0D0D0D] hover:bg-[#F0F0F0] rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </a>
          {RightHeader}
        </div>
      </div>
    </header>
  )
}
