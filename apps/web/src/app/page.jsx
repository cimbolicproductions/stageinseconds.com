import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Download,
  Timer,
  Star,
  ArrowRight,
  Layers3,
  Camera,
  Package,
  PlugZap,
  Shield,
  Quote,
} from 'lucide-react'
// ADD: import current user hook
import useUser from '@/utils/useUser'
// ADD: react-query for auth token check fallback
import { useQuery } from '@tanstack/react-query'

export default function HomePage() {
  // Signed-in detection via session hook
  const { data: currentUser, loading: userLoading } = useUser()

  // Fallback: also confirm auth via token endpoint to avoid provider issues
  const { data: authInfo, isLoading: authLoading } = useQuery({
    queryKey: ['auth', 'token'],
    queryFn: async () => {
      const res = await fetch('/api/auth/token')
      if (!res.ok) {
        const err = new Error(`Auth check failed: ${res.status}`)
        err.status = res.status
        throw err
      }
      return res.json()
    },
    retry: false,
  })

  const isAuthedByHook = !!currentUser && !userLoading
  const isAuthedByToken = !!authInfo?.user && !authLoading
  const showRedirect = isAuthedByHook || isAuthedByToken

  // Header user display + logout link variables
  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (currentUser?.email || ' ').slice(0, 1).toUpperCase()
  const userLabel = currentUser?.name || currentUser?.email || ''

  const RightHeader = currentUser ? (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl border border-[#E6E6EA] bg-white">
        <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs text-[#374151]">
          {userInitials}
        </div>
        <span className="text-sm text-[#0D0D0D] max-w-[160px] truncate">
          {userLabel}
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
    <div className="flex items-center space-x-4">
      <a
        href="/dashboard"
        className="px-6 py-3 rounded-2xl border border-[#E6E6EA] text-[#0D0D0D] font-semibold text-sm hover:bg-[#F9F9FB] transition"
      >
        Dashboard
      </a>
      <a
        href="/account/signin?redirect=/upload"
        className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition transform hover:scale-[1.01] shadow-[0_10px_30px_rgba(111,94,247,0.25)]"
        style={{
          background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
        }}
      >
        Start Editing
      </a>
    </div>
  )

  // Redirect effect (client-only)
  useEffect(() => {
    if (showRedirect && typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }, [showRedirect])

  const [hoveredFeature, setHoveredFeature] = useState(null)
  // UPDATED: autonomous hero display loop per request
  const [slider, setSlider] = useState(0) // 0 = BEFORE fully, 100 = AFTER fully
  const [overlayOpacity, setOverlayOpacity] = useState(0) // 0 = hidden, 1 = visible
  const [phase, setPhase] = useState('beforePause') // "beforePause" | "slideToAfter" | "afterPause1" | "hideToBefore" | "beforePause2" | "fadeToAfter" | "afterPause2"

  // timings (ms)
  const SLIDE_DURATION = 1000 // quick pull across
  const FADE_DURATION = 450 // fairly quick fade
  const HOLD_DURATION = 2000 // pause duration on full states

  // IMPLEMENT NEW LOOP:
  // Start BEFORE -> slide AFTER across -> hold -> fade out to BEFORE -> hold -> fade in AFTER (no slide) -> hold -> repeat
  useEffect(() => {
    let t
    if (phase === 'beforePause') {
      setSlider(0)
      setOverlayOpacity(0)
      t = setTimeout(() => setPhase('slideToAfter'), HOLD_DURATION)
    } else if (phase === 'slideToAfter') {
      setOverlayOpacity(1)
      requestAnimationFrame(() => setSlider(100))
      t = setTimeout(() => setPhase('afterPause1'), SLIDE_DURATION + 60)
    } else if (phase === 'afterPause1') {
      t = setTimeout(() => setPhase('hideToBefore'), HOLD_DURATION)
    } else if (phase === 'hideToBefore') {
      setOverlayOpacity(0)
      t = setTimeout(() => setPhase('beforePause2'), FADE_DURATION + 60)
    } else if (phase === 'beforePause2') {
      setSlider(0)
      t = setTimeout(() => setPhase('fadeToAfter'), HOLD_DURATION)
    } else if (phase === 'fadeToAfter') {
      setSlider(100)
      requestAnimationFrame(() => setOverlayOpacity(1))
      t = setTimeout(() => setPhase('afterPause2'), FADE_DURATION + 60)
    } else if (phase === 'afterPause2') {
      t = setTimeout(() => {
        setOverlayOpacity(0)
        setSlider(0)
        setPhase('beforePause')
      }, HOLD_DURATION)
    }
    return () => clearTimeout(t)
  }, [phase])

  const features = [
    {
      id: 'staging',
      icon: Layers3,
      title: 'Virtual Staging',
      description:
        'Add tasteful furniture, decor, and plants to empty rooms in seconds.',
      isActive: true,
    },
    {
      id: 'dslr',
      icon: Camera,
      title: 'DSLR Quality',
      description:
        'Lighting, color, and clarity tuned automatically for pro results.',
    },
    {
      id: 'bulk',
      icon: Upload,
      title: 'Bulk Upload (30)',
      description:
        'Drop up to 30 photos at once. Perfect for full listing sets.',
    },
    {
      id: 'zip',
      icon: Package,
      title: 'Zip Download',
      description: 'Grab everything in one click, ready for MLS and marketing.',
    },
    {
      id: 'api',
      icon: PlugZap,
      title: 'API-Ready',
      description:
        'Built to integrate with your tools and workflows when you grow.',
    },
  ]

  const isFeatureActive = feature => {
    return feature.isActive || hoveredFeature === feature.id
  }

  const afterOverlayStyle = {
    width: `${slider}%`,
    opacity: overlayOpacity,
    transition:
      phase === 'slideToAfter'
        ? `width ${SLIDE_DURATION}ms cubic-bezier(.2,.8,.2,1), opacity ${FADE_DURATION}ms ease-in-out`
        : `opacity ${FADE_DURATION}ms ease-in-out`,
  }

  return (
    <>
      {/* Google Fonts import */}
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />

      {showRedirect ? (
        // ADD: Minimal redirect UI while effect navigates
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          {/* Immediate redirect for robustness */}
          <script>{`
            try { window.location.replace('/dashboard'); } catch (_) { window.location.href = '/dashboard'; }
          `}</script>
          <div
            className="text-center"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <p className="text-[#0D0D0D] text-lg mb-2">
              Taking you to your dashboard…
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-2xl text-white font-semibold transition"
              style={{ background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)' }}
            >
              Go now
            </a>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-white text-[#0D0D0D]">
          {/* Header */}
          <header
            className="bg-[#F5F6FA] h-16 px-6 border-b border-[#E6E6EA]"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <div className="max-w-[1200px] mx-auto flex items-center justify-between h-full">
              <div className="flex items-center min-w-0">
                {/* REVERT: use compact logo-only asset + ADD: clean brand typography */}
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

              {RightHeader}
            </div>
          </header>

          {/* Hero Section */}
          <section
            className="relative py-16 md:py-24 px-6 bg-gradient-to-b from-[#F7F7FB] to-white"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <div className="max-w-[1200px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                {/* Copy */}
                <div className="fade-up">
                  <h1
                    className="text-4xl md:text-[56px] leading-tight md:leading-[1.1] text-[#0A0A0F] mb-6"
                    style={{
                      fontFamily: 'Instrument Serif, serif',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {/* UPDATED: remove AI wording */}
                    Sell homes faster with professionally staged and lit photos
                  </h1>

                  <p className="text-base md:text-lg text-[#484A53] mb-8 max-w-[55ch]">
                    Upload, describe the look you want, and get stunning results
                    in minutes. No crews, no delays—just listings that move.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6">
                    <a
                      href="/account/signin?redirect=/upload"
                      className="px-8 py-4 rounded-2xl text-white font-semibold text-[15px] transition transform hover:scale-[1.01]"
                      style={{
                        background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                      }}
                    >
                      Start Free Trial
                    </a>
                    <a
                      href="/admin"
                      className="group flex items-center gap-3 px-6 py-3 bg-white border border-[#E6E6EA] rounded-2xl hover:bg-[#F9F9FB] transition"
                    >
                      <span className="text-[#0D0D0D] font-semibold text-[15px]">
                        View Demo
                      </span>
                      <ArrowRight size={16} className="opacity-70" />
                    </a>
                  </div>

                  {/* Trust micro-proof */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F2FF] border border-[#E6E2FF]">
                      <Star
                        size={14}
                        className="text-[#FFB400] fill-[#FFB400]"
                      />
                      <span className="text-[#3B3B3B]">Only $1 per photo</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7FAFF] border border-[#E6EEF9]">
                      <Shield size={14} className="text-[#6F5EF7]" />
                      <span className="text-[#3B3B3B]">
                        Private & secure uploads
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hero Visual: Before/After Display */}
                <div
                  className="relative w-full fade-up"
                  style={{ transition: 'opacity 0.4s ease' }}
                >
                  <div className="relative w-full h-[320px] md:h-[420px] rounded-2xl overflow-hidden bg-white border border-[#E6E6EA]">
                    {/* Before image (base) - EMPTY ROOM */}
                    <img
                      src="https://ucarecdn.com/072acecc-f5b8-429b-860e-3134a0632edf/"
                      alt="Before: empty room"
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Before label on BEFORE image */}
                    <div
                      className="absolute top-4 right-4 px-3 py-1 bg-[#FEE2E2] text-[#991B1B] text-xs font-medium rounded-full pointer-events-none"
                      style={{ zIndex: 0 }}
                    >
                      Before
                    </div>

                    {/* After image overlay */}
                    <div
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={afterOverlayStyle}
                    >
                      <img
                        src="https://ucarecdn.com/9ecbdaf6-886e-42ce-b3b3-bd0dfe740cae/-/format/auto/"
                        alt="After: staged room"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* After label attached to AFTER image */}
                      <div className="absolute top-4 left-4 px-3 py-1 bg-[#DCFCE7] text-[#166534] text-xs font-medium rounded-full pointer-events-none">
                        After
                      </div>
                    </div>

                    {/* No user controls */}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trust Bar */}
          <section className="px-6 py-6 border-t border-b border-[#EDEDED] bg-white">
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[#6B7280] text-sm">
                Trusted by busy agents to get listings market‑ready
              </p>
              <div className="flex items-center gap-4 opacity-80">
                <div className="h-8 w-24 rounded bg-[#F8F8FA] border border-[#EDEDED]"></div>
                <div className="h-8 w-24 rounded bg-[#F8F8FA] border border-[#EDEDED]"></div>
                <div className="h-8 w-24 rounded bg-[#F8F8FA] border border-[#EDEDED]"></div>
                <div className="h-8 w-24 rounded bg-[#F8F8FA] border border-[#EDEDED]"></div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 md:py-24 px-6 bg-white">
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-12 md:mb-16 fade-up">
                <h2
                  className="text-4xl md:text-[44px] leading-tight md:leading-[1.1] text-[#0A0A0F] mb-4"
                  style={{
                    fontFamily: 'Instrument Serif, serif',
                    fontWeight: '400',
                  }}
                >
                  Built for real estate results
                </h2>
                <p className="text-base md:text-lg text-[#4B5563]">
                  Everything you need to stage, enhance, and publish faster
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
                {features.map(feature => {
                  const IconComponent = feature.icon
                  const active = isFeatureActive(feature)

                  return (
                    <div
                      key={feature.id}
                      className={`
                        p-6 md:p-7 rounded-3xl border transition-all duration-200 ease-out cursor-default fade-up
                        ${
                          active
                            ? 'bg-white border-[#E6E6EA] shadow-[0_6px_28px_rgba(20,20,24,0.06)]'
                            : 'bg-white border-[#EDEDED] hover:bg-[#FAFAFC]'
                        }
                      `}
                      onMouseEnter={() => setHoveredFeature(feature.id)}
                      onMouseLeave={() => setHoveredFeature(null)}
                    >
                      <div
                        className={`
                          w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-all duration-200 ease-out
                          ${active ? 'bg-[#F4F2FF] border-[#E6E2FF]' : 'bg-white border-[#EDEDED]'}
                        `}
                      >
                        <IconComponent
                          size={24}
                          strokeWidth={1.6}
                          className="text-[#0D0D0D]"
                        />
                      </div>

                      <h3
                        className="text-xl mb-2 text-[#0D0D0D]"
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontWeight: '600',
                        }}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-[#4B5563]">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Social Proof / Testimonials */}
          <section className="py-16 px-6 bg-[#F9FAFB] border-t border-b border-[#EDEDED]">
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-10 fade-up">
                <h2
                  className="text-3xl md:text-[40px] text-[#0A0A0F] mb-3"
                  style={{ fontFamily: 'Instrument Serif, serif' }}
                >
                  Agents are closing faster
                </h2>
                <p className="text-[#4B5563]">
                  Proof that polished photos change outcomes
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Sarah Johnson',
                    role: 'RE/MAX Agent',
                    quote:
                      'Went from zero staging to a signed offer in 4 days. Photos looked like they were shot for a magazine.',
                  },
                  {
                    name: 'Mike Rodriguez',
                    role: 'Keller Williams',
                    quote:
                      'Cut price reductions by half this quarter. Sellers love the instant transformation.',
                  },
                  {
                    name: 'Jennifer Chen',
                    role: 'Coldwell Banker',
                    quote:
                      '30 photos enhanced in under 10 minutes—my new listing routine. Zero friction.',
                  },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-white border border-[#EDEDED] fade-up"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm text-[#374151]">
                        {t.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[#0D0D0D] font-medium">{t.name}</p>
                        <p className="text-[#6B7280] text-sm">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-[#374151]">“{t.quote}”</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-12 fade-up">
                <h2
                  className="text-3xl md:text-[40px] text-[#0A0A0F] mb-3"
                  style={{ fontFamily: 'Instrument Serif, serif' }}
                >
                  How it works
                </h2>
                <p className="text-[#4B5563]">
                  From upload to download in minutes
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    step: 1,
                    title: 'Upload',
                    desc: 'Drop up to 30 photos (JPG, PNG, HEIC).',
                  },
                  {
                    step: 2,
                    title: 'Describe',
                    desc: 'Add a short prompt like ‘Add modern staging’.',
                  },
                  {
                    step: 3,
                    title: 'Enhance',
                    desc: 'Auto staging, lighting, and detail tuning.',
                  },
                  {
                    step: 4,
                    title: 'Download',
                    desc: 'Grab a ready‑to‑use zip for MLS + ads.',
                  },
                ].map(s => (
                  <div
                    key={s.step}
                    className="p-6 rounded-2xl bg-white border border-[#EDEDED] text-center fade-up"
                  >
                    <div className="w-10 h-10 bg-[#6F5EF7] text-white rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">
                      {s.step}
                    </div>
                    <p className="text-[#0D0D0D] font-semibold mb-1">
                      {s.title}
                    </p>
                    <p className="text-[#4B5563] text-sm">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section (kept) */}
          <section className="py-20 px-6 bg-white">
            <div className="max-w-[800px] mx-auto text-center fade-up">
              <h2
                className="text-3xl md:text-[40px] leading-tight text-[#0A0A0F] mb-6"
                style={{ fontFamily: 'Instrument Serif, serif' }}
              >
                Ready to sell homes faster?
              </h2>
              <p className="text-lg text-[#4B5563] mb-8">
                Join agents using pro‑grade photos to elevate their listings and
                close faster.
              </p>
              <a
                href="/upload"
                className="inline-block px-8 py-4 rounded-2xl text-white font-semibold text-lg transition transform hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
                }}
              >
                Start Your Free Trial
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-white border-t border-[#EDEDED] py-12 px-6">
            <div className="max-w-[1200px] mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                {/* Footer logo with brand name text */}
                <a href="/" className="flex items-center">
                  <img
                    src="https://ucarecdn.com/1ca97820-b9c3-4d00-94b1-9130ba303fa0/-/format/auto/"
                    alt="StageInSeconds logo"
                    className="h-9 md:h-10 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <div className="leading-tight">
                  <span
                    className="block text-[#0A0A0F] font-semibold text-base tracking-[-0.01em]"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    StageInSeconds
                  </span>
                </div>
              </div>
              <p className="text-[#6B7280] text-sm mb-1">
                Because buyers don’t wait.
              </p>
              <p className="text-[#9CA3AF] text-xs">
                © 2025 StageInSeconds. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-up {
          animation: fadeUp 420ms ease both;
        }
      `}</style>
    </>
  )
}
