# Design Document — Treat Dispenser

## Overview

The Treat Dispenser adds a self-contained interactive loop to the Found Foyer: a low-poly gumball-machine-style object dispenses treats that the player can drop into the world, which nearby cats then detect, walk toward, and eat. The feature deepens engagement with cats without altering the existing `CatProgressContext` / `findCat` discovery lifecycle.

The design isolates all treat state in a new `TreatContext` (React Context + `localStorage`-free), extends the cat behavior state machine with a single new `EAT` state, and adds two new R3F scene components (`TreatDispenser`, `WorldTreat`). The HUD gains a lower-right treat slot driven by context state.

### Goals

- One discoverable, room-scale gumball machine visible from the player's spawn point.
- A simple carry-and-drop mechanic (max one treat in flight at a time).
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
│       ├── CatRegistry   ← Cat instances now also read worldTreat from TreatContext
│       ├── CatTalisman
│       ├── TreatDispenser ← NEW
│       ├── WorldTreat     ← NEW (renders only when worldTreat ≠ null)
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
  → heldTreat = false, worldTreat = { position: playerPos + forward * 1.5 }

Player clicks or taps an unclaimed WorldTreat while empty-handed
  → pickupTreat()
  → heldTreat = true, worldTreat = null

Per-frame (Cat useFrame)
  worldTreat exists + distance < TREAT_DETECTION_RADIUS + state IDLE/WANDER + claimedBy === null
  → claimTreat(catId)
  → claimedBy = catId

Cat reaches treat (distance ≤ TREAT_REACH_DISTANCE)
  → consumeTreat(catId)
  → worldTreat = null, claimedBy = null
  → Cat: scale-pulse + heart + meow + COOLDOWN
```

---

## Components and Interfaces

### `src/treats/TreatContext.tsx`

Provides global treat state to all consumers (Cat, HUD, TreatDispenser, Scene).

```ts
interface TreatState {
  heldTreat: boolean
  worldTreat: { position: THREE.Vector3 } | null
  claimedBy: string | null  // cat id that has claimed the worldTreat
}

interface TreatContextValue extends TreatState {
  dispenseTreat: () => void
  dropTreat: (playerPos: THREE.Vector3, playerForward: THREE.Vector3) => void
  pickupTreat: () => void
  claimTreat: (catId: string) => void
  consumeTreat: (catId: string) => void
}
```

**Action semantics:**

| Action | Guard | Effect |
| --- | --- | --- |
| `dispenseTreat()` | `heldTreat === false` | `heldTreat → true` |
| `dispenseTreat()` | `heldTreat === true` | no-op (dispenser shows tooltip) |
| `dropTreat(pos, fwd)` | `heldTreat === true && worldTreat === null` | `heldTreat → false`, `worldTreat → { position: pos + fwd * DROP_FORWARD_OFFSET }` |
| `dropTreat(pos, fwd)` | `heldTreat === false \|\| worldTreat !== null` | no-op |
| `claimTreat(id)` | `worldTreat !== null && claimedBy === null` | `claimedBy → id` |
| `claimTreat(id)` | `claimedBy !== null` | no-op (first-come, first-served) |
| `consumeTreat(id)` | `claimedBy === id` | `worldTreat → null`, `claimedBy → null` |
| `consumeTreat(id)` | `claimedBy !== id` | no-op (called by wrong cat — treat already eaten) |

`TreatContext` state is **not** persisted to `localStorage`. On page reload, all treat state resets to `{ heldTreat: false, worldTreat: null, claimedBy: null }`.

`pickupTreat()` only succeeds when the player is empty-handed and `claimedBy === null`; it moves the treat from `WORLD` back to `HELD`. The treat's resting center is `TREAT_REST_HEIGHT` (0.19 world units) above the floor: its 0.14-unit radius plus the 0.05-unit bob amplitude keeps the sphere above the ground through its full animation.

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

R3F component. Placed at `[3, 0, 7]`. Low-poly gumball machine built from Three.js primitives — a sphere globe sitting on a cylinder stand, with a small coin-slot box.

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

R3F component. Returns `null` when `worldTreat` is `null`. Renders a small faceted sphere.

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
// Treat detection — runs only in IDLE or WANDER states
if (catState === 'IDLE' || catState === 'WANDER') {
  if (worldTreat !== null && claimedBy === null) {
    const dist = worldTreat.position.distanceTo(group.position)
    if (dist < TREAT_DETECTION_RADIUS) {
      claimTreat(def.id)
      setCatState('EAT')
      setTargetPos(worldTreat.position.clone())
    }
  }
}

// EAT state movement (mirrors WANDER movement logic)
if (catState === 'EAT') {
  if (worldTreat === null || claimedBy !== def.id) {
    // Treat was eaten by another cat or removed — bail out
    setCatState('IDLE')
    setTargetPos(null)
  } else if (targetPos) {
    const direction = new THREE.Vector3().subVectors(worldTreat.position, group.position)
    const distance = direction.length()
    if (distance <= TREAT_REACH_DISTANCE) {
      // Consume the treat
      consumeTreat(def.id)
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
const { worldTreat, claimedBy, claimTreat, consumeTreat } = useTreatContext()
```

The treat-related context values are read unconditionally (not gated on `found`) so the hook call order is stable. The `EAT` state logic below only acts when `found` is true, matching the guard that already exists for all other cat behavior.

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
  heldTreat: boolean                          // player is carrying a treat
  worldTreat: { position: THREE.Vector3 } | null  // treat dropped in scene
  claimedBy: string | null                    // cat id claiming the world treat
}

