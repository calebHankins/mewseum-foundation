# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale Claim After EAT Exit Without Consume
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the two orphan paths produce stale `claimedBy` values
  - **Scoped PBT Approach**: The bug is deterministic on two concrete paths, so scope the property to those paths for reproducibility
  - Set up a minimal `TreatContext` state with one unclaimed treat (e.g., `{ id: 1, claimedBy: null }`).
  - **Path A — Pet interrupt**: call `claimTreat("dusty", 1)` to simulate cat entering EAT state. Then simulate `handlePet` firing (call `setCatState('COOLDOWN')` + `setTargetTreatId(null)` without calling `unclaimTreat`). Assert `worldTreats[0].claimedBy === null` — this will FAIL on unfixed code, proving the stale-claim bug.
  - **Path B — EAT guard exit**: call `claimTreat("cinder", 1)`. Simulate the EAT guard (`!targetTreat || targetTreat.claimedBy !== def.id`) transitioning to `IDLE` without unclaiming. Assert `worldTreats[0].claimedBy === null` — this will also FAIL on unfixed code.
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `worldTreats[0].claimedBy === "dusty"` after pet interrupt; `worldTreats[0].claimedBy === "cinder"` after guard exit)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Treat Interactions Not Involving an Abandoned Claim Are Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for cases where `isBugCondition` returns false (i.e., the cat is actively in EAT state pursuing the treat, or no EAT exit without consume has occurred)
  - **Obs 1 — Successful consume**: cat reaches treat within `TREAT_REACH_DISTANCE`, `consumeTreat("dusty", 1)` fires → treat is removed from `worldTreats`. Observe treat array length decreases by 1 and treat ID is absent.
  - **Obs 2 — Active-claim mutual exclusion**: cat A holds `claimedBy: "dusty"` on treat #1; cat B calls `claimTreat("cinder", 1)` → `claimedBy` remains `"dusty"` (no-op). Observe no change.
  - **Obs 3 — Player pickup of unclaimed treat**: `claimedBy: null`; player calls `pickupTreat(1)` → treat moves to `heldTreat` and is removed from `worldTreats`. Observe treat absent, `heldTreat` non-null.
  - **Obs 4 — Hands-full guard**: player already holds a treat; calls `pickupTreat(1)` → state unchanged. Observe no change.
  - **Obs 5 — Drop treat**: player calls `dropTreat(pos, forward)` → treat appears in `worldTreats` with `claimedBy: null`. Observe new entry with `claimedBy === null`.
  - Write property-based tests: for all treat states where the cat is still in EAT and actively pursuing (`isBugCondition` = false), the five behaviors above hold across any treat ID, color, position, and cat ID combination.
  - Use a PBT library (e.g., `fast-check`) to generate random treat IDs, positions, and cat IDs for stronger guarantees.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix: release stale treat claims on all EAT-exit paths

  - [ ] 3.1 Add `unclaimTreat` to `TreatContext`
    - In `src/treats/TreatContext.tsx`, extend `TreatContextValue` interface with `unclaimTreat: (catId: string, treatId: number) => void`
    - Implement with `useCallback`:
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
    - Add `unclaimTreat` to the `useMemo` value object and its dependency array
    - _Bug_Condition: `isBugCondition(cat, worldTreats)` where `cat.catState !== 'EAT'` AND treat still exists with `claimedBy === cat.id`_
    - _Expected_Behavior: after `unclaimTreat(catId, treatId)`, `worldTreats.find(t => t.id === treatId).claimedBy === null`_
    - _Preservation: guard `if (!treat || treat.claimedBy !== catId) return current` ensures calling with wrong owner or non-existent treat is a no-op_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Destructure `unclaimTreat` from `useTreatContext` in `Cat.tsx`
    - In `src/cats/Cat.tsx`, update the destructuring line:
      ```ts
      const { worldTreats, claimTreat, consumeTreat, unclaimTreat } = useTreatContext()
      ```
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Fix pet-interrupt path in `handlePet`
    - In `handlePet` (`useCallback`), add an `unclaimTreat` call guarded by `catState === 'EAT'` before `setTargetTreatId(null)`:
      ```ts
      if (catState === 'EAT' && targetTreatId !== null) {
        unclaimTreat(def.id, targetTreatId)
      }
      setTargetTreatId(null)
      setTargetPos(null)
      ```
    - Add `catState`, `targetTreatId`, and `unclaimTreat` to `handlePet`'s dependency array
    - _Bug_Condition: `handlePet` fires while `catState === 'EAT'` and `targetTreatId !== null`_
    - _Expected_Behavior: treat's `claimedBy` set to `null` before transitioning to `COOLDOWN`_
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ] 3.4 Fix EAT guard exit path in `useFrame`
    - In the `EAT` branch of `useFrame`, locate the guard: `if (!targetTreat || targetTreat.claimedBy !== def.id)`. Add `unclaimTreat` call before transitioning to `IDLE`:
      ```ts
      if (!targetTreat || targetTreat.claimedBy !== def.id) {
        if (targetTreatId !== null) unclaimTreat(def.id, targetTreatId)
        setCatState('IDLE')
        setTargetPos(null)
        setTargetTreatId(null)
      }
      ```
    - _Bug_Condition: EAT guard detects missing treat or `claimedBy` mismatch while `targetTreatId !== null`_
    - _Expected_Behavior: `unclaimTreat` called before state transitions to `IDLE`, returning treat to available pool_
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stale Claim After EAT Exit Without Consume
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: both Path A (pet interrupt) and Path B (EAT guard exit) must leave `claimedBy === null`
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms both orphan paths are fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Treat Interactions Not Involving an Abandoned Claim Are Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in consume, mutual-exclusion, pickup, hands-full, and drop behaviors)
    - Confirm all five observed behaviors still hold after the fix

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite (`npm run lint` + all unit/property tests)
  - Confirm zero TypeScript errors (`tsc --noEmit`)
  - Confirm lint passes with zero warnings
  - Ensure all tests pass; ask the user if questions arise
