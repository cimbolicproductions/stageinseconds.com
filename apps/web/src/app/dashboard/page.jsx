import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query' // UPDATED: include mutation + client
import useUser from '@/utils/useUser'
import {
  Wand2,
  ArrowLeft,
  Upload,
  Download,
  Calendar,
  DollarSign,
  Camera,
  TrendingUp,
  Pencil, // ADD: edit icon
  Check, // ADD: save icon
  X, // ADD: cancel icon
} from 'lucide-react'

export default function DashboardPage() {
  // Fetch current user to decide signed-in UI quickly
  const { data: currentUser, loading: userLoading } = useUser()

  // Use React Query for dashboard data (user-scoped via API)
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        const text = await res.text()
        const err = new Error(
          text || `Failed to fetch dashboard data: ${res.status}`
        )
        err.status = res.status
        throw err
      }
      return res.json()
    },
    retry: (failureCount, err) => {
      // Don't retry unauthorized
      if (err?.status === 401) return false
      return failureCount < 1
    },
  })

  const jobs = data?.jobs || []
  const stats = data?.stats || {
    totalJobs: 0,
    totalPhotos: 0,
    totalSpent: 0,
    thisMonth: 0,
  }

  const loading = isLoading || userLoading

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // NEW: date-only label for grouping headers
  const formatGroupDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = status => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-600'
      case 'processing':
        return 'bg-blue-100 text-blue-600'
      case 'failed':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  // Header right-side content (user + logout)
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (currentUser?.email || ' ').slice(0, 1).toUpperCase()
  const label = currentUser?.name || currentUser?.email || ''
  const RightHeader = currentUser ? (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl border border-[#E6E6EA] bg-white">
        <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs text-[#374151]">
          {initials}
        </div>
        <span className="text-sm text-[#0D0D0D] max-w-[160px] truncate">
          {label}
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
      href="/account/signin?callbackUrl=/dashboard"
      className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition"
      style={{
        background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
      }}
    >
      Sign in
    </a>
  )

  if (loading) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />

        <div className="min-h-screen bg-white">
          {/* Header (match home style) */}
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
              <div className="flex items-center space-x-4">
                <a
                  href="/upload"
                  className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition"
                  style={{
                    background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                  }}
                >
                  New Project
                </a>
              </div>
            </div>
          </header>

          {/* Loading State */}
          <section className="py-16 px-6">
            <div className="max-w-[1200px] mx-auto">
              <div className="flex items-center justify-center min-h-[320px]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-[#8B70F6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#666666]">Loading your dashboard...</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </>
    )
  }

  // Not signed in
  if (!currentUser) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <div className="min-h-screen bg-white">
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
              {RightHeader}
            </div>
          </header>

          <section className="py-16 px-6">
            <div className="max-w-[800px] mx-auto text-center">
              <h1
                className="text-3xl md:text-5xl font-bold text-[#0A0A0F] mb-4"
                style={{ fontFamily: 'Instrument Serif, serif' }}
              >
                Your photos, all in one place
              </h1>
              <p className="text-[#4B5563] mb-6">
                Sign in to view your past projects and downloads.
              </p>
              <a
                href="/account/signin?callbackUrl=/dashboard"
                className="inline-block px-8 py-4 rounded-2xl text-white font-semibold text-lg transition"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
              >
                Sign in to continue
              </a>
            </div>
          </section>
        </div>
      </>
    )
  }

  // NEW: group jobs by calendar date
  const groups = jobs.reduce((acc, job) => {
    const key = formatGroupDate(job.createdAt)
    if (!acc[key]) acc[key] = []
    acc[key].push(job)
    return acc
  }, {})
  const groupKeys = Object.keys(groups)

  // NEW: Inline-editable job row without showing prompt
  function JobRow({ job }) {
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(job.groupName || '')
    const [errorMsg, setErrorMsg] = useState(null)

    const mutation = useMutation({
      mutationFn: async newName => {
        const res = await fetch(`/api/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupName: newName }),
        })
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || `Failed to rename: ${res.status}`)
        }
        return res.json()
      },
      onMutate: async newName => {
        setErrorMsg(null)
        await queryClient.cancelQueries({ queryKey: ['dashboard'] })
        const prev = queryClient.getQueryData(['dashboard'])
        queryClient.setQueryData(['dashboard'], old => {
          if (!old) return old
          const next = { ...old, jobs: [...(old.jobs || [])] }
          const idx = next.jobs.findIndex(j => j.id === job.id)
          if (idx !== -1) {
            next.jobs[idx] = { ...next.jobs[idx], groupName: newName || null }
          }
          return next
        })
        return { prev }
      },
      onError: (err, _newName, ctx) => {
        console.error(err)
        setErrorMsg('Could not save name')
        if (ctx?.prev) queryClient.setQueryData(['dashboard'], ctx.prev)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      },
    })

    const displayName = job.groupName || 'Untitled project'
    const canDownload = !!job.downloadUrl // allow redownload when a URL exists

    return (
      <div className="bg-white rounded-xl p-4 border border-[#E6E6EA]">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Title row with inline edit */}
            <div className="flex items-center gap-2 mb-1">
              {editing ? (
                <div className="flex items-center gap-2 w-full max-w-[520px]">
                  <input
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Name this project (e.g., 123 Maple St)"
                    className="flex-1 px-3 py-2 border border-[#E6E6EA] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#E6E2FF]"
                  />
                  <button
                    onClick={() => {
                      mutation.mutate((value || '').trim())
                      setEditing(false)
                    }}
                    className="p-2 rounded-lg text-white"
                    style={{
                      background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                    }}
                    title="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setValue(job.groupName || '')
                    }}
                    className="p-2 rounded-lg border border-[#E6E6EA]"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-[#0D0D0D] truncate">
                    {displayName}
                  </span>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded hover:bg-[#F3F4F6]"
                    title="Rename"
                  >
                    <Pencil size={14} className="text-[#6B7280]" />
                  </button>
                </div>
              )}
            </div>

            {/* Details row (hide the prompt entirely as requested) */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
              <span>{formatDate(job.createdAt)}</span>
              <span>{job.photoCount} photos</span>
              <span>
                $
                {job.cost.toFixed
                  ? job.cost.toFixed(2)
                  : Number(job.cost || 0).toFixed(2)}
              </span>
              <span
                className={`px-2 py-1 rounded-full ${getStatusColor(job.status)}`}
              >
                {job.status}
              </span>
            </div>
            {errorMsg && (
              <div className="text-xs text-red-600 mt-1">{errorMsg}</div>
            )}
          </div>

          {/* UPDATED: Always show a Redownload button on the right; enable only when URL exists */}
          <button
            onClick={() => {
              if (!canDownload) return
              try {
                const qs = job.downloadUrl.includes('?') ? '&' : '?'
                const url = `${job.downloadUrl}${qs}r=${Date.now()}` // cache-bust
                const a = document.createElement('a')
                a.href = url
                a.download = ''
                document.body.appendChild(a)
                a.click()
                a.remove()
              } catch (err) {
                console.error(err)
                setErrorMsg('Could not start download')
              }
            }}
            disabled={!canDownload}
            className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition ${
              canDownload ? '' : 'bg-[#D1D5DB] cursor-not-allowed'
            }`}
            style={
              canDownload
                ? { background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)' }
                : {}
            }
            title={canDownload ? 'Redownload ZIP' : 'ZIP not available yet'}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Redownload ZIP</span>
            <span className="sm:hidden">Redownload</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white">
        {/* Header (match home) */}
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
                href="/dashboard"
                className="px-6 py-3 rounded-2xl border border-[#E6E6EA] text-[#0D0D0D] font-semibold text-sm hover:bg-[#F9F9FB] transition"
              >
                Dashboard
              </a>
              <a
                href="/upload"
                className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
              >
                New Project
              </a>
              {RightHeader}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <section className="py-16 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-10">
              <h1
                className="text-3xl md:text-5xl text-[#0A0A0F] mb-2"
                style={{ fontFamily: 'Instrument Serif, serif' }}
              >
                Dashboard
              </h1>
              <p className="text-[#4B5563]">Your projects and downloads</p>
            </div>

            {/* Stats (simple) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-2xl p-6 border border-[#E6E6EA]">
                <div className="text-sm text-[#6B7280] mb-1">Projects</div>
                <div className="text-2xl font-bold text-[#0D0D0D]">
                  {stats.totalJobs}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E6E6EA]">
                <div className="text-sm text-[#6B7280] mb-1">
                  Photos processed
                </div>
                <div className="text-2xl font-bold text-[#0D0D0D]">
                  {stats.totalPhotos}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E6E6EA]">
                <div className="text-sm text-[#6B7280] mb-1">Total spent</div>
                <div className="text-2xl font-bold text-[#0D0D0D]">
                  $
                  {stats.totalSpent?.toFixed
                    ? stats.totalSpent.toFixed(2)
                    : Number(stats.totalSpent || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="bg-white rounded-2xl p-6 border border-[#E6E6EA]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#0D0D0D]">
                  Recent projects
                </h2>
                <a
                  href="/upload"
                  className="text-[#6F5EF7] hover:opacity-80 font-medium text-sm"
                >
                  Start new
                </a>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#F4F2FF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E6E2FF]">
                    <Upload size={24} className="text-[#6F5EF7]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0D0D0D] mb-2">
                    No projects yet
                  </h3>
                  <p className="text-[#6B7280] mb-6">
                    Upload photos to see them here.
                  </p>
                  <a
                    href="/upload"
                    className="px-6 py-3 rounded-2xl text-white font-semibold transition"
                    style={{
                      background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                    }}
                  >
                    Upload photos
                  </a>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupKeys.map(g => (
                    <div key={g}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#6F5EF7]"></div>
                        <h3 className="text-[#0D0D0D] font-semibold">{g}</h3>
                      </div>
                      <div className="space-y-4">
                        {groups[g].map(job => (
                          <JobRow key={job.id} job={job} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
