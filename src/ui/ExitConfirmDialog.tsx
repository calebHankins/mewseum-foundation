import { useEffect, useRef } from 'react'

interface ExitConfirmDialogProps {
  pending: { url: string; title: string } | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ExitConfirmDialog — shown when the player clicks a frame with an external url.
 *
 * Pauses the Mewseum (pointer lock released, audio muted, R3F loop frozen by
 * the parent) and asks the player to confirm before opening the external game
 * in a new tab.
 *
 * Returns null when `pending` is null so the component is always mounted but
 * costs nothing when inactive.
 */
export function ExitConfirmDialog({ pending, onConfirm, onCancel }: ExitConfirmDialogProps) {
  // Auto-focus the "Stay" button when the dialog opens — safer default than
  // "Go" so that pressing Enter does not accidentally confirm navigation.
  const stayButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pending) return

    // Focus the Stay button when dialog becomes visible
    stayButtonRef.current?.focus()

    // Dismiss on Escape key
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, onCancel])

  if (!pending) return null

  return (
    /* Full-screen backdrop — sits above the HUD (z-20) */
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-heading"
    >
      {/* Modal card — matches tutorial overlay style */}
      <div className="bg-sanctuary-dark/92 border-2 border-sanctuary-amber/60 rounded-lg max-w-sm w-full mx-4 p-6 text-center">

        {/* Header */}
        <h2
          id="exit-confirm-heading"
          className="font-pixel text-sanctuary-amber text-sm mb-2 leading-relaxed"
        >
          Leaving the Sanctuary
        </h2>

        {/* Destination name */}
        <p className="font-pixel text-sanctuary-dust/70 text-xs mb-3">
          {pending.title}
        </p>

        {/* Body */}
        <p className="font-pixel text-sanctuary-dust text-xs leading-relaxed mb-5">
          This will open an external game in a new tab.
          <br />
          Ready to go?
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            ref={stayButtonRef}
            type="button"
            className="font-pixel text-xs border border-sanctuary-amber/40 text-sanctuary-amber px-4 py-2 rounded hover:bg-sanctuary-warm/20 transition-colors cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
          >
            Stay
          </button>
          <button
            type="button"
            className="font-pixel text-xs bg-sanctuary-amber/80 text-sanctuary-dark px-4 py-2 rounded hover:bg-sanctuary-amber transition-colors cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation()
              onConfirm()
            }}
          >
            Go →
          </button>
        </div>
      </div>
    </div>
  )
}
