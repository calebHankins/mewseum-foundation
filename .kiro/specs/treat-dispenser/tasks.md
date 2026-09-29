# Implementation Plan: Treat Dispenser

## Overview

Build a gumball-machine-style treat dispenser in the Found Foyer. Players interact with it to receive a treat, drop it with the `F` key or a HUD tap, pick it back up before a cat claims it, and nearby cats walk over to eat it — producing the same warmth as petting. All treat state lives in a new `TreatContext`; the cat state machine gains one new `EAT` state; the HUD gains a lower-right treat slot. No changes to `CatProgressContext` or the existing `findCat` lifecycle.

Implementation follows the key order: foundation → scene objects → cat EAT state → HUD extension → wiring → tests.

## Tasks

- [x] 1. Foundation — constants, player state module, and TreatContext
  - [x] 1.1 Create `src/treats/treatData.ts` with all shared constants
    - Export `TREAT_DETECTION_RADIUS = 3.5`, `TREAT_REACH_DISTANCE = 0.4`, `DROP_FORWARD_OFFSET = 1.5`, `TREAT_REST_HEIGHT = 0.19`
    - Export color constants: `TREAT_COLOR`, `TREAT_ACCENT`, `DISPENSER_GLOBE_COLOR`, `DISPENSER_BASE_COLOR`
    - _Requirements: 1.1, 3.1, 4.2, 4.5_

  - [x] 1.2 Create `src/player/playerState.ts` — shared mutable position/forward ref
    - Export a single `playerState` object with `position: THREE.Vector3` and `forward: THREE.Vector3`
    - Initialize to spawn defaults matching `PlayerController` (`position(0, 1.65, 6)`, `forward(0, 0, -1)`)
    - This follows the existing `catPositionsRegistry` pattern: module-level mutable, no React state
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Create `src/treats/TreatContext.tsx` with `TreatState`, `TreatContextValue`, `TreatProvider`, and `useTreatContext`
    - Define `TreatState`: `heldTreat: boolean`, `worldTreat: { position: THREE.Vector3 } | null`, `claimedBy: string | null`
    - Implement all five actions with their guard semantics from the design: `dispenseTreat`, `dropTreat`, `pickupTreat`, `claimTreat`, `consumeTreat`
    - `dispenseTreat`: guard `heldTreat === false`; `dropTreat`: guard `heldTreat === true && worldTreat === null`; `claimTreat`: guard `claimedBy === null`; `consumeTreat`: guard `claimedBy === id`
    - `pickupTreat`: guard `heldTreat === false && worldTreat !== null && claimedBy === null`
    - Initial state: `{ heldTreat: false, worldTreat: null, claimedBy: null }` — no localStorage persistence
    - Export `TreatProvider` (default export) and `useTreatContext` named export; follow the `AudioContext.tsx` pattern exactly
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.5, 3.6, 4.4, 5.5, 6.4, 6.5, 8.2, 8.3_

  - [ ]* 1.4 Write unit tests for `TreatContext` state transitions
    - Test `dispenseTreat` idempotency: calling twice leaves `heldTreat` true without error
    - Test `dropTreat` guard: no treat held → state unchanged
    - Test `dropTreat` guard: worldTreat already exists → state unchanged (Property 3)
    - Test `claimTreat` guard: already claimed → `claimedBy` unchanged
    - Test `consumeTreat` guard: wrong cat id → state unchanged
    - Test `pickupTreat` guard: claimed treat or held inventory → state unchanged
    - Test initial state resets on each provider mount (no localStorage)
    - _Requirements: 3.5, 3.6, 4.4, 6.5_

  - [ ]* 1.5 Write property test for `dropTreat` position formula (Property 1)
    - **Property 1: Drop position is always a forward offset from the player**
    - For any valid world-space position and normalized forward vector, `dropTreat(position, forward)` produces `worldTreat.position === position + forward * DROP_FORWARD_OFFSET`
    - Use `fc.record` with `fc.float` for x/y/z components; generate normalized forward vectors via `fc.float` + normalize
    - Run 100+ trials via fast-check
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.6 Write property test for treat claim exclusivity (Property 2)
    - **Property 2: Treat claim is exclusive (first-come, first-served)**
    - For any `claimedBy` already set to a cat id, `claimTreat(otherCatId)` for any different id leaves `claimedBy` unchanged
    - Use `fc.string` arbitraries for cat ids; vary the initial claimant and the challenger
    - **Validates: Requirements 4.4**

  - [ ]* 1.7 Write property test for drop-while-treat-exists no-op (Property 3)
    - **Property 3: Dropping when a WorldTreat already exists has no effect**
    - For any existing `worldTreat` position, calling `dropTreat()` again leaves `worldTreat.position` and `heldTreat` unchanged
    - Use `fc.record` with `fc.float` for player position and forward vector
    - **Validates: Requirements 3.5**

