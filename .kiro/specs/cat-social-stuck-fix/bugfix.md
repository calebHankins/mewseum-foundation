# Bugfix Requirements Document

## Introduction

Cats in the Found Foyer permanently lock together and cannot separate. Once two cats enter
SOCIAL state at the same time targeting each other, they enter a mutual-chase deadlock:
the arrival check never satisfies because the target position is continuously updated
from the live registry, the SOCIAL state has no timeout, `socialFatigue` is never read
so there is no cooldown preventing immediate re-engagement, and the collision repulsion
is too weak to break a deadlock where both cats are actively chasing. The result is cats
that clump permanently, disrupting navigation and the overall cozy-sanctuary feel.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a cat enters SOCIAL state, THEN the system continuously reads the target cat's
    live position from `catPositionsRegistry` each frame as the social target, so the
    approach destination never stops moving.

1.2 WHEN two cats detect each other and both pass their individual social-drive checks
    within the same WANDER_CHANGE_DIR window, THEN the system allows both cats to enter
    SOCIAL state simultaneously targeting each other, creating a mutual-chase loop.

1.3 WHEN a cat in SOCIAL state chases a live target that keeps moving due to collision
    repulsion, THEN the arrival condition (`distance > 0.5`) is never satisfied, so
    `interactionTimer` never increments and the state never exits.

1.4 WHEN the SOCIAL state never exits, THEN the system advances `wanderTimerRef` in
    WANDER state only — SOCIAL state does not advance it — so the wander timer stalls
    and cannot trigger the next direction-change or IDLE transition.

1.5 WHEN a social interaction finishes (or is interrupted), THEN the system has no
    cooldown preventing the same two cats from re-entering SOCIAL state immediately on
    the next WANDER_CHANGE_DIR tick, so the stuck pattern re-triggers within 1.5 seconds.

1.6 WHEN two cats are overlapping inside the collision radius, THEN the system applies
    only a soft per-frame repulsion multiplied by 1.5 — insufficient to overcome the
    combined approach velocity of two cats both actively moving toward each other.

### Expected Behavior (Correct)

2.1 WHEN a cat enters SOCIAL state, THEN the system SHALL snapshot the target cat's
    position at the moment of entry and use that fixed snapshot as the approach
    destination, so the target position does not change while the cat is approaching.

2.2 WHEN a cat selects a social partner that is already in SOCIAL state, THEN the system
    SHALL skip the social approach for the selecting cat (the receiving cat stays put),
    preventing mutual-chase deadlocks where both cats chase each other simultaneously.

2.3 WHEN a cat in SOCIAL state reaches within arrival distance of its fixed target
    position, THEN the system SHALL increment `interactionTimer` and transition to IDLE
    after `SOCIAL_INTERACTION` seconds, regardless of other cats' movements.

2.4 WHEN a cat has been in SOCIAL state for longer than a defined maximum duration
    (`SOCIAL_TIMEOUT`), THEN the system SHALL force-exit to IDLE even if the arrival
    condition was never satisfied, ensuring the state always terminates.

2.5 WHEN a social interaction completes or times out, THEN the system SHALL record the
    partner's id and start a per-cat cooldown timer derived from the cat's `socialFatigue`
    value, during which that specific partner cannot be selected again for a social
    approach.

2.6 WHEN two cats are within the collision radius and at least one is in SOCIAL state,
    THEN the system SHALL apply a decisive separation impulse strong enough to overcome
    the approach velocity and visibly push the cats apart within one to two frames.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a single cat detects a nearby found cat that is in WANDER or IDLE state and
    passes its social-drive roll, THEN the system SHALL CONTINUE TO transition that cat
    to SOCIAL state and move it toward the partner.

3.2 WHEN a cat completes a social interaction without any timeout, THEN the system SHALL
    CONTINUE TO display the teal friend-heart (`♥`) and optionally play a meow during
    the interaction window.

3.3 WHEN a cat's `socialFatigue` cooldown for a given partner expires, THEN the system
    SHALL CONTINUE TO allow that cat to initiate a new social interaction with that
    partner on subsequent WANDER_CHANGE_DIR ticks.

3.4 WHEN a cat is in COOLDOWN state after being pet by the player, THEN the system SHALL
    CONTINUE TO stay near the player and not enter SOCIAL state until the pet cooldown
    expires.

3.5 WHEN a cat is in EAT state pursuing a claimed treat, THEN the system SHALL CONTINUE
    TO move toward the treat and complete the eat interaction without social behavior
    interrupting it.

3.6 WHEN cats wander normally without triggering social interactions, THEN the system
    SHALL CONTINUE TO apply wall-boundary and collision-repulsion forces to prevent
    cats from overlapping or leaving the room.

3.7 WHEN a cat is in WANDER state and no nearby found cat is detected, THEN the system
    SHALL CONTINUE TO pick a new random wander target after WANDER_CHANGE_DIR seconds.

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies inputs that trigger the stuck state:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type CatFrameState
         (catState, socialTarget, targetPos, partnerCatState, socialFatigueTimer)
  OUTPUT: boolean

  RETURN (
    X.catState = 'SOCIAL'
    AND X.targetPos is live (not a snapshot)
    AND (
      X.partnerCatState = 'SOCIAL'   // mutual lock
      OR X.socialFatigueTimer = 0    // no cooldown — immediate re-engagement possible
      OR X.elapsedInSOCIAL = unbounded // no timeout guard
    )
  )
END FUNCTION
```

**Property: Fix Checking** — for all buggy inputs the fixed code must exit SOCIAL:

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← updateCatFrame'(X)
  ASSERT result.catState ≠ 'SOCIAL' WITHIN SOCIAL_TIMEOUT seconds
  ASSERT result.socialFatigueTimer[partnerId] > 0  // cooldown started
END FOR
```

**Property: Preservation Checking** — non-buggy inputs are unaffected:

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT updateCatFrame(X) = updateCatFrame'(X)
END FOR
```
