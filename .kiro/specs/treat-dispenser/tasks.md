# Implementation Plan: Treat Dispenser

## Overview

Build a gumball-machine-style treat dispenser in the Found Foyer. Players interact with it to receive a treat, drop it with the `F` key or a HUD tap, pick it back up before a cat claims it, and nearby cats walk over to eat it — producing the same warmth as petting. All treat state lives in a new `TreatContext`; the cat state machine gains one new `EAT` state; the HUD gains a lower-right treat slot. No changes to `CatProgressContext` or the existing `findCat` lifecycle.

Implementation follows the key order: foundation → scene objects → cat EAT state → HUD extension → wiring → tests.

## Tasks

- [x] 1. Foundation — constants, player state module, and TreatContext
  - [x] 1.1 Create `src/treats/treatData.ts` with all shared constants
    - Export `TREAT_DETECTION_RADIUS = 3.5`, `TREAT_REACH_DISTANCE = 0.4`, `DROP_FORWARD_OFFSET = 1.5`, `TREAT_REST_HEIGHT = 0.19`, `CAT_TREAT_SCALE_INCREASE = 0.1`, `CAT_TREAT_DIGESTION_DURATION = 20`
    - Export color constants: `TREAT_COLOR`, `TREAT_ACCENT`, `DISPENSER_GLOBE_COLOR`, `DISPENSER_BASE_COLOR`
    - _Requirements: 1.1, 3.1, 4.2, 4.5_

  - [x] 1.2 Create `src/player/playerState.ts` — shared mutable position/forward ref
    - Export a single `playerState` object with `position: THREE.Vector3` and `forward: THREE.Vector3`
    - Initialize to spawn defaults matching `PlayerController` (`position(0, 1.65, 6)`, `forward(0, 0, -1)`)
    - This follows the existing `catPositionsRegistry` pattern: module-level mutable, no React state
    - _Requirements: 3.1, 3.2_

  - [x] 1.3 Create `src/treats/TreatContext.tsx` with `TreatState`, `TreatContextValue`, `TreatProvider`, and `useTreatContext`
    - Define `TreatState`: `heldTreat: TreatColor | null` and `worldTreats: Array<{ id: number; position: THREE.Vector3; color: TreatColor; claimedBy: string | null }>`
    - Implement all five actions with their guard semantics from the design: `dispenseTreat`, `dropTreat`, `pickupTreat`, `claimTreat`, `consumeTreat`
    - `dispenseTreat`: guard `heldTreat === null` and randomly select from `TREAT_COLORS`; `dropTreat`: guard `heldTreat !== null`, append a new treat with that color, then clear inventory
    - `pickupTreat(treatId)`: guard `heldTreat === null` and that treat exists unclaimed; restore its color to inventory
    - Initial state: `{ heldTreat: null, worldTreats: [] }` — no localStorage persistence
    - Export `TreatProvider` (default export) and `useTreatContext` named export; follow the `AudioContext.tsx` pattern exactly
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.5, 3.6, 4.4, 5.5, 6.4, 6.5, 8.2, 8.3_

  - [ ]* 1.4 Write unit tests for `TreatContext` state transitions
    - Test `dispenseTreat` idempotency: calling twice leaves the selected `heldTreat` color unchanged
    - Test `dispenseTreat` returns one of `TREAT_COLORS`; drop and pickup preserve the selected color
    - Test `dropTreat` guard: no treat held → state unchanged
    - Test `dropTreat`: while world treats already exist, a new drop appends without replacing them
    - Test `claimTreat` guard: another cat cannot claim the same treat id; a different treat remains claimable
    - Test `consumeTreat` guard: wrong cat id or treat id → state unchanged
    - Test `pickupTreat` guard: claimed treat or held inventory → state unchanged
    - Test `pickupTreat`: removes only the selected treat and preserves other world treats
    - Test initial state resets on each provider mount (no localStorage)
    - _Requirements: 3.5, 3.6, 4.4, 6.5_

  - [ ]* 1.5 Write property test for `dropTreat` position formula (Property 1)
    - **Property 1: Drop position is always a forward offset from the player**
    - For any valid world-space position and normalized forward vector, `dropTreat(position, forward)` appends a treat at `position + forward * DROP_FORWARD_OFFSET`
    - Use `fc.record` with `fc.float` for x/y/z components; generate normalized forward vectors via `fc.float` + normalize
    - Run 100+ trials via fast-check
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.6 Write property test for per-treat claim exclusivity (Property 2)
    - **Property 2: Treat claim is exclusive per treat**
    - For any treat id claimed by one cat, `claimTreat(otherCatId, treatId)` leaves that treat's `claimedBy` unchanged; other treat ids are independent
    - Use `fc.string` arbitraries for cat ids and generated treat ids
    - **Validates: Requirements 4.4**

  - [ ]* 1.7 Write property test for appending world treats (Property 3)
    - **Property 3: Dropping appends another world treat**
    - For any non-empty `worldTreats` array and held treat, dropping appends one new treat and preserves existing ids and positions
    - Use `fc.array` for existing treat state and generated player position/forward vectors
    - **Validates: Requirements 3.5**

