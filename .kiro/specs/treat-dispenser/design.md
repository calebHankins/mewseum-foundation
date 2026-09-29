# Design Document — Treat Dispenser

## Overview

The Treat Dispenser adds a self-contained interactive loop to the Found Foyer: a low-poly gumball-machine-style object dispenses treats that the player can drop into the world, which nearby cats then detect, walk toward, and eat. The feature deepens engagement with cats without altering the existing `CatProgressContext` / `findCat` discovery lifecycle.

The design isolates all treat state in a new `TreatContext` (React Context + `localStorage`-free), extends the cat behavior state machine with a single new `EAT` state, and adds two new R3F scene components (`TreatDispenser`, `WorldTreat`). Any number of identified WorldTreats may exist simultaneously, each with its own cat claim. The HUD gains a lower-right treat slot driven by context state.

### Goals

- One discoverable, room-scale gumball machine visible from the player's spawn point.
- A simple carry-and-drop mechanic (one treat held at a time; unlimited unconsumed treats in the world).
- Cats react to dropped treats with the same warmth as the petting interaction.
- Zero changes to `CatProgressContext`, `findCat`, or any discovery logic.
- Consistent PS1 aesthetic: `MeshLambertMaterial`, low-poly geometry, warm palette.

---

## Architecture

```md
App
├── CatProgressProvider
├── AudioProvider
├── TreatProvider         ← NEW — wraps both Scene and HUD
│   ├── HUD               ← reads heldTreat, calls dropTreat / dispenseTreat
│   └── Scene (R3F Canvas)
│       ├── PlayerController
│       ├── SceneLights
│       ├── SanctuaryRoom
│       ├── Atmosphere
│       ├── CatRegistry   ← Cat instances now also read worldTreats from TreatContext
│       ├── CatTalisman
│       ├── TreatDispenser ← NEW
│       ├── WorldTreat     ← NEW (renders one mesh per worldTreat)
│       ├── FrameRegistry
│       └── PS1Pipeline
```

### State flow

```md
Player clicks TreatDispenser
  → dispenseTreat()
  → heldTreat = true

Player presses F (desktop) or taps TreatHUD icon (mobile)
  → dropTreat(playerPos, playerForward)
  → heldTreat = false, append { id, position, claimedBy: null } to worldTreats

Player clicks or taps an unclaimed WorldTreat while empty-handed
  → pickupTreat(treatId)
  → heldTreat = true, remove only that id from worldTreats

Per-frame (Cat useFrame)
  choose nearest unclaimed worldTreat within TREAT_DETECTION_RADIUS while state is IDLE/WANDER
  → claimTreat(catId, treatId)
  → that treat's claimedBy = catId

Cat reaches its claimed treat (distance ≤ TREAT_REACH_DISTANCE)
  → consumeTreat(catId, treatId)
  → remove only that treat from worldTreats
  → Cat: scale-pulse + heart + meow + COOLDOWN
```

---

## Components and Interfaces

### `src/treats/TreatContext.tsx`

Provides global treat state to all consumers (Cat, HUD, TreatDispenser, Scene).

```ts
interface TreatState {
  heldTreat: boolean
  worldTreats: Array<{
    id: number
    position: THREE.Vector3
    claimedBy: string | null
  }>
}

interface TreatContextValue extends TreatState {
  dispenseTreat: () => void
  dropTreat: (playerPos: THREE.Vector3, playerForward: THREE.Vector3) => void
  pickupTreat: (treatId: number) => void
  claimTreat: (catId: string, treatId: number) => void
  consumeTreat: (catId: string, treatId: number) => void
}
```

**Action semantics:**