// Initial state (also reset on every page load)
const initialState: TreatState = {
  heldTreat: false,
  worldTreat: null,
  claimedBy: null,
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

The Treat Dispenser feature is primarily composed of UI rendering, React state transitions, and Three.js scene mutations. Most acceptance criteria are covered by targeted example-based tests. Two criteria — the treat drop position formula and the first-come claim exclusion — involve meaningful input variation and universal invariants, making them candidates for property-based testing.

### Property 1: Drop position is always a forward offset from the player

*For any* valid player world-space position and any normalized forward direction vector, calling `dropTreat(position, forward)` should produce a `worldTreat` whose position equals `position + forward * DROP_FORWARD_OFFSET`, regardless of where in the room the player is standing or which direction they face.

**Validates: Requirements 3.1, 3.2**

### Property 2: Treat claim is exclusive (first-come, first-served)

*For any* `claimedBy` value that is already set to a cat id, calling `claimTreat(otherCatId)` for any different cat id should leave `claimedBy` unchanged. The first claim always wins; no second cat can override it.

**Validates: Requirements 4.4**

### Property 3: Dropping when a WorldTreat already exists has no effect

*For any* existing `worldTreat` position, calling `dropTreat()` again (regardless of player position or forward vector) should leave `worldTreat.position` unchanged and `heldTreat` unchanged.

**Validates: Requirements 3.5**

---

## Error Handling

### Dispenser interaction while hands full

`TreatDispenser` displays an inline `<Billboard>` tooltip ("Hands full! 🐾") for 1.5 seconds when the player interacts while `heldTreat === true`. The tooltip uses `useRef` + `useFrame` countdown — no React state timer.

### Cat claim lost mid-EAT

If `worldTreat` becomes `null` or `claimedBy` changes away from this cat's id while the cat is in `EAT` state (i.e., another cat consumed it first despite the claim guard, or the treat was otherwise cleared), the cat immediately transitions back to `IDLE` in the next `useFrame` tick. This is a defensive guard; under normal operation the `consumeTreat(id)` guard (`claimedBy !== id → no-op`) prevents this race.

### Drop with no treat held

`dropTreat()` checks `heldTreat === true` before mutating state. If called without a held treat (e.g., if the F-key fires between a state update and the next render), it silently no-ops.

### Page reload / session loss

`TreatContext` initialises from `initialState` on every mount. No `localStorage` read or write. All in-flight treats are lost on reload — this is the specified behavior (Requirement 6.5).

### Audio context suspended

`playMeow()` checks `sharedAudioCtx.state === 'suspended'` and calls `resume()` before playing. The existing `meow.ts` already handles this; no new error handling needed for the eat reaction.

---

## Testing Strategy

The feature is primarily composed of React Context state transitions, R3F scene components, and DOM overlay UI — not pure data-transformation functions. The testing approach therefore emphasises example-based unit tests for state transitions and targeted integration tests for the scene interactions.

**PBT applicability**: Two pure state-transition functions (`dropTreat` and `claimTreat`) have universally-quantified invariants and cheap-to-generate inputs, making them appropriate for property-based testing. All other acceptance criteria are better served by example-based tests. See Correctness Properties above.

### Property-Based Tests (fast-check)

Use [fast-check](https://github.com/dubzzz/fast-check) for the two PBT-eligible properties.

```ts
// Feature: treat-dispenser, Property 1: Drop position is always a forward offset
// Feature: treat-dispenser, Property 2: Treat claim is exclusive
// Feature: treat-dispenser, Property 3: Dropping when WorldTreat exists has no effect
```

Each test generates 100+ random inputs via `fc.record` / `fc.float` / `fc.string` arbitraries against the pure reducer functions extracted from `TreatContext`.

### Unit Tests (Vitest + React Testing Library)

| Area | What to test |
| --- | --- |
| `TreatContext` | `dispenseTreat` idempotency (calling twice stays held), `dropTreat` guard (no treat held → no-op), `consumeTreat` guard (wrong cat id → no-op), initial state reset |
| `TreatDispenser` | Renders without error; material type is `MeshLambertMaterial`; both `onClick` and `onPointerDown` props present; tooltip appears when heldTreat is true |
| `WorldTreat` | Returns null when `worldTreat === null`; renders mesh when `worldTreat` is set; `castShadow` prop present; bob formula produces correct Y at known time values |
| `HUD` TreatHUD section | Icon + label appear when `heldTreat=true`, absent when false; label text is "F to drop" on desktop, "Tap to drop" on touch; aria-label is present |
| `Cat` EAT state | Transitions to EAT when within detection radius and unclaimed; bails to IDLE when worldTreat becomes null; consumeTreat called at reach distance |

### Integration Tests

- **Full treat loop**: Dispense → drop → cat walks to treat → eat reaction fires → worldTreat clears. Test against a minimal R3F scene using `@testing-library/react`.
- **F key drop**: `keydown` event with `code: 'KeyF'` while `heldTreat=true` calls `dropTreat`.
- **Tap drop**: `pointerdown` on TreatHUD icon calls `dropTreat`.
- **F key non-conflict**: `keydown` with `code: 'KeyF'` in `PlayerController` has no registered handler — confirm `KeyF` is not in `PlayerController`'s movement key map.