- [x] 2. Scene objects — TreatDispenser and WorldTreat
  - [x] 2.1 Create `src/treats/TreatDispenser.tsx`
    - Low-poly gumball machine using only `MeshLambertMaterial`: sphere globe (`sphereGeometry args={[0.55, 6, 5]}`), neck cylinder, base cylinder, coin-slot box — all segment counts ≤ 6 per PS1 rules
    - Place at `[3, 0, 7]` as specified; globe emissive intensity shifts 0 → 0.3 on `onPointerOver`/`onPointerOut`
    - `onPointerDown` + `onClick`: call `dispenseTreat()` if `heldTreat === false`; show inline `<Billboard>` "Hands full! 🐾" tooltip for 1.5 s (use `useRef` + `useFrame` countdown, no React state timer) if `heldTreat === true`
    - Add `aria-label="Treat dispenser — click to get a treat"` on the group
    - Read `heldTreat` from `useTreatContext()`; handle both `onClick` and `onPointerDown`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.4_

  - [x] 2.2 Create `src/treats/WorldTreat.tsx`
    - Return `null` when `worldTreat === null`; render `<sphereGeometry args={[0.14, 5, 4]} />` with `MeshLambertMaterial color={TREAT_COLOR}` and `castShadow`
    - Drop entrance animation: scale 0 → 1 over `DROP_ANIM_DURATION = 0.3 s` via `elapsedRef + useFrame`; no React state for animation values
    - Idle bob: Y offset = `sin(elapsed * Math.PI) * 0.05` (period 2 s, amplitude 0.05) via `useFrame`; center height is radius + amplitude to prevent floor clipping
    - Use `meshRef` and `elapsedRef` refs for animation; use component state only for hover feedback
    - Read `worldTreat` from `useTreatContext()`
    - _Requirements: 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4_

  - [x] 2.3 Add guarded pickup interaction to `WorldTreat`
    - Expose `pickupTreat()` from TreatContext; only pick up when the player is empty-handed and no cat has claimed the treat
    - Handle both `onClick` and `onPointerDown`, highlight available treats, and provide an accessible pickup label
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3. Checkpoint — foundation and scene objects
  - Ensure `TreatContext`, `TreatDispenser`, and `WorldTreat` compile with zero TypeScript errors (`tsc --noEmit`). Ask the user if questions arise.

- [x] 4. Cat state machine — add `EAT` state to `Cat.tsx`
  - [x] 4.1 Extend `CatState` type and wire treat context reads into `Cat.tsx`
    - Add `'EAT'` to the `CatState` union type at the top of `Cat.tsx`
    - Add `const { worldTreat, claimedBy, claimTreat, consumeTreat } = useTreatContext()` unconditionally at component top (hook call order must be stable — not inside any conditional)
    - Import `useTreatContext` from `../treats/TreatContext`; import constants from `../treats/treatData`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Add treat detection logic in `useFrame` (IDLE/WANDER → EAT transition)
    - After the existing collision block and before the wandering state machine, add a treat detection guard: runs only when `found === true && (catState === 'IDLE' || catState === 'WANDER') && worldTreat !== null && claimedBy === null`
    - If distance from `group.position` to `worldTreat.position` is within `TREAT_DETECTION_RADIUS`, call `claimTreat(def.id)`, `setCatState('EAT')`, and `setTargetPos(worldTreat.position.clone())`
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 4.3 Implement `EAT` state movement and consume logic in `useFrame`
    - In the `EAT` branch: if `worldTreat === null || claimedBy !== def.id` bail immediately to `IDLE` + `setTargetPos(null)` (defensive guard per design error-handling section)
    - Otherwise move toward `worldTreat.position` using the same rotation-smooth + translate pattern as `WANDER` state (`WANDER_SPEED`, `ROTATION_SPEED`)
    - When `distance <= TREAT_REACH_DISTANCE`: call `consumeTreat(def.id)`, trigger `setPetting(true)`, `setPetTimer(0)`, `setShowHeart(true)`, `setHeartTimer(0)`, `setCatState('COOLDOWN')`, `setCooldownTimer(PET_COOLDOWN)`, and `if (audioEnabled) playMeow()`
    - _Requirements: 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. HUD extension — TreatHUD slot and F-key listener
  - [x] 5.1 Add TreatHUD section to `HUD.tsx`
    - Import `useTreatContext` and read `heldTreat`, `dropTreat`
    - Render lower-right treat slot only when `heldTreat === true`: a `<button>` with 🍬 emoji, both `onClick` and `onPointerDown` calling `dropTreat(playerState.position, playerState.forward)` (import `playerState` from `../player/playerState`)
    - Label text: `"F to drop"` when `isDesktop === true`, `"Tap to drop"` otherwise — matching Requirement 7.3
    - Add `aria-label="Held treat — press F or tap to drop"` on the wrapper div — matching Requirement 2.5
    - Use warm amber palette (`text-sanctuary-amber`, `border-sanctuary-amber/40`) and `font-pixel` consistent with existing HUD elements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3, 7.4_

  - [x] 5.2 Add `F` key listener in `HUD.tsx`
    - In the existing `useEffect` that registers pointer/resize listeners, also add a `keydown` handler for `e.code === 'KeyF'` while `heldTreat === true`
    - Handler reads `playerState.position` and `playerState.forward` synchronously (no React state read) and calls `dropTreat(playerState.position.clone(), playerState.forward.clone())`
    - Ensure cleanup removes the keydown listener in the effect's return
    - Confirm `KeyF` does not conflict with `PlayerController`'s movement map
    - _Requirements: 3.1, 7.3_

