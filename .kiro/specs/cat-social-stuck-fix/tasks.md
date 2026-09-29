# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - SOCIAL State Never Terminates (Mutual-Lock Deadlock)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating that a cat in SOCIAL state targeting a moving partner never exits
  - **Scoped PBT Approach**: Scope the property to the concrete mutual-lock case: two cats both entering SOCIAL, each targeting the other's live position, advanced 250+ frames (~4 s at 60 fps)
  - Set up a minimal `CatFrameState` harness that simulates the `useFrame` logic from `Cat.tsx` without React — two cat objects, each with `catState = 'SOCIAL'`, targeting the other's live `catPositionsRegistry` entry
  - Each simulated frame: update both cats' positions toward each other's live registry entry (arrival threshold 0.5 m), do NOT snapshot — mirror the current unfixed code path
  - Advance 250 iterations (delta = 0.016); assert that at least one cat's `catState` is still `'SOCIAL'` (confirming the deadlock)
  - Also assert `interactionTimer` remains at 0 (arrival never reached), confirming the root cause
  - Run test on UNFIXED `Cat.tsx` — **EXPECTED OUTCOME**: Test PASSES (the assertion that state is still SOCIAL holds — the bug exists)
  - Document the counterexample: "After 4 s of simulation, both cats remain in SOCIAL state indefinitely; interactionTimer never advances"
  - Mark task complete when test is written, run, and the deadlock counterexample is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Cat Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run the UNFIXED code for non-buggy inputs, observe outputs, then write assertions
  - **Observation targets** (all cases where `isBugCondition` returns false):
    - Single-cat SOCIAL: cat in SOCIAL with partner in IDLE — partner position is static; observe that arrival IS reached within 0.5 m and `interactionTimer` advances to `SOCIAL_INTERACTION` (2.5 s), then state transitions to IDLE
    - Wander/idle cycle: cat in WANDER with no nearby cats — observe that after `WANDER_CHANGE_DIR` (1.5 s) a new random target is selected and state stays WANDER
    - Pet COOLDOWN: cat in COOLDOWN with `cooldownTimer > 0` — observe timer decrements by `delta` each frame; at 0 the state does not auto-transition (stays COOLDOWN until next IDLE/WANDER pick)
    - EAT state: cat in EAT approaching a claimed treat — observe movement toward treat and `consumeTreat` call when `distance <= TREAT_REACH_DISTANCE`
  - Write property-based tests covering the input space: for all `catState ∈ {WANDER, IDLE, COOLDOWN, EAT}` (not SOCIAL against an already-SOCIAL partner), the observable outputs match the observed baseline
  - Verify these tests PASS on UNFIXED code before moving on
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix SOCIAL state deadlock in `src/cats/Cat.tsx`

  - [ ] 3.1 Add new constants and module-level social-state registry
    - Add `const SOCIAL_TIMEOUT = 4` (seconds before force-exit) directly below the existing constant block
    - Add `const SOCIAL_SEPARATION_MULT = 4` (stronger repulsion multiplier for SOCIAL state) in the same block
    - Add module-level `const catSocialStateRegistry: Record<string, boolean> = {}` directly below the existing `catPositionsRegistry` declaration
    - _Bug_Condition: isBugCondition includes `X.elapsedInSOCIAL IS unbounded` (no timeout) and weak repulsion — these constants address defects 3 and 5_
    - _Requirements: 2.4, 2.6_

  - [ ] 3.2 Add per-cat refs inside the Cat component
    - Add `const socialSnapshotRef = useRef<THREE.Vector3 | null>(null)` alongside existing refs — stores partner position snapshot at SOCIAL entry
    - Add `const partnerCooldownsRef = useRef<Map<string, number>>(new Map())` — tracks remaining cooldown seconds per partner ID, derived from `def.socialFatigue`
    - Add `const socialTimeoutRef = useRef<number>(0)` — elapsed-time counter for current SOCIAL state
    - _Bug_Condition: isBugCondition includes `X.socialFatigueTimer = 0` (no cooldown) and `X.targetPos IS live` (no snapshot) — these refs address defects 1 and 4_
    - _Requirements: 2.1, 2.5_

  - [ ] 3.3 Add per-frame partner cooldown tick (runs every frame, all states)
    - In the `useFrame` callback, just before the `// ── Wandering, social, and treat behavior` section, add a loop that iterates `partnerCooldownsRef.current` entries
    - Decrement each entry by `delta`; delete entries whose value falls to ≤ 0
    - This ensures cooldown timers count down regardless of the cat's current state
    - _Bug_Condition: isBugCondition includes `X.socialFatigueTimer = 0` — without this tick, `socialFatigue` is never consumed after re-entry is blocked_
    - _Requirements: 2.5, 3.3_

  - [ ] 3.4 Strengthen collision repulsion for SOCIAL state
    - In the existing collision repulsion block (`// ── Collision Physics Check`), locate the line `group.position.x += collisionVector.x * WANDER_SPEED * 1.5 * delta`
    - Replace the hard-coded `1.5` multiplier with a conditional: use `SOCIAL_SEPARATION_MULT` (4) when `catState === 'SOCIAL'`, otherwise keep `1.5`
    - Apply the same conditional to the Z component line
    - This makes repulsion (~0.108 m/frame) comfortably exceed approach velocity (~0.021 m/frame) in SOCIAL state
    - _Bug_Condition: isBugCondition includes weak repulsion (defect 5) — 1.5× is insufficient to overcome combined approach velocity_
    - _Expected_Behavior: 2.6 — decisive separation impulse within one to two frames_
    - _Requirements: 2.6_

  - [ ] 3.5 Fix SOCIAL state entry in the WANDER block
    - Locate the `if (shouldSocialize)` branch inside the `catState === 'WANDER'` block where `setCatState('SOCIAL')` is called
    - Add guard 1: before entering SOCIAL, check `catSocialStateRegistry[partnerId]` — if `true`, skip the social approach entirely (pick a new wander target instead), preventing mutual-lock
    - Add guard 2: check `(partnerCooldownsRef.current.get(partnerId) ?? 0) > 0` — if a cooldown is active for this partner, skip the social approach
    - Add snapshot: set `socialSnapshotRef.current` to a clone of `catPositionsRegistry[partnerId]` plus the same random offset already applied to `targetPos`
    - Set `catSocialStateRegistry[ownCatId] = true` immediately after confirming SOCIAL entry
    - _Bug_Condition: isBugCondition includes `X.partnerCatState = 'SOCIAL'` (mutual lock, defect 2) and `X.socialFatigueTimer = 0` (no cooldown, defect 4)_
    - _Expected_Behavior: 2.2 — partner already in SOCIAL causes skip; 2.5 — cooldown blocks re-entry_
    - _Preservation: 3.1 — single-cat SOCIAL against IDLE/WANDER partner must still enter SOCIAL normally_
    - _Requirements: 2.2, 2.5, 3.1_

  - [ ] 3.6 Fix SOCIAL state body: timeout guard, snapshot movement, normal-exit cleanup
    - At the top of the `catState === 'SOCIAL'` block, increment `socialTimeoutRef.current += delta`
    - Add timeout exit: if `socialTimeoutRef.current >= SOCIAL_TIMEOUT`, force-exit — call `setCatState('IDLE')`, `setSocialTarget(null)`, `setTargetPos(null)`, clear `socialSnapshotRef.current = null`, reset `socialTimeoutRef.current = 0`, set `catSocialStateRegistry[ownCatId] = false`, record `partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)`, then `return` to skip the rest of the SOCIAL block
    - Replace the movement direction calculation: instead of `subVectors(targetPos, group.position)`, use `subVectors(socialSnapshotRef.current, group.position)` so movement tracks the stable snapshotted position, not a drifting live target
    - On normal interaction completion (inside the `setInteractionTimer` callback, when `next >= SOCIAL_INTERACTION`): set `catSocialStateRegistry[ownCatId] = false`, record `partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)`, clear `socialSnapshotRef.current = null`, reset `socialTimeoutRef.current = 0`
    - Guard against null snapshot: if `socialSnapshotRef.current` is null at the top of the SOCIAL block (before the timeout check), force-exit to IDLE and clear registry/refs
    - _Bug_Condition: isBugCondition includes `X.targetPos IS live` (defect 1), `X.elapsedInSOCIAL IS unbounded` (defect 3), `X.socialFatigueTimer = 0` (defect 4)_
    - _Expected_Behavior: 2.1 — snapshot destination; 2.3 — arrival terminates correctly; 2.4 — SOCIAL_TIMEOUT forces IDLE; 2.5 — cooldown recorded on exit_
    - _Preservation: 3.2 — friend-heart and meow during normal (non-deadlocked) interaction must still work_
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 3.2_

  - [ ] 3.7 Audit all remaining SOCIAL exit paths for registry/ref cleanup
    - Search `Cat.tsx` for every `setCatState(...)` call that transitions OUT of SOCIAL (e.g. pet handler calling `setCatState('COOLDOWN')`, EAT state entry overriding SOCIAL)
    - For each such path, ensure: `catSocialStateRegistry[ownCatId] = false`, `socialSnapshotRef.current = null`, `socialTimeoutRef.current = 0`; record partner cooldown if `socialTarget` is non-null at that point
    - Specifically check the `handlePet` callback — when COOLDOWN is entered from SOCIAL, the registry must be cleared
    - _Expected_Behavior: registry false on all exit paths prevents stale "partner is in SOCIAL" reads by other cats_
    - _Preservation: 3.4 — COOLDOWN state behavior must be unaffected; 3.5 — EAT state must not be disrupted_
    - _Requirements: 2.2, 3.4, 3.5_

  - [ ] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - SOCIAL State Always Terminates
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 asserts that after ~4 s of simulation, mutual-lock cats exit SOCIAL — this should now PASS
    - Run the bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms the deadlock bug is fixed — cats exit SOCIAL within `SOCIAL_TIMEOUT`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Cat Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — wander/idle, single-cat SOCIAL, COOLDOWN, EAT all behave identically to unfixed baseline)
    - Confirm all tests still pass after fix

- [ ] 4. Checkpoint — Ensure all tests pass and build is clean
  - Run `npm run build` — must complete with zero TypeScript errors and zero Vite errors
  - Run `npm run lint` — must complete with zero ESLint warnings or errors
  - Confirm the bug condition exploration test (task 1 / step 3.8) passes
  - Confirm all preservation tests (task 2 / step 3.9) pass
  - Verify no `any` types were introduced; all new refs are fully typed (`useRef<THREE.Vector3 | null>`, `useRef<Map<string, number>>`, `useRef<number>`)
  - Ask the user if any questions arise before marking complete