| Action | Guard | Effect |
| --- | --- | --- |
| `dispenseTreat()` | `heldTreat === false` | `heldTreat → true` |
| `dispenseTreat()` | `heldTreat === true` | no-op (dispenser shows tooltip) |
| `dropTreat(pos, fwd)` | `heldTreat === true` | `heldTreat → false`; append a new uniquely identified treat at `pos + fwd * DROP_FORWARD_OFFSET` |
| `dropTreat(pos, fwd)` | `heldTreat === false` | no-op |
| `pickupTreat(treatId)` | `!heldTreat && treat exists && treat.claimedBy === null` | `heldTreat → true`; remove only that treat |
| `pickupTreat(treatId)` | `heldTreat || treat missing || treat.claimedBy !== null` | no-op |
| `claimTreat(catId, treatId)` | treat exists and `treat.claimedBy === null` | set only that treat's `claimedBy → catId` |
| `claimTreat(catId, treatId)` | treat missing or already claimed | no-op (first-come, first-served per treat) |
| `consumeTreat(catId, treatId)` | treat's `claimedBy === catId` | remove only that treat |
| `consumeTreat(catId, treatId)` | treat missing or claimed by another cat | no-op |

`TreatContext` state is **not** persisted to `localStorage`. On page reload, all treat state resets to `{ heldTreat: false, worldTreats: [] }`.

Each world treat has its own id and claim owner. `pickupTreat(treatId)` only succeeds when the player is empty-handed and that treat is unclaimed; it moves that treat from `WORLD` back to `HELD`. Each treat's resting center is `TREAT_REST_HEIGHT` (0.19 world units) above the floor: its 0.14-unit radius plus the 0.05-unit bob amplitude keeps the sphere above the ground through its full animation.

---

### `src/treats/treatData.ts`

```ts
export const TREAT_DETECTION_RADIUS = 3.5  // metres — matches existing SOCIAL_RADIUS
export const TREAT_REACH_DISTANCE = 0.4    // metres — cat "arrives" and eats
export const DROP_FORWARD_OFFSET = 1.5     // metres forward from player when dropped
export const TREAT_REST_HEIGHT = 0.19      // sphere radius + bob amplitude, above floor

export const TREAT_COLOR = '#D4955A'       // warm amber — matches HUD palette
export const TREAT_ACCENT = '#A77A52'      // darker amber for shadow face
export const DISPENSER_GLOBE_COLOR = '#C87050'   // reddish-orange gumball globe
export const DISPENSER_BASE_COLOR  = '#5C3D20'   // dark wood base
```

---

### `src/treats/TreatDispenser.tsx`

R3F component. Placed at `[0, 0, 0]` in the center of the Found Foyer. Low-poly gumball machine built from Three.js primitives — a sphere globe sitting on a cylinder stand, with a small coin-slot box.

```tsx
// Geometry breakdown (all MeshLambertMaterial):
// - Globe:   <sphereGeometry args={[0.55, 6, 5]} />  (visibly faceted)
// - Neck:    <cylinderGeometry args={[0.18, 0.22, 0.3, 6]} />
// - Base:    <cylinderGeometry args={[0.45, 0.5, 0.8, 6]} />
// - Slot:    <boxGeometry args={[0.18, 0.06, 0.1]} />  (protrudes from base)
```

**Interaction:**

- `onPointerOver` / `onPointerOut` → toggle `hovered` local state → `emissiveIntensity` shifts from 0 to 0.3 on globe material.
- `onPointerDown` + `onClick` → call `dispenseTreat()` if `heldTreat === false`; show inline `<Billboard>` tooltip "Hands full!" for 1.5 s if `heldTreat === true`.
- `aria-label` on the group mesh: `"Treat dispenser — click to get a treat"`.

The component reads `heldTreat` from `useTreatContext()`. Because the component lives inside the R3F Canvas, it accesses the context directly via `useContext`.

---

### `src/treats/WorldTreat.tsx`

R3F component. Renders one small faceted sphere for every entry in `worldTreats`; each mesh is keyed by treat id and owns its own animation refs.

```tsx
// Geometry:
// <sphereGeometry args={[0.14, 5, 4]} />   (very low-poly, PS1-style)
// MeshLambertMaterial color={TREAT_COLOR}
// castShadow

// Animations (useFrame):
// 1. Drop entrance: scale 0 → 1 over DROP_ANIM_DURATION = 0.3s
//    scaleRef.current = Math.min(elapsed / DROP_ANIM_DURATION, 1)
// 2. Idle bob: Y offset = sin(time * Math.PI) * BOB_AMPLITUDE  (BOB_AMPLITUDE = 0.05, period 2s)
//    bobRef.current = Math.sin(elapsed * Math.PI) * BOB_AMPLITUDE
```

