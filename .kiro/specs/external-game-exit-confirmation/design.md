# Design: External Game Exit Confirmation

## Motivation

Currently, `GameFrame` calls `window.open(url, '_blank')` directly on click. This is fine for
a mature build where all frames have known destinations, but as real external games are wired in
the abruptness of a tab switch — with no context or farewell — breaks the sanctuary atmosphere.

Adding a confirmation gate:
1. Prevents misclicks from yanking the player out of the world.
2. Gives the player a "moment of intention" — a small ritual before leaving.
3. Establishes a reusable pattern for every future exhibit with a URL.

---

## Architecture

```
App (state owner)
├── pebbleSortOpen: boolean          ← existing
├── exitConfirm: { url, title } | null   ← NEW
│
├── Scene → FrameRegistry → GameFrame
│     GameFrame calls onRequestExternalNav({ url, title })  ← NEW callback
│
├── HUD (unchanged)
│
├── PebbleSort (conditional, existing)
│
└── ExitConfirmDialog (conditional, NEW)
      props: pending: { url, title } | null
             onConfirm: () => void
             onCancel: () => void
```

### Why state in App?

The same reason `pebbleSortOpen` lives there: both the 3D scene (which triggers the open) and
the DOM overlay (which renders the dialog) need to share this bit of state. Lifting to `App`
keeps the pattern identical to the existing mini-game modal and avoids a new context.

---

## Frame Repositioning — Back Wall

Current back-wall frames at `z = -11.9`, centered on `x = 0`:

| id | x |
|---|---|
| garden | -5 |
| breathe | 0 |
| drift | +5 |

With SoberLife III added the four frames are evenly distributed across `x ∈ [-7.5, +7.5]`
(spacing = 5 units, staying ≥ 2 units from room corners):

| id | x |
|---|---|
| garden | -7.5 |
| breathe | -2.5 |
| drift | +2.5 |
| sober-life-iii | +7.5 |

All frames keep `y = 2.2`, `z = -11.9`, `rotation = [0, 0, 0]`.

> [!NOTE]
> The room half-width is ~10 units. At x = ±7.5 the outer edge of the 2.6-wide frame sits at
> x ≈ ±8.8, comfortably within the walls.

---

## FrameDef Extension — No Schema Change Needed

`FrameDef.url` is already `optional`. No new fields are required for v1.
A future `requiresConfirmation?: boolean` opt-out flag can be added if needed, but for now
**any frame with a `url` triggers the confirmation gate**.

---

## Component Design

### `ExitConfirmDialog` — new file `src/ui/ExitConfirmDialog.tsx`

```tsx
interface ExitConfirmDialogProps {
  pending: { url: string; title: string } | null
  onConfirm: () => void
  onCancel: () => void
}
```

Renders `null` when `pending` is `null` (avoids unmount animation complexity in v1).

When `pending` is set:
- Full-screen semi-transparent backdrop (`fixed inset-0 bg-black/40 z-20 pointer-events-auto flex items-center justify-center`)
- Modal card (matches tutorial overlay): `bg-sanctuary-dark/92 border-2 border-sanctuary-amber/60 rounded-lg max-w-sm w-full mx-4 p-6 text-center`
- **Header**: `"Leaving the Sanctuary"` — `font-pixel text-sanctuary-amber text-sm mb-2`
- **Destination**: `pending.title` — `font-pixel text-sanctuary-dust text-xs mb-3 opacity-70`
- **Body**: `"This will open an external game in a new tab. Ready to go?"` — `font-pixel text-sanctuary-dust text-xs leading-relaxed mb-5`
- **Button row**: `flex gap-3 justify-center`
  - **"Go →"**: `font-pixel text-xs bg-sanctuary-amber/80 text-sanctuary-dark px-4 py-2 rounded hover:bg-sanctuary-amber transition-colors` — calls `onConfirm`
  - **"Stay"**: `font-pixel text-xs border border-sanctuary-amber/40 text-sanctuary-amber px-4 py-2 rounded hover:bg-sanctuary-warm/20 transition-colors` — calls `onCancel`

