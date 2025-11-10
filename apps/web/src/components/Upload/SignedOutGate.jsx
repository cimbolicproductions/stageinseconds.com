import UploadHeader from '@/components/Upload/UploadHeader'

export default function SignedOutGate() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-white">
        <UploadHeader />
        <section className="py-16 px-6">
          <div className="max-w-[720px] mx-auto text-center">
            <h1
              className="text-3xl md:text-5xl text-[#0A0A0F] mb-4"
              style={{ fontFamily: 'Instrument Serif, serif' }}
            >
              You’re one click away from a staged, professional showing
            </h1>
            <p className="text-lg text-[#484A53] mb-8">
              Sign in to start your free 3‑photo trial.
            </p>
            <a
              href="/account/signin?redirect=/upload"
              className="inline-block px-8 py-4 rounded-2xl text-white font-semibold text-lg transition transform hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
              }}
            >
              Sign in to start free trial
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