Refs used for animation: `meshRef` (THREE.Mesh), `elapsedRef` (number). No React state for animation values — only `useRef` + `useFrame`.

The sphere supports `onClick` and `onPointerDown` to call `pickupTreat()`. Pickup is rejected by the context while the player holds a treat or a cat has claimed the world treat; hovering over an available treat shifts it to the darker amber accent.

---

### `src/cats/Cat.tsx` — modifications

**State machine extension:**

```ts
type CatState = 'IDLE' | 'WANDER' | 'SOCIAL' | 'REST' | 'COOLDOWN' | 'PUSHBACK' | 'EAT'
```

**New per-frame logic (inside `useFrame`, after existing state machine, before rendering):**

```md
// Treat detection — choose the nearest unclaimed treat in IDLE or WANDER
if (catState === 'IDLE' || catState === 'WANDER') {
  const treat = nearestUnclaimedTreat(worldTreats, group.position)
  if (treat) {
    claimTreat(def.id, treat.id)
    setTargetTreatId(treat.id)
    setCatState('EAT')
  }
}

// EAT state movement (mirrors WANDER movement logic)
if (catState === 'EAT') {
  const treat = worldTreats.find(item => item.id === targetTreatId)
  if (!treat || treat.claimedBy !== def.id) {
    // This cat's treat was eaten or picked up — bail out
    setCatState('IDLE')
    setTargetPos(null)
    setTargetTreatId(null)
  } else {
    const direction = new THREE.Vector3().subVectors(treat.position, group.position)
    const distance = direction.length()
    if (distance <= TREAT_REACH_DISTANCE) {
      // Consume only the treat this cat claimed
      consumeTreat(def.id, treat.id)
      // Play identical reaction to petting
      setPetting(true)
      setPetTimer(0)
      setShowHeart(true)
      setHeartTimer(0)
      setCatState('COOLDOWN')
      setCooldownTimer(PET_COOLDOWN)
      if (audioEnabled) playMeow()
    } else {
      // Move toward treat (same rotation-smooth + translate as WANDER)
      ...
    }
  }
}
```

**Context reads added at component top:**

```ts
const { worldTreats, claimTreat, consumeTreat } = useTreatContext()
```

The treat-related context values are read unconditionally (not gated on `found`) so the hook call order is stable. The `EAT` state logic below only acts when `found` is true, matching the guard that already exists for all other cat behavior.

**Treat growth and digestion:** Each successful treat consumption adds a digestion timer with a remaining fraction of `1`. On each `useFrame`, the fraction decays linearly over `CAT_TREAT_DIGESTION_DURATION` (20 seconds). The sum of active fractions multiplies `CAT_TREAT_SCALE_INCREASE` (0.1) and is added to the root group scale. Since the cat model and invisible hitbox are children of the root group, both grow together. The petting pulse multiplies this growth scale; it never resets the group to `1` while treats are digesting.

---

### `src/ui/HUD.tsx` — modifications

**New lower-right TreatHUD section:**

```tsx
{heldTreat && (
  <div
    className="absolute bottom-14 right-4 pointer-events-auto flex flex-col items-center gap-1"
    aria-label="Held treat — press F or tap to drop"
  >
    <button
      className="bg-sanctuary-dark/80 border border-sanctuary-amber/40 px-3 py-2 rounded font-pixel text-lg text-sanctuary-amber"
      onClick={() => dropTreat(playerPos, playerForward)}
      onPointerDown={() => { /* duplicate for mobile */ }}
    >
      🍬
    </button>
    <span className="font-pixel text-sanctuary-dust/70 text-xs">
      {isDesktop ? 'F to drop' : 'Tap to drop'}
    </span>
  </div>
)}
```

