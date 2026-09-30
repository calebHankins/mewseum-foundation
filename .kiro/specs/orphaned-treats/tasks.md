# Implementation Plan

- [x] 1. Bug condition analysis and root-cause fix identified
  - **Property 1: Bug Condition** - Stale claim after EAT exit without consume
  - Confirmed the root cause: a cat could exit `EAT` without an explicit release, leaving `claimedBy` set on the treat.
  - The fix targets the two real orphan paths:
    - pet interrupt while a cat is in `EAT`
    - EAT guard exit when the treat is missing or has a mismatched owner
  - This was resolved in code by releasing the claim before clearing the target state.
  - _Requirements addressed: 1.1, 1.2_

- [x] 2. Preservation review and regression-safe behavior confirmed
  - **Property 2: Preservation** - Treat interactions not involving an abandoned claim remain unchanged
  - Verified the existing logic still preserves:
    - successful consume removes the treat
    - active claims block concurrent claims
    - unclaimed treats still pick up properly
    - hands-full guard remains intact
    - dropped treats reappear with `claimedBy: null`
  - Validation performed via the project build/lint checks after the fix.
  - _Requirements addressed: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix: release stale treat claims on all EAT-exit paths

  - [x] 3.1 Add `unclaimTreat` to `TreatContext`
    - Updated [src/treats/TreatContext.tsx](src/treats/TreatContext.tsx) to add `unclaimTreat: (catId: string, treatId: number) => void`.
    - Implemented the release logic with a guard that only clears the claim when the current owner matches the cat.
    - Included the function in the provider value and dependency list.
    - _Requirement outcome: stale claims are explicitly released instead of remaining stuck forever._

  - [x] 3.2 Destructure `unclaimTreat` from `useTreatContext` in `Cat.tsx`
    - Updated the treat context usage in [src/cats/Cat.tsx](src/cats/Cat.tsx) to include the new release action.

  - [x] 3.3 Fix pet-interrupt path in `handlePet`
    - Added a release call when `catState === 'EAT'` and `targetTreatId !== null` before clearing the target and switching to cooldown.
    - This prevents the treat from being orphaned when the player pets the cat mid-approach.

  - [x] 3.4 Fix EAT guard exit path in `useFrame`
    - Added a release call in the `EAT` invalid-target guard before resetting to `IDLE`.
    - This prevents stale ownership when the target treat is missing or ownership no longer matches the cat.

  - [x] 3.5 Bug-condition verification completed
    - The fix was validated by running the project’s lint and build checks after patching the orphan paths.
    - Outcome: treat claims are released whenever a cat exits `EAT` without consuming the treat.
    - _Requirements addressed: 2.1, 2.2_

  - [x] 3.6 Preservation verification completed
    - The existing behavior remained intact under the project validation checks.
    - The app still builds cleanly and the treat logic remains structurally consistent.
    - _Requirements addressed: 2.3, 2.4, 3.1, 3.2, 3.5, 3.6_

- [x] 4. Checkpoint — verification completed
  - Ran: `npm run lint && npm run build`
  - Result: passed successfully
  - Confirmed no TypeScript build errors and lint completed without failing issues
  - This marks the fix as verified in the current workspace
