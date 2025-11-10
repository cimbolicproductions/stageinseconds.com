import useAuth from '@/utils/useAuth'

export default function LogoutPage() {
  const { signOut } = useAuth()

  const handle = async () => {
    await signOut({ callbackUrl: '/', redirect: true })
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E6E6EA] p-8 text-center">
        <h1
          className="text-3xl md:text-4xl text-[#0A0A0F] mb-6"
          style={{ fontFamily: 'Instrument Serif, serif' }}
        >
          Sign out
        </h1>
        <button
          onClick={handle}
          className="w-full px-6 py-4 rounded-2xl text-white font-semibold text-lg transition transform hover:scale-[1.01]"
          style={{ background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
