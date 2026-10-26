# Tasks: External Game Exit Confirmation

## Implementation Checklist

All tasks must be completed in order. Each task must leave the project lint-clean and type-clean
before moving to the next.

---

### Task 1 — Add SoberLife III to FRAME_DATA and re-space back-wall frames

**File:** `src/frames/frameData.ts`

1. Update the three existing back-wall frames to new x positions:
   - `garden`: `x = -7.5` (was `-5`)
   - `breathe`: `x = -2.5` (was `0`)
   - `drift`: `x = +2.5` (was `+5`)
2. Append a new entry at the end of `FRAME_DATA`:
   ```ts
   {
     id: 'sober-life-iii',
     title: 'SoberLife III',
     description: 'A life-sim about recovery and small victories.',
     url: 'https://calebhankins.github.io/SoberLife-III/',
     position: [7.5, 2.2, -11.9],
     rotation: [0, 0, 0],
     accentColor: '#7A6A9A',
   }
   ```

**Acceptance:** `npm run lint` passes; the four frames are visible in the running dev server
without overlap. No TypeScript errors.

---

### Task 2 — Extend `AudioContext` with dialog pause/resume

**File:** `src/audio/AudioContext.tsx`

1. Add internal `_prePauseEnabled` ref (use `useRef<boolean>` to avoid re-renders) to store
   the audio state at the moment the dialog opens.
2. Add two new functions to the context value type and implementation:
   - `pauseForDialog(): void` — stores current `audioEnabled` in ref, sets `audioEnabled = false`
   - `resumeAfterDialog(): void` — restores `audioEnabled` from ref
3. Export both from the context interface (`AudioContextValue`).

**Acceptance:** `npm run lint` and `npm run build` pass. No regressions to existing audio toggle.

---

### Task 3 — Add `paused` prop to `Scene` and wire `frameloop`

**File:** `src/Scene.tsx`

1. Add `paused?: boolean` to the `SceneProps` interface (or the props object if inline).
2. Pass `frameloop={paused ? 'demand' : 'always'}` to the R3F `<Canvas>` element.
3. Keep all other Canvas props unchanged (`antialias: false`, `dpr={1}`, `gl` options, etc.).

**Acceptance:** `npm run lint` passes. Confirm in dev tools that switching the prop freezes
WebGL draw calls (check Chrome GPU tab or frame counter).

---

### Task 4 — Add `onRequestExternalNav` prop to `GameFrame` and `FrameRegistry`

**Files:** `src/frames/GameFrame.tsx`, `src/frames/FrameRegistry.tsx`

**`GameFrame.tsx`:**
1. Add `onRequestExternalNav: (payload: { url: string; title: string }) => void` to
   `GameFrameProps`.
2. In `handleClick`, replace:
   ```ts
   } else if (def.url) {
     window.open(def.url, '_blank', 'noopener,noreferrer')
   }
   ```
   with:
   ```ts
   } else if (def.url) {
     onRequestExternalNav({ url: def.url, title: def.title })
   }
   ```
3. Add `def.title` and `onRequestExternalNav` to the `useCallback` dependency array.

**`FrameRegistry.tsx`:**
1. Add `onRequestExternalNav` to `FrameRegistryProps`.
2. Forward it to each `<GameFrame>`.

**Acceptance:** `npm run lint` passes. Clicking a url-frame no longer opens a tab (wiring not
complete yet — console error is expected until Task 5 is done).

---

### Task 5 — Create `ExitConfirmDialog` component

**New file:** `src/ui/ExitConfirmDialog.tsx`

Implement the component per the design spec:

```tsx
interface ExitConfirmDialogProps {
  pending: { url: string; title: string } | null
  onConfirm: () => void
  onCancel: () => void
}

export function ExitConfirmDialog({ pending, onConfirm, onCancel }: ExitConfirmDialogProps) { ... }
```

Requirements:
- Return `null` when `pending` is `null`.
- Render a `fixed inset-0 z-20` backdrop with centered modal card.
- Match tutorial overlay visual style (see design doc for class names).
- Header: `"Leaving the Sanctuary"` (amber, pixel font, sm)
- Destination name: `pending.title` (dust, xs, dimmed)
- Body copy: `"This will open an external game in a new tab. Ready to go?"`
- "Stay" button → `onCancel`; "Go →" button → `onConfirm`
- `useEffect`: listen for `Escape` → `onCancel`; remove listener on unmount.
- On mount, `autoFocus` the "Stay" button (safer default).
- Use **named export** (`export function ExitConfirmDialog`).

**Acceptance:** Component renders in Storybook/manual test. Escape key dismisses. Focus lands
on Stay button. `npm run lint` passes.

---

### Task 6 — Wire everything together in `App.tsx`

**File:** `src/App.tsx`

1. Import `ExitConfirmDialog` and `useAudioContext`.
2. Add state: `const [exitConfirm, setExitConfirm] = useState<{ url: string; title: string } | null>(null)`
3. Consume `pauseForDialog` and `resumeAfterDialog` from `useAudioContext()`.

   > **Note:** `useAudioContext` must be called inside a component that is a child of
   > `AudioProvider`. `App` already renders inside `AudioProvider`'s children, so this is fine.

4. Implement handlers:
   ```ts
   const handleRequestExternalNav = useCallback(
     (payload: { url: string; title: string }) => {
       document.exitPointerLock?.()
       pauseForDialog()
       setExitConfirm(payload)
     },
     [pauseForDialog],
   )

   const handleConfirmExit = useCallback(() => {
     const url = exitConfirm?.url
     setExitConfirm(null)
     resumeAfterDialog()
     if (url) window.open(url, '_blank', 'noopener,noreferrer')
   }, [exitConfirm, resumeAfterDialog])

   const handleCancelExit = useCallback(() => {
     setExitConfirm(null)
     resumeAfterDialog()
     document.querySelector('canvas')?.requestPointerLock()
   }, [resumeAfterDialog])
   ```
5. Pass `paused={exitConfirm !== null}` to `<Scene>`.
6. Pass `onRequestExternalNav={handleRequestExternalNav}` through `<Scene>` → `<FrameRegistry>` → `<GameFrame>`.
7. Render `<ExitConfirmDialog pending={exitConfirm} onConfirm={handleConfirmExit} onCancel={handleCancelExit} />` as a sibling of `<HUD>`.

**Acceptance:** End-to-end flow works:
- Clicking SoberLife III frame → dialog appears, scene freezes, audio mutes.
- "Stay" → dialog closes, scene resumes, audio restores, pointer lock re-requested.
- "Go →" → dialog closes, new tab opens with SoberLife III, Mewseum tab stays active.
- Escape → same as "Stay".
- Pebble Sort frame still works unchanged.

---

### Task 7 — Final lint, type-check, and build verification

```bash
npm run lint    # zero warnings
npm run build   # tsc + vite, zero errors
```

Fix any type or lint errors before marking complete.

**Regression checklist:**
- [ ] All 4 back-wall frames visible, no overlap
- [ ] Breathe, Quiet Garden, Drift frames are non-interactive (no url) — hover only, no dialog
- [ ] Pebble Sort opens mini-game overlay (unchanged)
- [ ] SoberLife III click → confirmation dialog → "Go" opens tab
- [ ] SoberLife III click → confirmation dialog → "Stay" resumes Mewseum
- [ ] Escape dismisses dialog
- [ ] Audio toggle still works independently after dialog close
- [ ] PS1 aesthetic unchanged (no antialiasing, dpr=1)
- [ ] Mobile touch interactions unaffected
