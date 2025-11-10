import { X, CreditCard } from 'lucide-react'

export default function NoCreditsModal({
  show,
  onClose,
  creditsNeeded,
  me,
  products,
  createCheckout,
  noCreditsMessage,
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-[92%] sm:w-[560px] bg-white rounded-2xl shadow-xl border border-[#E6E6EA] p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-2 rounded-lg hover:bg-[#F5F6FA]"
          aria-label="Close"
        >
          <X size={16} className="text-[#6B7280]" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#F0EFFF] flex items-center justify-center">
            <CreditCard size={20} className="text-[#8B70F6]" />
          </div>
          <h3 className="text-xl font-semibold text-[#0D0D0D]">
            You’re out of credits
          </h3>
        </div>

        <p className="text-[#4B5563] mb-4">
          {noCreditsMessage ||
            'To enhance these photos, purchase just what you need or pick a discounted pack.'}
        </p>

        <div className="bg-[#F8F9FA] rounded-xl p-3 mb-4 text-sm text-[#0D0D0D]">
          <div className="flex items-center flex-wrap gap-4">
            <span>
              Needed now: <strong>{creditsNeeded}</strong>
            </span>
            <span>
              Your credits: <strong>{me?.credits || 0}</strong>
            </span>
            <span>
              Free trial used: <strong>{me?.freeUsed || 0}/3</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <button
            onClick={() =>
              createCheckout.mutate({
                lookupKey: 'PAYG_IMAGE_CREDIT',
                quantity: Math.max(1, creditsNeeded),
              })
            }
            className="flex-1 px-4 py-3 rounded-xl text-white font-semibold"
            style={{
              background: 'linear-gradient(180deg,#6F5EF7,#8B70F6)',
            }}
          >
            Buy {creditsNeeded} credit{creditsNeeded !== 1 ? 's' : ''}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-[#E6E6EA] text-[#0D0D0D] font-semibold"
          >
            Not now
          </button>
        </div>

        <div className="border-t border-[#EDEDED] pt-3">
          <p className="text-sm text-[#6B7280] mb-2">
            Or choose a pack and save
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="text-left px-4 py-3 rounded-xl border border-[#E6E6EA] hover:bg-[#F7F7FB]"
                >
                  <div className="font-semibold text-[#0D0D0D]">
                    {o.productName || o.lookupKey}
                  </div>
                  <div className="text-sm text-[#6B7280]">
                    ${(o.unitAmount / 100).toFixed(2)} total
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