- [x] 6. Wiring — connect all pieces in App.tsx, Scene.tsx, and PlayerController.tsx
  - [x] 6.1 Update `PlayerController.tsx` to write `playerState` each frame
    - Import `playerState` from `./playerState`
    - At the end of the `useFrame` callback (after all movement and clamping), write: `playerState.position.copy(camera.position)` and `playerState.forward.copy(forward.current)`
    - This mirrors the `catPositionsRegistry` write pattern — no React state involved
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Update `App.tsx` to wrap with `TreatProvider`
    - Import `TreatProvider` from `./treats/TreatContext`
    - Wrap the existing `<AudioProvider>` subtree with `<TreatProvider>` so both `Scene` and `HUD` have access
    - Provider order: `CatProgressProvider > AudioProvider > TreatProvider > (Scene + HUD)`
    - _Requirements: 2.1, 3.1, 4.1_

  - [x] 6.3 Update `Scene.tsx` to render `TreatDispenser` and `WorldTreat`
    - Import `TreatDispenser` from `./treats/TreatDispenser` and `WorldTreat` from `./treats/WorldTreat`
    - Add both inside the `<Suspense>` block, after `<CatTalisman>` and before `<FrameRegistry>`, to match the architecture diagram
    - _Requirements: 1.2, 3.3_

- [x] 7. Final checkpoint — full build and lint
  - Run `tsc --noEmit` then `npm run lint`. All TypeScript errors and ESLint warnings must be zero. Ask the user if questions arise.

- [ ]* 8. Integration smoke test — full treat loop
  - Write an integration test using `@testing-library/react` + a minimal R3F scene harness that walks through: `dispenseTreat` → `dropTreat` → cat detects treat (simulate distance check) → `consumeTreat` called → `worldTreat` is null
  - Test F-key drop: `keydown` with `code: 'KeyF'` while `heldTreat === true` calls `dropTreat`
  - Test tap drop: `pointerdown` on TreatHUD icon calls `dropTreat`
  - _Requirements: 3.1, 3.2, 4.5, 5.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the core loop works without them.
- The drop key is `F` on desktop; touch devices drop by tapping the TreatHUD icon.
- `playerState.ts` is a module-level mutable object (not React state), consistent with `catPositionsRegistry` in `Cat.tsx`. `PlayerController` writes it each frame; `HUD`'s key handler reads it synchronously.
- `useTreatContext()` must be called unconditionally in `Cat.tsx` to maintain stable hook order — the treat logic is gated by the `found` flag already in place.
- `KeyF` is not mapped to movement in `PlayerController`, so dropping a treat does not move the player.
- Property-based tests (tasks 1.5, 1.6, 1.7) require fast-check: `npm install --save-dev fast-check`.
- All new materials must be `MeshLambertMaterial` — no PBR.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "1.7", "2.1", "2.2"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "5.2", "6.1"] },
    { "id": 5, "tasks": ["4.3"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["8"] }
  ]
}
```