**Keyboard handling** (`useEffect` on mount):
```ts
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
window.addEventListener('keydown', onKey)
return () => window.removeEventListener('keydown', onKey)
```

**Focus trap**: on mount, move focus to the "Stay" button (safer default — prevents accidental confirm via Enter). On unmount, return focus to `document.body` (pointer lock will reclaim focus naturally).

---

### `GameFrame` changes

Add prop:

```ts
interface GameFrameProps {
  def: FrameDef
  onOpenPebbleSort: () => void
  onRequestExternalNav: (payload: { url: string; title: string }) => void  // NEW
}
```

Update `handleClick`:

```ts
const handleClick = useCallback(() => {
  if (def.id === 'pebbles') {
    document.exitPointerLock?.()
    onOpenPebbleSort()
  } else if (def.url) {
    onRequestExternalNav({ url: def.url, title: def.title })  // was: window.open(...)
  }
}, [def.id, def.url, def.title, onOpenPebbleSort, onRequestExternalNav])
```

---

### `FrameRegistry` changes

Thread `onRequestExternalNav` through:

```tsx
interface FrameRegistryProps {
  onOpenPebbleSort: () => void
  onRequestExternalNav: (payload: { url: string; title: string }) => void  // NEW
}
```

---

### `App.tsx` changes

```tsx
const [exitConfirm, setExitConfirm] = useState<{ url: string; title: string } | null>(null)

// Passed to FrameRegistry → GameFrame
const handleRequestExternalNav = useCallback((payload: { url: string; title: string }) => {
  document.exitPointerLock?.()
  pauseAudio()          // see Audio Pause section below
  setExitConfirm(payload)
}, [pauseAudio])

// Confirm: navigate then resume
const handleConfirmExit = useCallback(() => {
  setExitConfirm(null)
  resumeAudio()
  window.open(exitConfirm!.url, '_blank', 'noopener,noreferrer')
  // Do NOT re-request pointer lock — user is leaving, they can click in when they return
}, [exitConfirm, resumeAudio])

// Cancel: restore full Mewseum state
const handleCancelExit = useCallback(() => {
  setExitConfirm(null)
  resumeAudio()
  // Re-request pointer lock so player can move immediately
  document.querySelector('canvas')?.requestPointerLock()
}, [resumeAudio])
```

Render:

```tsx
<ExitConfirmDialog
  pending={exitConfirm}
  onConfirm={handleConfirmExit}
  onCancel={handleCancelExit}
/>
```

---

## Mewseum Pause Mechanism

### Pointer Lock
`document.exitPointerLock()` — already called by the pebbles path; reuse the same pattern.

### Ambient Audio Pause

`AudioContext` currently exposes only `audioEnabled` (boolean) and `toggleAudio`. To support
*external* pause/resume without disturbing the user's preference, add two new actions:

```ts
// AudioContext.tsx additions
pauseForDialog: () => void   // stores pre-dialog state; sets audioEnabled = false
resumeAfterDialog: () => void // restores pre-dialog state
```

Internal implementation:
```ts
const [audioEnabled, setAudioEnabled] = useState(false)
const [_prePauseEnabled, _setPrePauseEnabled] = useState(false)

const pauseForDialog = useCallback(() => {
  _setPrePauseEnabled(audioEnabled)
  setAudioEnabled(false)
}, [audioEnabled])

const resumeAfterDialog = useCallback(() => {
  setAudioEnabled(_prePauseEnabled)
}, [_prePauseEnabled])
```

`useAmbientAudio` already reacts to `audioEnabled`, so no changes needed there.

`App.tsx` consumes `pauseForDialog` / `resumeAfterDialog` from `useAudioContext()`.

### R3F Render Loop Freeze

Set `frameloop` prop on the R3F `<Canvas>` reactively:

