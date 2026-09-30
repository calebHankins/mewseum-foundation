# Bugfix Requirements Document

## Introduction

Treats dropped into the world can enter a permanently uninteractable "orphaned" state. Once orphaned, the treat is visually present but cats cannot pathfind to or eat it, and the player cannot pick it up. The root cause is that a cat's claim on a treat (`claimedBy` field) is never released when the claiming cat exits the `EAT` state through any path other than successfully consuming the treat — leaving the treat locked with a stale owner forever.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a cat claims a treat and is then pet before reaching it THEN the system transitions the cat to `COOLDOWN` state, clears `targetTreatId`, and leaves the treat in `worldTreats` with `claimedBy` permanently set to that cat's ID.

1.2 WHEN a cat in `EAT` state loses reference to its target treat (treat not found or `claimedBy` mismatch) THEN the system transitions the cat to `IDLE` state without releasing the claim, leaving the treat locked with no owner able to interact with it.

1.3 WHEN a claimed treat's `claimedBy` is non-null THEN the system blocks the player from picking it up, even if the claiming cat will never consume it.

1.4 WHEN a claimed treat's `claimedBy` is non-null THEN the system prevents any other cat from detecting or claiming the treat, even if the original claimant has abandoned it.

### Expected Behavior (Correct)

2.1 WHEN a cat that has claimed a treat transitions out of `EAT` state without consuming the treat THEN the system SHALL release the claim by calling `unclaimTreat` (or equivalent), setting `claimedBy` back to `null` so the treat becomes available again.

2.2 WHEN a cat in `EAT` state cannot find its target treat in `worldTreats` or finds the `claimedBy` field has changed THEN the system SHALL transition to `IDLE` AND release any claim it holds on that treat before clearing `targetTreatId`.

2.3 WHEN the player attempts to pick up a treat whose `claimedBy` owner cat is no longer actively pursuing it THEN the system SHALL allow the pickup to succeed (i.e., the treat must have been released to `null` first per 2.1).

2.4 WHEN a treat's claim is released and its `claimedBy` returns to `null` THEN the system SHALL make the treat detectable and claimable by any cat within `TREAT_DETECTION_RADIUS` again.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a cat successfully reaches a treat and `consumeTreat` is called THEN the system SHALL CONTINUE TO remove the treat from `worldTreats` and trigger the cat's eating animation and growth effect.

3.2 WHEN a cat is in `EAT` state and actively moving toward its claimed treat THEN the system SHALL CONTINUE TO prevent other cats from claiming that same treat while it is being pursued.

3.3 WHEN the player holds no treat and clicks an unclaimed world treat THEN the system SHALL CONTINUE TO pick it up, returning it to `heldTreat` and removing it from `worldTreats`.

3.4 WHEN the player holds a treat and drops it THEN the system SHALL CONTINUE TO place it in `worldTreats` with `claimedBy: null` and make it immediately interactable.

3.5 WHEN a treat is claimed by a cat THEN the system SHALL CONTINUE TO prevent a second cat from simultaneously claiming the same treat.

3.6 WHEN the player holds a treat and attempts to pick up a world treat THEN the system SHALL CONTINUE TO block the pickup (hands-full guard).