- [x] 2. Scene objects — TreatDispenser and WorldTreat
  - [x] 2.1 Create `src/treats/TreatDispenser.tsx`
    - Low-poly gumball machine using only `MeshLambertMaterial`: sphere globe (`sphereGeometry args={[0.55, 6, 5]}`), neck cylinder, base cylinder, coin-slot box — all segment counts ≤ 6 per PS1 rules
    - Fill the globe with 40 faceted candies distributed through its volume; use a semi-transparent amber globe so candies are visible from different angles
    - Jostle individual candies on successful dispense; use the shared `TREAT_COLORS` palette for the candies and random player reward
    - Place at `[0, 0, 0]` in the room center; globe emissive intensity shifts 0 → 0.3 on `onPointerOver`/`onPointerOut`
    - `onPointerDown` + `onClick`: call `dispenseTreat()` if `heldTreat === null`; show inline `<Billboard>` "Hands full! 🐾" tooltip for 1.5 s (use `useRef` + `useFrame` countdown, no React state timer) if `heldTreat !== null`
    - Add `aria-label="Treat dispenser — click to get a treat"` on the group
    - Read `heldTreat` from `useTreatContext()`; handle both `onClick` and `onPointerDown`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.4_

  - [x] 2.4 Add visible candies and dispense jostle animation
    - Render 40 faceted low-poly Lambert candy meshes distributed throughout the translucent globe
    - Animate them independently with a short damped jostle only when a treat is dispensed successfully
    - _Requirements: 1.7, 1.8_

  - [x] 2.5 Randomize treat color and preserve it through pickup/drop
    - Select a random shared palette color when dispensing; show it in the HUD and retain it on the matching WorldTreat
    - Picking up a WorldTreat restores that same color to held inventory
    - _Requirements: 1.9, 2.6, 3.7, 8.5_

  - [x] 2.2 Create `src/treats/WorldTreat.tsx`
    - Render one `<sphereGeometry args={[0.14, 5, 4]} />` mesh with `MeshLambertMaterial color={treat.color}` and `castShadow` for each entry in `worldTreats`; render nothing when the array is empty
    - Drop entrance animation: scale 0 → 1 over `DROP_ANIM_DURATION = 0.3 s` via `elapsedRef + useFrame`; no React state for animation values
    - Idle bob: Y offset = `sin(elapsed * Math.PI) * 0.05` (period 2 s, amplitude 0.05) via `useFrame`; center height is radius + amplitude to prevent floor clipping
    - Use `meshRef` and `elapsedRef` refs for animation; use component state only for hover feedback
    - Read `worldTreats` from `useTreatContext()` and key each mesh by its treat id
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
    - Add `const { worldTreats, claimTreat, consumeTreat } = useTreatContext()` unconditionally at component top; track `targetTreatId` locally
    - Import `useTreatContext` from `../treats/TreatContext`; import constants from `../treats/treatData`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Add treat detection logic in `useFrame` (IDLE/WANDER → EAT transition)
    - After the existing collision block and before the wandering state machine, detect the nearest unclaimed treat within `TREAT_DETECTION_RADIUS` only when found and in `IDLE` or `WANDER`
    - Call `claimTreat(def.id, treat.id)`, record `targetTreatId`, and enter `EAT`; claims are per treat id
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 4.3 Implement `EAT` state movement and consume logic in `useFrame`
    - In the `EAT` branch, find `targetTreatId`; if missing or no longer claimed by this cat, bail immediately to `IDLE`
    - Otherwise move toward that treat using the same rotation-smooth + translate pattern as `WANDER` state (`WANDER_SPEED`, `ROTATION_SPEED`)
    - When `distance <= TREAT_REACH_DISTANCE`: call `consumeTreat(def.id, treat.id)`, trigger the pet-style reaction, and enter `COOLDOWN`
    - _Requirements: 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.4 Grow cats when treats are consumed and digest them over time
    - Add one digestion timer per consumed treat; each contributes 0.1 root scale and decays linearly over 20 seconds
    - Apply the composed scale to the cat root so its model and hitbox grow together; multiply it by the existing petting pulse
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. HUD extension — TreatHUD slot and F-key listener
  - [x] 5.1 Add TreatHUD section to `HUD.tsx`
    - Import `useTreatContext` and read `heldTreat`, `dropTreat`
    - Render lower-right treat slot only when `heldTreat !== null`: a `<button>` with 🍬 emoji and matching color swatch, both `onClick` and `onPointerDown` calling `dropTreat(playerState.position, playerState.forward)` (import `playerState` from `../player/playerState`)
    - Label text: `"F to drop"` when `isDesktop === true`, `"Tap to drop"` otherwise — matching Requirement 7.3
    - Add `aria-label="Held treat — press F or tap to drop"` on the wrapper div — matching Requirement 2.5
    - Use warm amber palette (`text-sanctuary-amber`, `border-sanctuary-amber/40`) and `font-pixel` consistent with existing HUD elements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3, 7.4_

  - [x] 5.2 Add `F` key listener in `HUD.tsx`
    - In the existing `useEffect` that registers pointer/resize listeners, also add a `keydown` handler for `e.code === 'KeyF'` while `heldTreat !== null`
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
  - Write an integration test using `@testing-library/react` + a minimal R3F scene harness that drops multiple treats, assigns separate cat claims, consumes one, verifies growth/digestion, and confirms the others remain
  - Test F-key drop: `keydown` with `code: 'KeyF'` while `heldTreat !== null` calls `dropTreat`
  - Test tap drop: `pointerdown` on TreatHUD icon calls `dropTreat`
  - Test pickup: clicking one unclaimed WorldTreat removes only its id when others remain
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
