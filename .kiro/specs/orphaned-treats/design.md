# Orphaned Treats Bugfix Design

## Overview

Treats dropped into the world can enter a permanently uninteractable "orphaned" state. A treat is orphaned when a cat claims it (setting `claimedBy` to the cat's ID) but then exits the `EAT` state through any path other than `consumeTreat` — leaving `claimedBy` permanently non-null. Because `claimTreat` has no counterpart release operation in `TreatContext`, there is no mechanism to return the treat to an unclaimed state once a cat abandons its pursuit.

The fix has two parts: add an `unclaimTreat(catId, treatId)` action to `TreatContext` that sets `claimedBy` back to `null`, then call it in every `EAT`-exit path in `Cat.tsx` before clearing `targetTreatId`.

## Glossary

- **Bug_Condition (C)**: A cat exits the `EAT` state without calling `consumeTreat` while `targetTreatId` still references a claimed treat.
- **Property (P)**: After any `EAT`-exit, the treat formerly targeted by the exiting cat SHALL have `claimedBy === null` in `worldTreats`.
- **Preservation**: All treat interactions that currently work correctly (successful eat, player pickup of unclaimed treats, mutual-exclusion claim guard) must continue to work after the fix.
- **`claimTreat(catId, treatId)`**: Action in `TreatContext` that sets `worldTreats[treatId].claimedBy = catId`. Only succeeds if `claimedBy` is currently `null`.
- **`consumeTreat(catId, treatId)`**: Action in `TreatContext` that removes the treat from `worldTreats`. Only succeeds if `claimedBy === catId`.
- **`unclaimTreat(catId, treatId)`** _(new)_: Action to be added that sets `claimedBy` back to `null`. Only operates if `claimedBy === catId`.
- **`targetTreatId`**: Local React state in `Cat.tsx` that tracks which treat ID the cat is currently pursuing.
- **`TREAT_DETECTION_RADIUS`**: 3.5 m — maximum distance at which a cat detects an unclaimed treat.
- **`TREAT_REACH_DISTANCE`**: 0.4 m — distance at which a cat successfully eats a treat.

## Bug Details

### Bug Condition

The bug manifests when a cat transitions out of `EAT` state via any path other than the successful `consumeTreat` call. There are two confirmed exit paths and one additional risk path:

1. **Pet interrupt** — `handlePet` sets `catState` to `'COOLDOWN'` and clears `targetTreatId` but never calls `unclaimTreat`.
2. **Guard check exit** — The `EAT` branch in `useFrame` detects `!targetTreat || targetTreat.claimedBy !== def.id` and transitions to `'IDLE'`, also without releasing the claim.
3. **No guard on external transitions** — Nothing prevents a future `setCatState` call from pulling the cat out of `EAT` without going through the guard.

**Formal Specification:**

```
FUNCTION isBugCondition(cat, worldTreats)
  INPUT: cat with fields { catState, targetTreatId, id }
         worldTreats array of { id, claimedBy }
  OUTPUT: boolean

  claimedTreat := worldTreats.find(t => t.id === cat.targetTreatId)

  RETURN cat.catState !== 'EAT'          -- cat has left EAT state
         AND claimedTreat !== undefined  -- treat still exists
         AND claimedTreat.claimedBy === cat.id  -- claim was never released
END FUNCTION
```

### Examples

- Cat "dusty" claims treat #3 and starts walking toward it. Player presses interact — `handlePet` fires, state → `COOLDOWN`, `targetTreatId` → `null`. Treat #3 now has `claimedBy: "dusty"` permanently. Neither the player nor any other cat can interact with it.
- Cat "cinder" claims treat #5. The treat is picked up by a concurrent player `pickupTreat` call (race condition is actually blocked by the `claimedBy !== null` guard in `pickupTreat`). The EAT guard detects `claimedBy !== def.id` and transitions to `IDLE` without unclaiming — treat #5 is left claimed with a stale owner.
- Cat "ash" claims treat #7 and eats it successfully via `consumeTreat` — treat is removed from `worldTreats`. This path is **not** affected (correct behavior, no orphan).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- A cat actively moving toward its claimed treat SHALL continue to block other cats from claiming that treat (requirement 3.2).
- A cat that successfully reaches a treat and calls `consumeTreat` SHALL continue to have the treat removed from `worldTreats` and trigger the eating animation (requirement 3.1).
- The player picking up an unclaimed treat (no `claimedBy`) SHALL continue to work (requirement 3.3).
- Dropping a treat SHALL continue to place it with `claimedBy: null` (requirement 3.4).
- A second cat attempting to claim an already-claimed treat SHALL continue to be blocked (requirement 3.5).
- The player holding a treat and attempting to pick up a world treat SHALL continue to be blocked (requirement 3.6).

**Scope:**

All code paths that do NOT involve a cat exiting `EAT` state without consuming the treat are unaffected. This includes all mouse/pointer interactions, player treat drop/pickup flows, and social cat behavior.

## Hypothesized Root Cause

1. **Missing `unclaimTreat` operation in `TreatContext`**: `claimTreat` has no inverse. Once `claimedBy` is set, only `consumeTreat` clears it — and only by removing the treat entirely. There is no path to set `claimedBy` back to `null` while keeping the treat in `worldTreats`.

2. **`handlePet` sets state imperatively without EAT cleanup**: `handlePet` calls `setCatState('COOLDOWN')` and `setTargetTreatId(null)` directly, bypassing any cleanup logic in the EAT branch of `useFrame`. Because the state transition happens outside the EAT handler, no claim release runs.

3. **EAT guard exits without releasing**: The `useFrame` EAT guard (`!targetTreat || targetTreat.claimedBy !== def.id`) correctly detects orphan conditions but only calls `setCatState('IDLE')` and `setTargetTreatId(null)` — not `unclaimTreat`. This is a defensive branch that handles external interference, but it makes the interference worse by not cleaning up.

4. **No centralized EAT-exit hook**: Because `Cat.tsx` uses direct `setCatState` calls rather than a transition function, there is no single place to attach "release claim on EAT exit" logic. Each exit site must be patched individually, or a helper function must encapsulate the combined state update.

## Correctness Properties

Property 1: Bug Condition — Claim Released on EAT Exit

_For any_ cat that exits `EAT` state without successfully consuming the treat (i.e., `isBugCondition` returns true), the fixed code SHALL call `unclaimTreat(catId, targetTreatId)` before clearing `targetTreatId`, resulting in `worldTreats[targetTreatId].claimedBy === null` so that the treat is immediately interactable again.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Active Claim Still Blocks Concurrent Access

_For any_ cat in `EAT` state that is actively pursuing a treat (i.e., `isBugCondition` returns false — the cat has not yet exited `EAT`), the fixed code SHALL continue to prevent other cats and the player from claiming or picking up that treat, preserving the mutual-exclusion guarantee.

**Validates: Requirements 3.2, 3.5**

## Fix Implementation

### Changes Required

**File 1: `src/treats/TreatContext.tsx`**

**Function**: `TreatProvider` / `TreatContextValue`

**Specific Changes:**

1. **Add `unclaimTreat` to the context interface**: Extend `TreatContextValue` with `unclaimTreat: (catId: string, treatId: number) => void`.

2. **Implement `unclaimTreat` with a `useCallback`**:
   ```ts
   const unclaimTreat = useCallback((catId: string, treatId: number) => {
     setState(current => {
       const treat = current.worldTreats.find(candidate => candidate.id === treatId)
       if (!treat || treat.claimedBy !== catId) return current
       return {
         ...current,
         worldTreats: current.worldTreats.map(candidate =>
           candidate.id === treatId ? { ...candidate, claimedBy: null } : candidate
         ),
       }
     })
   }, [])
   ```

3. **Add `unclaimTreat` to the `useMemo` value object and its dependency array**.

---

**File 2: `src/cats/Cat.tsx`**

**Specific Changes:**

1. **Destructure `unclaimTreat` from `useTreatContext`** alongside the existing `claimTreat` and `consumeTreat`.

2. **Extract an `exitEat` helper** (or patch each site inline) that combines the release + state clear:
   ```ts
   const exitEat = useCallback((reason: 'interrupt' | 'guard') => {
     if (targetTreatId !== null) {
       unclaimTreat(def.id, targetTreatId)
     }
     setTargetTreatId(null)
     setTargetPos(null)
   }, [def.id, targetTreatId, unclaimTreat])
   ```
   _Note: `setCatState` is called by the caller after `exitEat` since the destination state differs between interrupt (`COOLDOWN`) and guard (`IDLE`)._

3. **Pet interrupt path** (`handlePet`): call `unclaimTreat(def.id, targetTreatId)` before `setTargetTreatId(null)` when `catState === 'EAT'`. Since `handlePet` is a `useCallback`, add `catState`, `targetTreatId`, and `unclaimTreat` to its dependency array.

4. **EAT guard path** (`useFrame` EAT branch, `!targetTreat || targetTreat.claimedBy !== def.id`): add `unclaimTreat(def.id, targetTreatId)` before `setCatState('IDLE')` and `setTargetTreatId(null)`. `targetTreatId` is non-null here by definition (the cat entered `EAT` with a valid ID), so a non-null assertion or guard is safe.

5. **Successful consume path** (`consumeTreat` call at `TREAT_REACH_DISTANCE`): no change needed — `consumeTreat` already removes the treat from `worldTreats`, which implicitly removes any claim.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples on unfixed code to confirm the root cause, then verify the fix works and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Demonstrate the orphan bug on unfixed code and confirm that the two exit paths (`handlePet` and the EAT guard) are the source.

**Test Plan**: Write unit tests that simulate the claim → interrupt sequence against the raw `TreatContext` state updater functions and a mock `Cat` state machine. Run against unfixed code to observe the stale-claim state.

**Test Cases:**

1. **Pet-interrupt orphan** — Cat claims treat, state is set to `EAT`. Simulate `handlePet`. Assert `worldTreats[0].claimedBy` is still the cat's ID (demonstrates bug on unfixed code).
2. **Guard-exit orphan** — Cat claims treat, state is `EAT`. Remove the treat from context via an external state update (simulate race). Trigger the EAT guard check. Assert treat remains in `worldTreats` with a stale `claimedBy` (demonstrates guard does not clean up).
3. **Player pickup blocked** — After the pet-interrupt orphan, simulate player `pickupTreat`. Assert it returns without picking up (current state == blocked — this demonstrates the downstream effect).

**Expected Counterexamples:**

- After `handlePet`, `worldTreats[n].claimedBy` equals the cat ID, not `null`.
- After the guard-exit, `worldTreats[n].claimedBy` equals the cat ID, not `null`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code releases the claim.

**Pseudocode:**

```
FOR ALL (cat, worldTreats) WHERE isBugCondition(cat, worldTreats) DO
  result := applyEatExit_fixed(cat, worldTreats)
  ASSERT result.worldTreats.find(t => t.id === cat.targetTreatId).claimedBy === null
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**

```
FOR ALL (cat, worldTreats) WHERE NOT isBugCondition(cat, worldTreats) DO
  ASSERT original(cat, worldTreats) = fixed(cat, worldTreats)
END FOR
```

**Testing Approach**: Property-based testing is well-suited here because the treat system has a small, enumerable state space (treat count, claimed/unclaimed, cat states) and PBT will automatically cover combinations that manual tests miss.

**Test Cases:**

1. **Successful consume preservation** — Cat reaches treat within `TREAT_REACH_DISTANCE`, `consumeTreat` fires, treat is removed. Assert treat no longer exists in `worldTreats` and no stray claim lingers.
2. **Active-claim mutual exclusion preservation** — Cat A claims treat, cat B attempts `claimTreat` on same treat. Assert B's call is a no-op (`claimedBy` remains cat A's ID).
3. **Player pickup of unclaimed treat preservation** — Player calls `pickupTreat` on a treat with `claimedBy: null`. Assert treat moves to `heldTreat` and is removed from `worldTreats`.
4. **Hands-full guard preservation** — Player holds a treat and calls `pickupTreat`. Assert state is unchanged.
5. **Drop treat preservation** — Player calls `dropTreat`. Assert treat appears in `worldTreats` with `claimedBy: null`.

### Unit Tests

- Test `unclaimTreat` in isolation: calling with correct `catId` sets `claimedBy` to `null`; calling with wrong `catId` is a no-op; calling on a non-existent treat ID is a no-op.
- Test `handlePet` when cat is in `EAT` state: assert `unclaimTreat` is called before `targetTreatId` is cleared.
- Test the EAT guard branch: when treat is missing or `claimedBy` mismatches, assert `unclaimTreat` is called and state transitions to `IDLE`.

### Property-Based Tests

- Generate random sequences of `claimTreat` / `unclaimTreat` / `consumeTreat` calls and assert `claimedBy` is always either `null` or a currently-pursuing cat's ID — never stale.
- Generate random cat states and treat states; assert that after any `EAT`-exit transition the treat's `claimedBy` equals `null`.
- Generate many cat + treat configurations; assert `pickupTreat` always succeeds when `claimedBy === null` and always fails when `claimedBy !== null` (regardless of fix changes).

### Integration Tests

- Full flow: drop treat → cat detects and claims → pet cat mid-pursuit → assert treat is immediately pickable by player.
- Full flow: drop treat → cat A claims → cat A eats successfully → assert treat is fully removed.
- Full flow: drop treat → cat A claims → simulate race (treat momentarily removed externally) → EAT guard fires → assert treat (if re-added) is claimable by cat B.
