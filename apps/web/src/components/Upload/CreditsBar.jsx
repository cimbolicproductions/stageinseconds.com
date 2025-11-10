import { CreditCard } from 'lucide-react'

export default function CreditsBar({ me, products, createCheckout, files }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8F9FA] border border-[#E6E6EA] rounded-2xl p-4">
      <div className="flex items-center gap-3 text-[#0D0D0D]">
        <CreditCard size={18} className="text-[#8B70F6]" />
        <span className="text-sm">
          Free trial used: <strong>{me?.freeUsed || 0}/3</strong>
        </span>
        <span className="text-sm">
          • Credits: <strong>{me?.credits || 0}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            createCheckout.mutate({
              lookupKey: 'PAYG_IMAGE_CREDIT',
              quantity: Math.max(1, files.length || 1),
            })
          }
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{
            background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
          }}
        >
          Buy just what I need
        </button>
        <div className="relative inline-block">
          <details className="group">
            <summary className="list-none cursor-pointer px-4 py-2 border border-[#E6E6EA] rounded-xl text-sm">
              Packs ▾
            </summary>
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E6E6EA] rounded-xl shadow p-2 z-10">
              {(products?.offers || [])
                .filter(
                  o =>
                    (o?.metadata?.type || o?.metadata?.get?.('type')) !== 'payg'
                )
                .map(o => (
                  <button
                    key={o.lookupKey}
                    onClick={() =>
                      createCheckout.mutate({
                        lookupKey: o.lookupKey,
                        quantity: 1,
                      })
                    }
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F7F7FB] text-sm"
                  >
                    {o.productName || o.lookupKey}
                    <span className="float-right text-[#6B7280]">
                      ${(o.unitAmount / 100).toFixed(2)}
                    </span>
                  </button>
                ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
