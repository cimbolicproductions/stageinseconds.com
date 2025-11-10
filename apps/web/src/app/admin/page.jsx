import { useState, useEffect } from 'react'
import { ArrowLeft, Upload, Send, Users, Mail, Phone } from 'lucide-react'
import useUser from '@/utils/useUser'

export default function AdminPage() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [demoPhoto, setDemoPhoto] = useState(null)
  const [prompt, setPrompt] = useState(
    'Add modern furniture and professional staging'
  )
  const [loading, setLoading] = useState(false)
  const [sendingDemo, setSendingDemo] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const { data: user } = useUser()
  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email || ' ').slice(0, 1).toUpperCase()
  const label = user?.name || user?.email || ''
  const RightHeader = user ? (
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
      href="/account/signin?callbackUrl=/admin"
      className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition"
      style={{ background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)' }}
    >
      Sign in
    </a>
  )

  // Sample real estate agents data
  const sampleAgents = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@remax.com',
      phone: '+1 (555) 123-4567',
      agency: 'RE/MAX Properties',
      location: 'Oklahoma City, OK',
      lastContact: null,
    },
    {
      id: 2,
      name: 'Mike Rodriguez',
      email: 'mike.r@kw.com',
      phone: '+1 (555) 234-5678',
      agency: 'Keller Williams',
      location: 'Oklahoma City, OK',
      lastContact: null,
    },
    {
      id: 3,
      name: 'Jennifer Chen',
      email: 'j.chen@coldwell.com',
      phone: '+1 (555) 345-6789',
      agency: 'Coldwell Banker',
      location: 'Edmond, OK',
      lastContact: '2024-01-15',
    },
  ]

  useEffect(() => {
    setAgents(sampleAgents)
  }, [])

  const handleFileInput = e => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (validTypes.includes(file.type.toLowerCase())) {
        setDemoPhoto(file)
        setError(null)
      } else {
        setError('Please select a JPG or PNG image file')
      }
    }
  }

  const sendDemo = async () => {
    if (!selectedAgent || !demoPhoto || !prompt.trim()) {
      setError('Please select an agent, upload a photo, and enter a prompt')
      return
    }

    setSendingDemo(true)
    setError(null)

    try {
      // In a real implementation, this would:
      // 1. Upload the demo photo
      // 2. Process it with the Nano Banana API
      // 3. Send SMS via HighLevel CRM integration
      // 4. Update the agent's record

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create demo job record
      const response = await fetch('/api/admin/send-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          agentPhone: selectedAgent.phone,
          prompt: prompt.trim(),
          photoName: demoPhoto.name,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send demo: ${response.status}`)
      }

      const result = await response.json()
      setSuccess(
        `Demo sent successfully to ${selectedAgent.name}! SMS with enhanced photo link sent to ${selectedAgent.phone}`
      )

      // Update agent's last contact
      setAgents(prev =>
        prev.map(agent =>
          agent.id === selectedAgent.id
            ? { ...agent, lastContact: new Date().toISOString().split('T')[0] }
            : agent
        )
      )

      // Reset form
      setSelectedAgent(null)
      setDemoPhoto(null)
      setPrompt('Add modern furniture and professional staging')
    } catch (err) {
      console.error('Send demo error:', err)
      setError(err.message || 'Failed to send demo')
    } finally {
      setSendingDemo(false)
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white dark:bg-[#121212]">
        {/* Header */}
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
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-[#121212] dark:text-white hover:bg-[#F0F0F0] dark:hover:bg-[#2A2A2A] rounded-xl transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back to Home</span>
              </a>
              {RightHeader}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <section className="py-16 px-6">
          <div className="max-w-[1200px] mx-auto">
            {/* Page Header */}
            <div className="mb-12">
              <h1
                className="text-3xl md:text-5xl font-bold text-[#0D0D0D] dark:text-white mb-4"
                style={{ fontFamily: 'Instrument Serif, serif' }}
              >
                Admin Dashboard
              </h1>
              <p className="text-lg text-[#555555] dark:text-[#C0C0C0]">
                Send demo enhanced photos to real estate agents via SMS
              </p>
            </div>

            {/* Success/Error Messages */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                <p className="text-green-600 dark:text-green-400 text-sm">
                  {success}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Agent Selection */}
              <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Users size={24} className="text-[#8B70F6]" />
                  <h2 className="text-xl font-semibold text-[#0D0D0D] dark:text-white">
                    Select Real Estate Agent
                  </h2>
                </div>

                <div className="space-y-3">
                  {agents.map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedAgent?.id === agent.id
                          ? 'border-[#8B70F6] bg-[#F0EFFF] dark:bg-[#1A1A2E]'
                          : 'border-[#E0E0E0] dark:border-[#404040] hover:border-[#8B70F6] hover:bg-[#FAFAFA] dark:hover:bg-[#262626]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#0D0D0D] dark:text-white">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-[#666666] dark:text-[#AAAAAA] mb-1">
                            {agent.agency}
                          </p>
                          <p className="text-sm text-[#888888] dark:text-[#888888]">
                            {agent.location}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[#888888] dark:text-[#888888]">
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {agent.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              {agent.phone}
                            </span>
                          </div>
                        </div>

                        {agent.lastContact && (
                          <div className="text-xs text-[#8B70F6] bg-[#F0EFFF] dark:bg-[#1A1A2E] px-2 py-1 rounded-full">
                            Contacted: {agent.lastContact}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Photo Upload */}
              <div className="bg-[#F8F9FA] dark:bg-[#1E1E1E] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Upload size={24} className="text-[#8B70F6]" />
                  <h2 className="text-xl font-semibold text-[#0D0D0D] dark:text-white">
                    Upload Demo Photo
                  </h2>
                </div>

                {/* File Upload */}
                <div className="mb-6">
                  <label className="block">
                    <div
                      className={`
                      border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                      ${
                        demoPhoto
                          ? 'border-[#8B70F6] bg-[#F0EFFF] dark:bg-[#1A1A2E]'
                          : 'border-[#D9D9DE] dark:border-[#3A3A3A] hover:border-[#8B70F6] hover:bg-[#FAFAFA] dark:hover:bg-[#262626]'
                      }
                    `}
                    >
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleFileInput}
                        className="hidden"
                      />

                      {demoPhoto ? (
                        <div>
                          <div className="w-12 h-12 bg-[#8B70F6] rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Upload size={20} className="text-white" />
                          </div>
                          <p className="font-medium text-[#0D0D0D] dark:text-white mb-1">
                            {demoPhoto.name}
                          </p>
                          <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                            Click to change photo
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="w-12 h-12 bg-[#F0EFFF] dark:bg-[#1A1A2E] rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Upload size={20} className="text-[#8B70F6]" />
                          </div>
                          <p className="font-medium text-[#0D0D0D] dark:text-white mb-1">
                            Upload demo photo
                          </p>
                          <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                            JPG or PNG format
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#0D0D0D] dark:text-white mb-2">
                    Enhancement Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe how you want to enhance the photo..."
                    className="w-full p-3 border border-[#E0E0E0] dark:border-[#404040] rounded-xl text-[#333333] dark:text-[#CCCCCC] bg-white dark:bg-[#262626] resize-none focus:outline-none focus:ring-2 focus:ring-[#8B70F6] focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Send Demo Button */}
                <button
                  onClick={sendDemo}
                  disabled={
                    !selectedAgent ||
                    !demoPhoto ||
                    !prompt.trim() ||
                    sendingDemo
                  }
                  className="w-full px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7E64F2]"
                  style={{
                    background:
                      !selectedAgent || !demoPhoto || !prompt.trim()
                        ? '#CCCCCC'
                        : 'linear-gradient(to top, #8B70F6, #9D7DFF)',
                  }}
                >
                  {sendingDemo ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing & Sending...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Send size={20} />
                      Send Demo to Agent
                    </div>
                  )}
                </button>

                {selectedAgent && demoPhoto && (
                  <p className="text-sm text-[#666666] dark:text-[#AAAAAA] mt-3 text-center">
                    Will send enhanced photo via SMS to {selectedAgent.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-12 bg-[#F0EFFF] dark:bg-[#1A1A2E] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[#0D0D0D] dark:text-white mb-4">
                How the Demo Workflow Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#8B70F6] text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    1
                  </div>
                  <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                    Select agent from scraped contact list
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#8B70F6] text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    2
                  </div>
                  <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                    Upload demo photo and enhancement prompt
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#8B70F6] text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    3
                  </div>
                  <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                    System enhances the photo
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#8B70F6] text-white rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                    4
                  </div>
                  <p className="text-sm text-[#666666] dark:text-[#AAAAAA]">
                    HighLevel CRM sends SMS with enhanced photo link
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
