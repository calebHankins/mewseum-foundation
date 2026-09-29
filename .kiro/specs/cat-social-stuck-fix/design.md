# Cat Social Stuck Fix — Bugfix Design

## Overview

Cats in the Found Foyer permanently lock together in SOCIAL state, clumping and disrupting the cozy-sanctuary feel. The root cause is a combination of six defects in `src/cats/Cat.tsx`: live-tracked social target position, unconstrained mutual-chase entry, no state timeout, ignored `socialFatigue` cooldown data, insufficient separation force, and an inverted collision vector that attracts cats instead of separating them. This design formalises the bug condition, defines correctness properties, and outlines the targeted changes required — all confined to `Cat.tsx`.

## Glossary

- **Bug_Condition (C)**: The set of per-frame cat states in which SOCIAL state will never self-terminate, causing permanent clumping.
- **Property (P)**: The desired guarantee that SOCIAL state always terminates within `SOCIAL_TIMEOUT` seconds and a per-partner cooldown is recorded.
- **Preservation**: All cat behaviour that must be unchanged by the fix — normal single-cat social approach, wander/idle cycling, pet cooldown, treat eating.
- **`catPositionsRegistry`**: Module-level `Record<string, THREE.Vector3>` shared by all `Cat` instances; written each frame to the cat's current world position.
- **`catSocialStateRegistry`**: New module-level `Record<string, boolean>` introduced by this fix; set `true` while a cat is in SOCIAL state so peers can detect mutual-lock before entering.
- **`socialSnapshotRef`**: New per-cat `useRef<THREE.Vector3 | null>` that stores the partner's position at the moment SOCIAL is entered, replacing the live registry lookup for approach destination.
- **`partnerCooldownsRef`**: New per-cat `useRef<Map<string, number>>` that tracks remaining cooldown seconds per partner ID, derived from `def.socialFatigue`.
- **`socialTimeoutRef`**: New per-cat `useRef<number>` elapsed-time counter for the SOCIAL state; force-exits to IDLE when it exceeds `SOCIAL_TIMEOUT`.
- **`SOCIAL_TIMEOUT`**: New constant (4 s) — longer than `SOCIAL_INTERACTION` (2.5 s) to allow normal completion, short enough to always escape a deadlock.

## Bug Details

### Bug Condition

The bug manifests when a cat enters SOCIAL state and one or more of the following sub-conditions holds simultaneously: (a) the approach target position is sourced live from `catPositionsRegistry` rather than a snapshot, so the destination never stabilises; (b) the chosen partner is already in SOCIAL state, creating a mutual-chase loop; (c) no timeout guard exists to force-exit SOCIAL; (d) `socialFatigue` is never read, so the same pair re-engages within 1.5 s after any brief separation; (e) collision repulsion is too weak (multiplier 1.5) to overcome the combined approach velocity of two cats both moving toward each other.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT:  X of type CatFrameState
          (catState, socialTarget, targetPos source, partnerCatState,
           socialFatigueTimer, elapsedInSOCIAL)
  OUTPUT: boolean

  RETURN (
    X.catState = 'SOCIAL'
    AND (
      X.targetPos IS live_catPositionsRegistry    // defect 1 — position drifts
      OR X.partnerCatState = 'SOCIAL'             // defect 2 — mutual lock
      OR X.elapsedInSOCIAL IS unbounded           // defect 3 — no timeout
      OR X.socialFatigueTimer = 0                 // defect 4 — no cooldown
    )
  )