```tsx
// Scene.tsx (or App.tsx wrapping Canvas)
<Canvas frameloop={exitConfirm ? 'demand' : 'always'} ...>
```

When `frameloop="demand"`, R3F stops calling `useFrame` callbacks and halts WebGL redraws.
Switching back to `"always"` immediately resumes — no restart overhead.

> [!IMPORTANT]
> The `frameloop` prop must be threaded from `App` down to `Scene.tsx` (or `Scene` must read
> from a context). The simplest path is a new `paused?: boolean` prop on `Scene`.

---

## Sequence Diagram

```
Player                 GameFrame         App              ExitConfirmDialog
  │                      │               │                      │
  │── click frame ──────►│               │                      │
  │                      │─onRequestNav─►│                      │
  │                      │               │─ exitPointerLock      │
  │                      │               │─ pauseForDialog()     │
  │                      │               │─ setExitConfirm() ──►│ (renders)
  │                      │               │                      │
  │◄──────────────────────────────── dialog appears ────────────│
  │                      │               │                      │
  │── "Go" ─────────────────────────────────────────────────── ►│
  │                      │               │◄─ onConfirm ─────────│
  │                      │               │─ setExitConfirm(null) │
  │                      │               │─ resumeAfterDialog()  │
  │                      │               │─ window.open(url)     │
  │                      │               │                      │
  ║ [new tab opens]       │               │                      │
  │                      │               │                      │
  │── "Stay" / Escape ──────────────────────────────────────── ►│
  │                      │               │◄─ onCancel ──────────│
  │                      │               │─ setExitConfirm(null) │
  │                      │               │─ resumeAfterDialog()  │
  │                      │               │─ canvas.requestPointerLock()
```

---

## File Changeset Summary

| File | Change |
|---|---|
| `src/frames/frameData.ts` | Re-space 3 existing back-wall frames; add `sober-life-iii` entry |
| `src/frames/GameFrame.tsx` | Add `onRequestExternalNav` prop; replace `window.open` with callback |
| `src/frames/FrameRegistry.tsx` | Add + forward `onRequestExternalNav` prop |
| `src/ui/ExitConfirmDialog.tsx` | **New file** — confirmation modal component |
| `src/audio/AudioContext.tsx` | Add `pauseForDialog` / `resumeAfterDialog` to context value |
| `src/Scene.tsx` | Accept `paused?: boolean` prop; pass to `<Canvas frameloop>` |
| `src/App.tsx` | Add `exitConfirm` state; wire handlers; render `<ExitConfirmDialog>` |

---

## Visual Mockup — Dialog

```
┌──────────────────────────────────────┐
│         Leaving the Sanctuary        │  ← sanctuary-amber, font-pixel sm
│                                      │
│            SoberLife III             │  ← sanctuary-dust xs, dim
│                                      │
│  This will open an external game     │
│  in a new tab. Ready to go?          │  ← sanctuary-dust xs
│                                      │
│       [ Stay ]      [ Go → ]         │  ← Stay = border; Go = amber fill
└──────────────────────────────────────┘
```

The dialog sits on a `bg-black/40` full-screen backdrop. The frozen 3D scene is visible behind it.

---

## Edge Cases & Mitigations

| Edge case | Mitigation |
|---|---|
| User clicks frame before pointer lock is acquired (touch device) | `exitPointerLock` is a no-op if lock isn't held — safe to call unconditionally |
| User opens two frames quickly (double-tap) | `setExitConfirm` is idempotent; second call replaces first pending URL — acceptable |
| Browser blocks `window.open` (popup blocker) | We call `window.open` inside a user-gesture handler (the "Go" button click); this is the accepted pattern and will not be blocked |
| Audio was already off when dialog opens | `pauseForDialog` stores `false`; `resumeAfterDialog` restores `false` — no audible change |
| `requestPointerLock` on cancel is denied (e.g., page not focused) | Failure is silent; player can click canvas to reclaim lock as usual |