**`F` key listener** (added to `useEffect` alongside existing pointer/resize listeners):

```ts
const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'KeyF' && heldTreat) {
    dropTreat(/* playerPos, playerForward from camera */)
  }
}
```

Because `HUD` is a React DOM component (not R3F), it cannot read `camera.position` directly. The `dropTreat` call in `HUD` needs the player's current world position and forward vector. Two approaches are viable:

**Chosen approach — camera ref forwarded via a shared module-level export:**

`PlayerController` already stores camera state in `useRef`s. A minimal `playerState.ts` module exports a mutable ref object that `PlayerController` writes each frame and `HUD`'s F-key handler reads:

```ts
// src/player/playerState.ts
export const playerState = {
  position: new THREE.Vector3(),
  forward: new THREE.Vector3(),
}
```

`PlayerController` writes to this each frame (no React re-render triggered). `HUD` reads it synchronously in the `keydown` handler. This is consistent with the existing pattern of `catPositionsRegistry` — a module-level shared mutable record used to communicate between R3F components without React state.

---

### `src/Scene.tsx` — modifications

Add `<TreatDispenser />` and `<WorldTreat />` inside the `<Suspense>` block, after `<CatTalisman>`:

```tsx
import TreatDispenser from './treats/TreatDispenser'
import WorldTreat from './treats/WorldTreat'

// inside <Suspense>:
<TreatDispenser />
<WorldTreat />
```

`TreatProvider` is added in `App.tsx` (not here) so the context is available to both the Canvas and the HUD.

---

### `src/App.tsx` — modifications

```tsx
import { TreatProvider } from './treats/TreatContext'

export default function App() {
  return (
    <CatProgressProvider>
      <AudioProvider>
        <TreatProvider>
          <div className="fixed inset-0">
            <Scene onOpenPebbleSort={...} />
          </div>
          <HUD />
          {pebbleSortOpen && <PebbleSort onClose={...} />}
        </TreatProvider>
      </AudioProvider>
    </CatProgressProvider>
  )
}
```

---

## Data Models

### TreatState (runtime only — no persistence)

```ts
interface TreatState {
  heldTreat: boolean
  worldTreats: Array<{
    id: number
    position: THREE.Vector3
    claimedBy: string | null
  }>
}

// Initial state (also reset on every page load)
const initialState: TreatState = {
  heldTreat: false,
  worldTreats: [],
}
```

### PlayerState (module-level mutable, not React state)

```ts
// src/player/playerState.ts
export const playerState = {
  position: new THREE.Vector3(0, 1.65, 6),  // matches PLAYER_HEIGHT + spawn
  forward: new THREE.Vector3(0, 0, -1),
}
```

### CatState extension

The `CatState` union type in `Cat.tsx` gains `'EAT'`:

```ts
type CatState = 'IDLE' | 'WANDER' | 'SOCIAL' | 'REST' | 'COOLDOWN' | 'PUSHBACK' | 'EAT'
```

No new persistent data. The `EAT` state is entirely ephemeral local component state.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The Treat Dispenser feature is primarily composed of UI rendering, React state transitions, and Three.js scene mutations. Most acceptance criteria are covered by targeted example-based tests. Three criteria — the treat drop position formula, per-treat claim exclusion, and appending drops without replacing existing treats — involve meaningful input variation and universal invariants, making them candidates for property-based testing.

### Property 1: Drop position is always a forward offset from the player

*For any* valid player world-space position and any normalized forward direction vector, calling `dropTreat(position, forward)` should append a treat whose position equals `position + forward * DROP_FORWARD_OFFSET`, regardless of existing treats or player orientation.

**Validates: Requirements 3.1, 3.2**

### Property 2: Treat claim is exclusive per treat

*For any* treat id already claimed by one cat, calling `claimTreat(otherCatId, treatId)` for any different cat id should leave that treat's `claimedBy` unchanged. Claims on other treat ids remain independent.

**Validates: Requirements 4.4**

### Property 3: Dropping appends another world treat