END FUNCTION
```

### Examples

- **Mutual lock**: Dusty (drive 6) and Marmalade (drive 9) detect each other within the same `WANDER_CHANGE_DIR` window. Both pass their social-drive rolls and set `catState = 'SOCIAL'` targeting each other. Neither arrival condition ever satisfies because each target position keeps moving — both cats orbit each other indefinitely.
- **Live-position drift**: Inkblot enters SOCIAL targeting Pingu. Pingu is pushed sideways by collision repulsion each frame. Inkblot's `targetPos` is re-read from the registry each frame, so the destination always stays 0.5 m ahead of Pingu and arrival is never reached.
- **Immediate re-engagement**: Saffron briefly separates from Cali (pushed by repulsion). On the next `WANDER_CHANGE_DIR` tick (1.5 s later) Cali is still within `SOCIAL_RADIUS` and both cats re-enter SOCIAL with no cooldown preventing it.
- **Normal single approach (not a bug)**: Casper (drive 3) detects Juniper (drive 3) and rolls above its social chance (0.3). It skips social, wanders away — no bug condition.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A single cat that detects a nearby found cat in WANDER or IDLE state and passes its social-drive roll SHALL continue to enter SOCIAL state and move toward that partner.
- A cat that completes a social interaction without timeout SHALL continue to display the teal friend-heart (`♥`) and optionally play a meow.
- Cats SHALL continue to wander, idle, and change direction on `WANDER_CHANGE_DIR` ticks when no social interaction is in progress.
- Pet COOLDOWN state SHALL continue to keep the cat near the player and block SOCIAL entry until the pet cooldown expires.
- EAT state SHALL continue to be uninterrupted by social behavior; treat claim/consume logic is unchanged.
- Wall-boundary and collision-repulsion forces SHALL continue to prevent cats from overlapping or leaving the room during all states.

**Scope:**
All inputs where `isBugCondition` returns false — single-cat social approaches against IDLE/WANDER partners, non-social wander cycles, pet interactions, treat eating — must be completely unaffected by this fix. The only observable change for normal social interactions is that a snapshot position is used as the destination (not the live registry), which is imperceptible to the player.

## Hypothesized Root Cause

Based on the bug description and code review of `Cat.tsx`:

1. **Live Position Tracking (line ~280)**: The SOCIAL state block reads `catPositionsRegistry[socialTarget]` each frame to validate the partner still exists but never actually uses a stable approach destination — the `targetPos` set at SOCIAL entry via `setTargetPos(socialPos.clone().add(...))` should be fixed, but a subsequent `catPositionsRegistry` read in the same block means the movement direction is recomputed against the live registry position rather than the snapshotted `targetPos`. The arrival check (`distance > 0.5`) compares `targetPos` to `group.position` correctly, but only if `targetPos` was truly snapshotted and not refreshed. On closer inspection, `targetPos` is set once at entry — the real culprit is that the partner cat is also moving (via its own state machine) so the 0.5 m arrival radius is never stable.

2. **No Partner-State Guard (line ~240)**: When selecting a social partner, the code only checks `isCatFound(id)` — it does not check whether that partner is already in SOCIAL state. Any two high-drive cats in WANDER range can simultaneously select each other and both call `setCatState('SOCIAL')`.

3. **No SOCIAL_TIMEOUT (line ~280 block)**: The SOCIAL state block has no elapsed-time guard. `interactionTimer` only increments after arrival (`distance <= 0.5`), which never happens in a deadlock, so the state runs forever.

4. **socialFatigue Unused (line ~240)**: `CAT_REGISTRY` entries carry `socialFatigue` values (8–30 s) but the SOCIAL selection logic never consults them. After any separation, the same pair can re-enter SOCIAL on the very next `WANDER_CHANGE_DIR` tick.

5. **Weak Separation Impulse (line ~145)**: Collision repulsion uses `WANDER_SPEED * 1.5 * delta` (~0.027 m/frame at 60 fps). Two cats each approaching at `WANDER_SPEED * 0.7` add 0.021 m/frame net closure — the repulsion (0.027 m) barely exceeds approach velocity and any frame-timing variation makes it insufficient.

6. **Inverted Collision Direction**: `toOther` points from the current cat toward the other cat, but the collision code added that vector to the movement force. This attracted cats instead of separating them. At exact overlap, normalization also produced no direction, leaving the cats locked together.

## Correctness Properties

Property 1: Bug Condition — SOCIAL State Always Terminates

_For any_ cat frame state where `isBugCondition` returns true (the cat is in SOCIAL state with a live target, a mutual partner, no timeout, or no cooldown), the fixed `useFrame` handler SHALL cause `catState` to transition out of SOCIAL within `SOCIAL_TIMEOUT` (4 s) and SHALL record a non-zero per-partner cooldown derived from `def.socialFatigue`, preventing immediate re-engagement.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation — Non-Buggy Cat Behavior Unchanged

_For any_ cat frame state where `isBugCondition` returns false (normal wander, idle, single-cat SOCIAL against an IDLE/WANDER partner, COOLDOWN, EAT), the fixed `useFrame` handler SHALL produce the same observable cat movement, state transitions, heart display, and meow triggers as the original handler, preserving all existing non-deadlock behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

**File**: `src/cats/Cat.tsx`

**New Constants:**

```ts
const SOCIAL_TIMEOUT = 4        // seconds before SOCIAL force-exits to IDLE
const SOCIAL_SEPARATION_MULT = 4 // multiplier for separation impulse in SOCIAL state
```

**New Module-Level Registry:**

```ts
// Tracks which cats are currently in SOCIAL state so peers can avoid mutual lock
const catSocialStateRegistry: Record<string, boolean> = {}
```

**New Per-Cat Refs (inside the Cat component, alongside existing refs):**

```ts
const socialSnapshotRef   = useRef<THREE.Vector3 | null>(null) // snapshotted target pos at SOCIAL entry
const partnerCooldownsRef = useRef<Map<string, number>>(new Map()) // partnerId → remaining cooldown seconds
const socialTimeoutRef    = useRef<number>(0) // elapsed time in current SOCIAL state
```

**Specific Changes:**

1. **Snapshot position at SOCIAL entry** — in the WANDER block where `setCatState('SOCIAL')` is called, also set `socialSnapshotRef.current` to a clone of `catPositionsRegistry[partnerId]` (with the random offset already applied). The `setTargetPos` call can be kept for compatibility but the SOCIAL movement block must read from `socialSnapshotRef.current` instead of recomputing from the live registry.

2. **Partner-state guard** — add a `catSocialStateRegistry[partnerId]` check before entering SOCIAL. If the partner is already in SOCIAL, skip and pick a new wander target instead. Set `catSocialStateRegistry[ownCatId] = true` when entering SOCIAL and `= false` when exiting (all exit paths: normal completion, timeout, transition out).

3. **Per-partner cooldown check** — before entering SOCIAL with a given partner, check `partnerCooldownsRef.current.get(partnerId) ?? 0 > 0`. If a cooldown is active, skip. On SOCIAL exit (both normal and timeout), record `partnerCooldownsRef.current.set(partnerId, def.socialFatigue ?? 15)`. Each frame in any state, decrement all active cooldown entries by `delta` and delete entries that reach ≤ 0.

4. **SOCIAL_TIMEOUT guard** — at the top of the SOCIAL state block, increment `socialTimeoutRef.current += delta`. If it exceeds `SOCIAL_TIMEOUT`, force-exit: `setCatState('IDLE')`, clear `socialTarget`, `socialSnapshotRef.current`, reset `socialTimeoutRef.current = 0`, set `catSocialStateRegistry[ownCatId] = false`, record partner cooldown.

5. **Stronger separation impulse in SOCIAL state** — in the collision-repulsion section (which runs for all states), when `catState === 'SOCIAL'` and `distance < COLLISION_RADIUS`, replace the `1.5` multiplier with `SOCIAL_SEPARATION_MULT` (4) for the offending pair. This makes the repulsion (~0.108 m/frame) comfortably exceed the approach velocity (~0.021 m/frame).

6. **Use snapshot for SOCIAL movement** — replace the direction vector calculation in the SOCIAL block from `targetPos` to `socialSnapshotRef.current` so movement is toward the stable snapshotted position, not a React state value that could lag.

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first run exploratory tests on unfixed code to surface counterexamples confirming the root causes, then verify the fix satisfies Property 1 and Property 2.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating the deadlock on unfixed code. Confirm each of the five root causes independently before applying the fix.

**Test Plan**: Construct minimal `CatFrameState` objects simulating two cats entering SOCIAL simultaneously, with live-tracked positions and no cooldown, and run the frame update logic. Observe that `catState` never exits SOCIAL after `SOCIAL_INTERACTION + ε` seconds.

**Test Cases**:
1. **Mutual-lock test**: Simulate two cats with `catState = 'SOCIAL'`, each targeting the other's live position. Advance time by 10 s. Assert `catState` is still `'SOCIAL'` on unfixed code (confirming the bug), expect `'IDLE'` on fixed code.
2. **Live-position drift test**: Set `targetPos` to a snapshot but update `catPositionsRegistry[partnerId]` each frame tick. Confirm arrival condition never satisfies on unfixed code.
3. **Immediate re-engagement test**: Complete a normal SOCIAL interaction (arrival reached), then immediately re-run WANDER logic with the same partner within `SOCIAL_RADIUS`. Confirm re-entry on unfixed code, blocked by cooldown on fixed code.
4. **Weak-repulsion test**: Place two cats at `COLLISION_RADIUS - ε` distance, both in SOCIAL state approaching each other. Sum their net displacement over one frame. Confirm net closure on unfixed code, net separation on fixed code.

**Expected Counterexamples**:
- On unfixed code, `catState` remains `'SOCIAL'` indefinitely for mutual-lock pairs.
- `interactionTimer` never advances past 0 in a deadlock scenario.
- Same-pair re-entry occurs within 1.5 s of any forced separation.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed handler produces the expected behavior.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result := updateCatFrame_fixed(X, delta=0.016, iterations=250) // ~4s at 60fps
  ASSERT result.catState ≠ 'SOCIAL'
  ASSERT result.partnerCooldowns.get(partnerId) > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed handler produces the same observable result as the original.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT updateCatFrame_original(X) = updateCatFrame_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking. The input space (cat position, wander target, nearby cats, state, delta) is large and manual unit tests would miss edge cases. PBT generates varied scenarios automatically and provides strong guarantees.

**Test Cases**:
1. **Single-cat SOCIAL preservation**: Cat in SOCIAL state with partner in IDLE/WANDER — approach, arrival, heart display, and meow sequence must be identical to original.
2. **Wander/idle cycle preservation**: Cat in WANDER with no nearby cats — `WANDER_CHANGE_DIR` timing, random target selection, and IDLE transition must match original.
3. **Pet COOLDOWN preservation**: Cat in COOLDOWN — timer decrement, stay-near-player movement, and IDLE transition on expiry must match original.
4. **EAT state preservation**: Cat in EAT with a claimed treat — approach, consume, and COOLDOWN entry must match original, with no social interruption.

### Unit Tests

- Test that `catSocialStateRegistry[id]` is set to `true` on SOCIAL entry and `false` on all SOCIAL exit paths (normal, timeout).
- Test that `socialSnapshotRef.current` is set at SOCIAL entry and not updated during the SOCIAL state.
- Test that `partnerCooldownsRef` records the correct cooldown on SOCIAL exit and blocks re-entry within that window.
- Test that `socialTimeoutRef` increments each frame and forces IDLE at `SOCIAL_TIMEOUT`.
- Test edge cases: partner leaves `catPositionsRegistry` mid-SOCIAL (force-exit to IDLE), cat petted while in SOCIAL (COOLDOWN overrides), `socialFatigue = 0` edge (minimum 1 s cooldown).

### Property-Based Tests

- Generate random pairs of cat states; if both are in SOCIAL targeting each other, fixed code must exit both within 4 s regardless of positions.
- Generate random `(catState, partnerState, elapsedTime)` triples where `isBugCondition` is false; verify frame output is identical between original and fixed handlers.
- Generate random `socialDrive` / `socialFatigue` combos; verify cooldown recorded on exit equals `def.socialFatigue ?? 15` in all cases.

### Integration Tests

- Spawn all 10 cats found in the scene; run 60 s of simulated frames; assert no cat is in SOCIAL state for more than `SOCIAL_TIMEOUT` continuously.
- Verify that high-drive pairs (Pingu + Marmalade) complete at least two separate social interactions separated by their respective `socialFatigue` windows.
- Confirm the teal friend-heart appears and disappears correctly during a successful (non-deadlocked) interaction.
- Confirm wander, idle, pet, and eat behaviors are unaffected when social interactions are disabled entirely (`socialDrive = 0` for all cats).
