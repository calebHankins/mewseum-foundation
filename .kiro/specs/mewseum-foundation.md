# Spec: Mewseum: Foundation

## Overview

A browser-based, static-deployable 3D hub-world gallery for cozy games. Features a PS1-era aesthetic, a cat sanctuary that fills up as the player engages, and interactive petting mechanics.

---

## Requirements

### R1 — 3D Navigation
- The player must be able to move through the 3D space on desktop (WASD + mouse look via PointerLock) and mobile (touch joystick / drag to look)
- The scene must render at acceptable FPS (target ≥30fps) on mid-range hardware
- Camera must be first-person with collision to prevent clipping through walls

### R2 — PS1 Aesthetic
- Renderer must have `antialias: false`
- Pixel ratio locked to `1` for chunky pixel look
- Post-processing: screen-space dithering, color banding
- Textures: low-resolution, pixelated filtering (`NearestFilter`)
- Materials: unlit or toon-shaded (no PBR)
- God rays visible through windows, pixel dust particles floating in the air

### R3 — Cat Sanctuary Progression
- A cat registry defines N cats, each with: `id`, `name`, `position`, `rotation`, `description`
- On first load, all cats are in "unfound" state (hidden or translucent)
- When a cat is "found" (via petting), its state is written to `localStorage` key `mewseum_found_cats`
- On subsequent visits, found cats are immediately visible and settled

### R4 — Cat Petting
- Clicking/tapping a cat triggers a petting interaction:
  - Scale-pulse animation (the cat "reacts")
  - Floating heart/paw sprite above the cat
  - If first time: triggers `findCat(id)`, updates progression
- Touch input must also trigger petting on mobile

### R5 — Game Frames
- The room contains at least 3 game frames on the walls
- Each frame displays: a title label, a short description, and a visual border
- Clicking/tapping a frame opens the associated game URL in a new browser tab (`window.open(url, '_blank')`)
- Frame data is defined in a static registry (`FRAME_DATA`)

### R6 — Ambient Audio
- Three layered audio tracks via Web Audio API:
  1. Ambient drone (background hum)
  2. Cat purring loop
  3. Muffled wind / building hum
- Audio must default to **OFF** (no autoplay)
- User toggles audio on/off via the HUD

### R7 — UI Overlay (HUD)
- Minimal overlay rendered in React (outside Canvas)
- Sound on/off toggle button
- Cat counter: "X / Y cats found"
- Brief tutorial text on first visit (dismissible)
- Must be responsive and not obstruct the center of view

### R8 — Static Deployment
- `npm run build` produces a fully static `dist/` folder
- No server-side code or runtime dependencies
- Must work when served from a subdirectory (configurable `base` in vite.config)

---

## Design Decisions

### Why React Three Fiber?
Gives us React's component model over Three.js — cats and frames are components with props and hooks, making progression state trivially wired via context.

### Why Vite?
Fast HMR for 3D iteration, first-class static build output, easy GitHub Pages deployment.

### Why localStorage (not IndexedDB)?
Progression data is a small string array of cat IDs. localStorage is synchronous, requires zero setup, and is universally available in static deployments.

### Procedural Geometry vs. Asset Files
Initial prototype uses procedural Three.js primitives for all geometry (cats, room, frames). This eliminates asset pipeline complexity and keeps the bundle lean. Real assets can replace primitives in a later pass.

---

## Implementation Tasks

- [x] Task 1: Scaffold Vite + React + R3F project
- [x] Task 2: PS1 renderer settings + post-processing shader
- [x] Task 3: Safe Room environment geometry
- [x] Task 4: Atmosphere (god rays + pixel dust)
- [x] Task 5: Cat model + idle animation
- [x] Task 6: Cat progression system (localStorage)
- [x] Task 7: Cat petting interaction
- [x] Task 8: Game frames + new-tab navigation
- [x] Task 9: Player navigation (desktop + mobile)
- [x] Task 10: Ambient audio
- [x] Task 11: HUD overlay
- [x] Task 12: Wire + verify build

---

## Out of Scope (v1)

- Actual game integrations (frames use placeholder URLs)
- Server-side analytics or save sync
- Custom 3D asset files (.glb/.gltf) — using procedural geometry
- Sound effect files — synthesized via Web Audio API oscillators/noise
