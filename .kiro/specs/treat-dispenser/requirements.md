# Requirements Document

## Introduction

The Treat Dispenser adds an interactive gumball-machine-style object to the Found Foyer. Players approach it to dispense cat treats, carry a treat in their hand (rendered in the lower-right HUD like an FPS weapon), and drop treats into the world. Nearby cats detect dropped treats, walk over to eat them, and respond with meows and floating hearts — mirroring the warmth of the existing petting interaction. The feature deepens engagement with the cat-discovery loop without touching the existing `CatProgressContext` or `findCat` lifecycle.

## Glossary

- **TreatDispenser**: The gumball-machine 3D object placed in the Found Foyer. Players interact with it to receive a treat.
- **Treat**: A small interactable sphere dispensed by the TreatDispenser. Exists in one of three states: `HELD`, `WORLD`, or `EATEN`.
- **HeldTreat**: A Treat currently in the player's possession, rendered in the HUD's lower-right corner.
- **WorldTreat**: One Treat dropped into the 3D scene; multiple WorldTreats can exist and be detected independently by cats.
- **TreatDetectionRadius**: The distance (in world units) within which a cat can sense a WorldTreat.
- **EatState**: The cat behavior state entered when a cat moves toward and consumes a WorldTreat.
- **TreatHUD**: The HUD overlay element that displays the HeldTreat in the lower-right corner.
- **PlayerController**: The existing first-person camera and movement controller (`src/player/PlayerController.tsx`).
- **Cat**: An individual cat instance managed by `src/cats/Cat.tsx`, running a behavior state machine inside `useFrame`.
- **catPositionsRegistry**: The module-level `Record<string, THREE.Vector3>` in `Cat.tsx` that all cats write their positions to each frame.
- **TreatContext**: A new React Context that stores the current Treat state (held count, world treat positions) and exposes actions to dispense, drop, pick up, and consume treats.

---

## Requirements

### Requirement 1: Treat Dispenser Object

**User Story:** As a player, I want to see a gumball-machine-style object in the Found Foyer, so that I have a clear, discoverable way to get treats for the cats.

#### Acceptance Criteria

1. THE TreatDispenser SHALL be rendered as a low-poly 3D mesh in the Found Foyer using `MeshLambertMaterial` with no PBR materials.
2. THE TreatDispenser SHALL be placed at world-space position (0, 0, 0), the center of the Found Foyer. It SHALL be visible from the player's spawn position (0, 1.65, 6) when facing down -Z, without overlapping furniture or cat spawn positions.
3. WHEN the player's reticle is aimed at the TreatDispenser, THE TreatDispenser SHALL highlight (color tint shift) to indicate it is interactive.
4. WHEN the player interacts with the TreatDispenser while holding zero treats, THE TreatDispenser SHALL dispense exactly one treat to the player's inventory with no cooldown or rate limit between dispenses.
5. WHEN the player interacts with the TreatDispenser while already holding a treat, THE TreatDispenser SHALL display a tooltip indicating the player's hands are full.
6. THE TreatDispenser SHALL support both `onClick` and `onPointerDown` events for desktop and mobile compatibility.

---

### Requirement 2: Treat Inventory and HUD Display

**User Story:** As a player, I want to see the treat I'm holding in the lower-right corner of the screen, so that I know I have a treat ready to drop.

#### Acceptance Criteria

1. WHILE the player holds a treat, THE TreatHUD SHALL render a treat icon in the lower-right corner of the screen overlay using the existing TailwindCSS HUD system.
2. WHILE the player holds no treat, THE TreatHUD SHALL not render the treat icon.
3. THE TreatHUD SHALL use the project's warm amber color palette (`#D4955A`, `#A77A52`) and pixel-font styling consistent with the existing HUD elements.
4. THE TreatHUD SHALL display a brief instructional label (e.g. "F / Tap to drop") that is visible only while a treat is held.
5. THE TreatHUD treat icon and label SHALL be accessible via a DOM `aria-label` attribute describing "Held treat — press F or tap to drop".

---

### Requirement 3: Dropping a Treat into the World

**User Story:** As a player, I want to drop a treat from my inventory into the 3D world, so that a nearby cat can come and eat it.

#### Acceptance Criteria

1. WHEN the player presses the `F` key while holding a treat, THE TreatContext SHALL transition the treat from `HELD` state to `WORLD` state, placing it at the player's current world-space position offset slightly forward.
2. WHEN the player taps the TreatHUD treat icon on a touch device while holding a treat, THE TreatContext SHALL transition the treat from `HELD` state to `WORLD` state at the player's forward position.
3. WHEN a treat enters `WORLD` state, THE Scene SHALL render a small low-poly sphere mesh at the treat's world position using `MeshLambertMaterial`.
4. WHEN a treat enters `WORLD` state, THE Scene SHALL apply a brief drop animation (scale from 0 to 1 over 0.3 seconds) to the WorldTreat mesh.
5. THE Scene SHALL support multiple WorldTreats at once; dropping a treat SHALL add it to the scene without removing existing WorldTreats.
6. IF the player attempts to drop a treat while holding zero treats, THEN THE TreatContext SHALL take no action.

---

### Requirement 4: Cat Treat Detection

**User Story:** As a player, I want cats to notice and walk toward a dropped treat, so that the interaction feels alive and rewarding.

#### Acceptance Criteria

