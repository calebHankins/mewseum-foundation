# Requirements: External Game Exit Confirmation

## Overview

When a player interacts with a `GameFrame` that has a `url` field (i.e., an external game),
the Mewseum must display a confirmation dialog before navigating away.
This prevents accidental tab switches, gives the player context about where they are going,
and preserves the cozy sanctuary atmosphere with a graceful "farewell" moment.

The first concrete use-case is **SoberLife III** (`https://calebhankins.github.io/SoberLife-III/`),
added as a new frame on the back wall. The confirmation mechanism, however, is designed as a
**general gate for all frames with a `url` field** so that future exhibits inherit it automatically.

---

## Scope

| In scope | Out of scope |
|---|---|
| Exit confirmation dialog for all `url`-bearing frames | Iframe embedding of external games |
| SoberLife III frame entry in `FRAME_DATA` | Cross-origin postMessage communication with games |
| Mewseum pause (pointer-lock release, audio mute, R3F freeze) while dialog is open | Analytics / tracking of exit events |
| Resume of Mewseum state when player cancels | Remembering per-frame "don't ask again" preference (v1) |

---

## Requirements

### R1 — SoberLife III Frame Entry
- A new entry **must** be appended to `FRAME_DATA` in `src/frames/frameData.ts`:
  - `id`: `'sober-life-iii'`
  - `title`: `'SoberLife III'`
  - `description`: `'A life-sim about recovery and small victories.'`
  - `url`: `'https://calebhankins.github.io/SoberLife-III/'`
  - `position`: placed on the **back wall** (`z ≈ -11.9`) alongside the existing three frames,
    spaced so all four are evenly distributed (see Design for exact coordinates)
  - `accentColor`: `'#7A6A9A'` (muted purple — thematically distinct from existing teal/green/violet frames)
- The existing three back-wall frames (`breathe`, `garden`, `drift`) **must** be re-spaced to
  accommodate the fourth frame without overlap.

### R2 — Confirmation Dialog Trigger
- Clicking or tapping any `GameFrame` whose `FrameDef.url` is set **must** open the exit
  confirmation dialog instead of immediately calling `window.open`.
- The click handler in `GameFrame` **must not** call `window.open` directly for url-bearing frames.

### R3 — Mewseum Pause on Dialog Open
- When the confirmation dialog opens, the Mewseum **must**:
  1. Call `document.exitPointerLock()` to release mouse capture.
  2. Disable ambient audio (equivalent to `audioEnabled = false` in `AudioContext`).
  3. Freeze the R3F render loop (`useThree().invalidate` approach — set `frameloop="demand"` on
     Canvas when dialog is open, restoring `"always"` on close/cancel).
- The 3D scene remains visible but frozen in the background while the dialog is shown.

### R4 — Confirmation Dialog UI
- The dialog **must** be rendered as a **React DOM overlay** (not inside the R3F canvas),
  at the same layer as the HUD (`z-10` or above, pointer-events enabled).
- Visual style **must** match the existing tutorial overlay:
  - Background: `bg-sanctuary-dark/92`
  - Border: `border-2 border-sanctuary-amber/60 rounded-lg`
  - Font: `font-pixel` (Tailwind class used throughout HUD)
  - Amber accent on primary action
- Dialog **must** contain:
  - A header: `"Leaving the Sanctuary"` (amber, pixel font, small)
  - The **title** of the destination frame (e.g., `"SoberLife III"`)
  - A one-line body: `"This will open an external game in a new tab. Ready to go?"` (dust color, xs)
  - A **"Go"** (confirm) button — amber background, dark text, triggers `window.open`
  - A **"Stay"** (cancel) button — muted border style, closes dialog and resumes Mewseum
- Pressing `Escape` **must** dismiss the dialog (same as "Stay").
- The dialog **must** be centered on screen and not scroll or overflow on small viewports.
- The dialog **must** be accessible: trap focus within the dialog while open; restore focus to
  the triggering element on close.

### R5 — Navigation on Confirm
- On **confirm** ("Go"):
  1. Close the dialog and **resume** the Mewseum (undo pause: restore audio state, restore
     `frameloop`, re-acquire pointer lock is **not** required — user chose to leave).
  2. Call `window.open(url, '_blank', 'noopener,noreferrer')`.
  3. The Mewseum tab remains open and fully interactive.
- On **cancel** ("Stay") or Escape:
  1. Close the dialog.
  2. **Fully resume** the Mewseum: restore ambient audio to its pre-dialog state, restore
     `frameloop="always"`, re-acquire pointer lock (request it so the player can continue
     moving immediately without an extra click).

### R6 — State Propagation
- The "dialog pending" state and the "pending url/title" **must** live in `App.tsx`
  (same pattern as `pebbleSortOpen`), passed down via props or a lightweight context.
- `GameFrame` **must** receive an `onRequestExternalNav` callback prop (in addition to the
  existing `onOpenPebbleSort`) that it calls instead of `window.open` when `def.url` is set.
- `FrameRegistry` **must** forward the new callback through to each `GameFrame`.
- `HUD` **must** not own any dialog state — the confirmation dialog is a sibling of `HUD` in
  `App.tsx`, rendered conditionally like `PebbleSort`.

### R7 — No Regression
- The `pebbles` frame interaction **must** be unaffected.
- Frames without a `url` (hover-only, non-interactive) **must** be unaffected.
- Lint (`npm run lint`) and build (`npm run build`) **must** pass with zero errors/warnings
  after implementation.