*For any* non-empty `worldTreats` array and a held treat, calling `dropTreat(position, forward)` should preserve every existing treat and append one new treat at `position + forward * DROP_FORWARD_OFFSET`.

**Validates: Requirements 3.5**

---

## Error Handling

### Dispenser interaction while hands full

`TreatDispenser` displays an inline `<Billboard>` tooltip ("Hands full! 🐾") for 1.5 seconds when the player interacts while `heldTreat === true`. The tooltip uses `useRef` + `useFrame` countdown — no React state timer.

### Cat claim lost mid-EAT

If a cat's target treat disappears or its `claimedBy` changes away from this cat while in `EAT`, the cat immediately transitions back to `IDLE` on the next `useFrame` tick. Other world treats remain unaffected.

### Drop with no treat held

`dropTreat()` checks `heldTreat === true` before mutating state. If called without a held treat (e.g., if the F-key fires between a state update and the next render), it silently no-ops.

### Page reload / session loss

`TreatContext` initialises from `initialState` on every mount. No `localStorage` read or write. All in-flight treats are lost on reload — this is the specified behavior (Requirement 6.5).

### Audio context suspended

`playMeow()` checks `sharedAudioCtx.state === 'suspended'` and calls `resume()` before playing. The existing `meow.ts` already handles this; no new error handling needed for the eat reaction.

---

## Testing Strategy

The feature is primarily composed of React Context state transitions, R3F scene components, and DOM overlay UI — not pure data-transformation functions. The testing approach therefore emphasises example-based unit tests for state transitions and targeted integration tests for the scene interactions.

**PBT applicability**: The state transitions for `dropTreat` and `claimTreat` have universally-quantified invariants and cheap-to-generate inputs, making them appropriate for property-based testing. All other acceptance criteria are better served by example-based tests. See Correctness Properties above.

### Property-Based Tests (fast-check)

Use [fast-check](https://github.com/dubzzz/fast-check) for the two PBT-eligible properties.

```ts
// Feature: treat-dispenser, Property 1: Drop position is always a forward offset
// Feature: treat-dispenser, Property 2: Treat claim is exclusive
// Feature: treat-dispenser, Property 3: Dropping appends another world treat
```

Each test generates 100+ random inputs via `fc.record` / `fc.float` / `fc.string` arbitraries against the pure reducer functions extracted from `TreatContext`.

### Unit Tests (Vitest + React Testing Library)

| Area | What to test |
| --- | --- |
| `TreatContext` | `dispenseTreat` idempotency, `dropTreat` guard (no treat held → no-op), append while other treats exist, per-treat claim/consume guards, pickup removes only the selected unclaimed treat, initial state reset |
| `TreatDispenser` | Renders without error; material type is `MeshLambertMaterial`; both `onClick` and `onPointerDown` props present; tooltip appears when heldTreat is true |
| `WorldTreat` | Renders one mesh per `worldTreats` entry; each mesh has `castShadow`, independent bob animation, and id-specific pickup |
| `HUD` TreatHUD section | Icon + label appear when `heldTreat=true`, absent when false; label text is "F to drop" on desktop, "Tap to drop" on touch; aria-label is present |
| `Cat` EAT state | Claims nearest unclaimed treat; consumes only its target; each consumed treat increases root scale by 0.1 and its contribution returns to zero after 20 seconds, including the hitbox |

### Integration Tests

- **Full treat loop**: Dispense → drop multiple treats → cats claim different treats → eat reactions fire → each consumed treat is removed independently. Test against a minimal R3F scene using `@testing-library/react`.
- **F key drop**: `keydown` event with `code: 'KeyF'` while `heldTreat=true` calls `dropTreat`.
- **Tap drop**: `pointerdown` on TreatHUD icon calls `dropTreat`.
- **Multiple treats and pickup**: dropping appends meshes; picking up or consuming one leaves the others in place.
- **F key non-conflict**: `keydown` with `code: 'KeyF'` in `PlayerController` has no registered handler — confirm `KeyF` is not in `PlayerController`'s movement key map.