1. WHILE one or more WorldTreats exist in the scene, THE Cat SHALL check their distances from its current position each frame inside `useFrame`.
2. WHEN a Cat in `IDLE` or `WANDER` state is within TreatDetectionRadius (3.5 world units) of one or more unclaimed WorldTreats, THE Cat SHALL claim the nearest available treat and transition to `EatState` with that treat as its movement target.
3. WHILE a Cat is in `EatState`, THE Cat SHALL move toward the WorldTreat at `WANDER_SPEED` using the same rotation-smoothing logic as the existing `WANDER` state.
4. IF a second Cat detects a WorldTreat already claimed by another Cat, THEN THE second Cat SHALL NOT enter `EatState` for that treat; each treat has an independent first-come, first-served claim.
5. WHEN a Cat in `EatState` reaches its claimed WorldTreat (distance ≤ 0.4 world units), THE Cat SHALL consume only that treat by triggering the `consumeTreat` action on TreatContext.
6. IF the WorldTreat claimed by a Cat is consumed or picked up, THEN THE Cat SHALL transition back to `IDLE` state.

---

### Requirement 5: Cat Eat Reaction

**User Story:** As a player, I want the cat to visibly react when it eats a treat, so that the reward moment feels satisfying.

#### Acceptance Criteria

1. WHEN a Cat consumes a WorldTreat, THE Cat SHALL play a scale-pulse animation identical in timing and magnitude to the existing petting scale-pulse (`PET_DURATION = 0.6s`, `pulse = 1 + sin(t * π) * 0.18`).
2. WHEN a Cat consumes a WorldTreat, THE Cat SHALL display a floating heart sprite above its head using the existing Billboard + Text pattern, colored `#D4606A`.
3. WHEN a Cat consumes a WorldTreat and audio is enabled, THE Cat SHALL call `playMeow()` once.
4. AFTER consuming a WorldTreat, THE Cat SHALL transition to `COOLDOWN` state for `PET_COOLDOWN` seconds, matching the post-pet behavior.
5. THE WorldTreat mesh SHALL be removed from the scene within the same frame that the cat consumes it.

---

### Requirement 6: World Treat Persistence and Cleanup

**User Story:** As a player, I want each unclaimed treat to remain in the world until it is eaten or picked up, so that multiple treats can persist independently.

#### Acceptance Criteria

1. Each WorldTreat SHALL remain in the scene until it is consumed by a cat or picked up by the player.
2. Each WorldTreat mesh SHALL cast a shadow consistent with the scene's `PCFSoftShadowMap` shadow setup.
3. Each WorldTreat SHALL apply a gentle idle bob animation (sinusoidal Y offset, amplitude 0.05 world units, period 2 seconds) while resting in `WORLD` state.
4. All WorldTreat positions, existence, and claims SHALL be stored in `TreatContext` using React state — not in Three.js object refs — so that all consumers (Cat, HUD, Scene) receive consistent updates.
5. IF the player navigates away from the page and returns (full page reload), THEN all WorldTreat state SHALL reset to no treats in the world (WorldTreat state is NOT persisted to localStorage).
6. Each WorldTreat SHALL rest at a center height that accounts for both its radius and full bob amplitude, so it never clips below the floor.

---

### Requirement 7: Accessibility and Mobile Compatibility

**User Story:** As a player on any device, I want to be able to use the treat system without a keyboard, so that the feature is accessible on mobile.

#### Acceptance Criteria

1. THE TreatDispenser SHALL respond to `onPointerDown` in addition to `onClick` to support touch devices.
2. THE TreatHUD treat icon SHALL be tappable on touch devices and trigger the same drop action as the `F` key.
3. THE TreatHUD instructional label SHALL reflect the current input mode: "F to drop" on desktop (pointer: fine) and "Tap to drop" on touch devices.
4. ALL interactive elements added by this feature (TreatDispenser mesh, TreatHUD icon) SHALL include `aria-label` attributes describing their function.

---

### Requirement 8: Picking Up a Dropped Treat

**User Story:** As a player, I want to retrieve a treat I dropped before a cat claims it, so that I can reposition it or carry it again.

#### Acceptance Criteria

1. WHEN one or more unclaimed WorldTreats exist, the player holds no treat, and no cat has claimed the selected treat, THE player SHALL be able to pick up that individual treat by clicking or tapping it.
2. WHEN the player picks up a WorldTreat, THE TreatContext SHALL remove only that treat from the world and set `heldTreat` to true.
3. IF the player already holds a treat or a cat has claimed the selected WorldTreat, THEN attempting to pick it up SHALL have no effect on any treat.
4. Each WorldTreat SHALL support both `onClick` and `onPointerDown` events and expose an accessible label describing the pickup action.

---

### Requirement 9: Cat Treat Growth and Digestion

**User Story:** As a player, I want cats to visibly grow after eating and gradually return to their normal size, so that treats have a playful, temporary effect.

#### Acceptance Criteria

1. WHEN a Cat consumes a treat, its root scale SHALL increase by `CAT_TREAT_SCALE_INCREASE` (0.1) for that treat.
2. THE Cat's visible model and interaction hitbox SHALL grow together.
3. Each treat's scale contribution SHALL linearly decay to zero over `CAT_TREAT_DIGESTION_DURATION` (20 seconds); when no contributions remain, the Cat SHALL return to its original scale.
4. WHEN a Cat consumes multiple treats before finishing digestion, their scale contributions SHALL stack and digest independently.
5. Treat growth SHALL compose with the existing petting scale pulse without resetting the Cat's current size.
