# Mewseum: Foundation — Agent Guide

A browser-based 3D hub-world gallery for cozy games. Players navigate the **Found Foyer**, pet stray cats to discover them, and click gallery frames to open linked games. Built with React Three Fiber, styled for a PS1 low-poly aesthetic.

---

## Quick Start

```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc + vite build → dist/
npm run lint      # ESLint, zero warnings allowed
```

> **Note:** `npm run dev` is a long-running watcher. Run it in a separate terminal; do not wrap it in a tool call that expects it to exit.

---

## Project Structure

```
src/
├── App.tsx                        # Root — CatProgressProvider + AudioContext + Scene + HUD
├── Scene.tsx                      # R3F Canvas, centeredEvents, SceneLights, scene composition
├── audio/
│   ├── AudioContext.tsx            # Context for audioEnabled / toggleAudio
│   ├── meow.ts                     # Web Audio procedural meow generator
│   └── useAmbientAudio.ts          # Ambient drone hook, driven by audioEnabled
├── cats/
│   ├── catData.ts                  # CatDef type + CAT_REGISTRY constant
│   ├── Cat.tsx                     # Individual cat mesh + state machine + interactions
│   ├── CatRegistry.tsx             # Maps CAT_REGISTRY → <Cat> instances
│   └── CatTalisman.tsx             # Altar object that reveals undiscovered cats
├── environment/
│   ├── SanctuaryRoom.tsx           # Room geometry, walls, floor, furniture
│   └── Atmosphere.tsx              # Particle dust + light shaft god rays
├── frames/
│   ├── frameData.ts                # FrameDef type + FRAME_DATA constant
│   ├── GameFrame.tsx               # Individual frame mesh + click-to-open-URL
│   └── FrameRegistry.tsx           # Maps FRAME_DATA → <GameFrame> instances
├── player/
│   └── PlayerController.tsx        # WASD + mouse look (pointer lock) + touch controls
├── progression/
│   └── CatProgressContext.tsx      # localStorage-backed Context for found cats
├── shaders/
│   ├── PS1Effect.tsx               # Bayer dither + colour-banding Effect class
│   └── PS1Pipeline.tsx             # EffectComposer wrapping PS1EffectImpl
└── ui/
    └── HUD.tsx                     # React overlay: cat counter, audio toggle, tutorial
```

---

## Architecture

```
App
├── CatProgressProvider  (React Context + localStorage)
├── AudioContext         (React Context)
├── HUD                  (DOM overlay, TailwindCSS)
└── Scene (R3F Canvas)
    ├── PlayerController (camera, WASD, pointer lock, touch)
    ├── SceneLights      (ambient + directional)
    ├── SanctuaryRoom    (static geometry)
    ├── Atmosphere       (particles, god rays)
    ├── CatRegistry      → Cat × N  (mesh + behavior state machine)
    ├── CatTalisman      (interactive altar)
    ├── FrameRegistry    → GameFrame × N (mesh + URL handler)
    └── PS1Pipeline      (postprocessing: dither + banding)
```

### State Boundaries

| State | Location | Persisted |
|---|---|---|
| Found cats | `CatProgressContext` | `localStorage` (`mewseum_found_cats`) |
| Audio on/off | `AudioContext` | No (default off — autoplay policy) |
| Tutorial seen | `HUD` via `localStorage` | `localStorage` (`mewseum_tutorial_seen`) |
| Cat behavior | `Cat` local state + refs | No |
| Camera/movement | `PlayerController` refs | No |

---

## Core Concepts

### Cat Discovery & Progression

Cats are **hidden until found**. A cat with `found === false` renders `null`. The first `onPointerDown` on a cat calls `findCat(id)` from `CatProgressContext`, which writes to `localStorage` and causes a re-render that makes the cat visible.

Subsequent pets only play the scale-pulse animation and floating heart — they do not call `findCat` again.

The **CatTalisman** (`src/cats/CatTalisman.tsx`) is an altar object that provides an alternate discovery path.

### Cat Behavior State Machine

Each found cat runs a five-state machine inside `useFrame`:

```
IDLE → WANDER → (SOCIAL if nearby found cat detected) → back to IDLE
                 ↕
              COOLDOWN  (after being pet — stays near player)
```

All cat world positions are written into the module-level `catPositionsRegistry` record each frame so cats can detect each other without React state coordination.

`socialDrive` (0–10) and `socialFatigue` (seconds) per cat control how often social interactions trigger.

### PS1 Renderer

The R3F `Canvas` is configured with `antialias: false` and `dpr={1}`. The `PS1Pipeline` runs after the scene render and applies:
- **Colour banding** — quantises RGB to N discrete bands (`uBands`, default 24)
- **Bayer ordered dithering** — 4×4 matrix applied before banding (`uDitherStrength`, default 0.08)

Never enable anti-aliasing or increase `dpr` — both break the aesthetic.

### Pointer Events (centeredEvents)

When the Pointer Lock API has the cursor, `centeredEvents` in `Scene.tsx` forces the R3F raycaster through NDC (0, 0) — matching the HUD crosshair. This is required for correct cat/frame interaction while pointer-locked. Do not replace `centeredEvents` with R3F's default events.

---

## Key Data Files

### Adding a Cat

Edit `src/cats/catData.ts` → append to `CAT_REGISTRY`:

```ts
{
  id: 'ember',          // unique slug — used as localStorage key
  name: 'Ember',
  description: 'A shy tortoiseshell who peeks from behind planters.',
  position: [3, 0, 4],  // world-space (x, y, z)
  rotation: [0, 1.0, 0],
  color: '#8B4513',       // body — warm earth tone
  accentColor: '#5C2A0A', // ears, paws, tail
  socialDrive: 4,         // 0 (antisocial) → 10 (very social)
  socialFatigue: 22,      // seconds between social interactions
}
```

The new cat will automatically be rendered by `CatRegistry` and hidden until the player discovers it.

### Adding a Game Frame

Edit `src/frames/frameData.ts` → append to `FRAME_DATA`:

```ts
{
  id: 'tidepools',
  title: 'Tidepools',
  description: 'Watch creatures in a pixel tide pool.',
  url: 'https://your-game-url.com',
  position: [-9.9, 2.2, 0],   // wall surface position
  rotation: [0, Math.PI / 2, 0],
  accentColor: '#3A7A9A',
}
```

`GameFrame` handles the click → `window.open(url, '_blank')` automatically.

---

## Coding Conventions

- **TypeScript strict** — no `any`. If unavoidable, add a comment explaining why.
- **Named exports** everywhere except page/screen components.
- **`useRef`** for Three.js object handles — never store them in React state.
- **`useFrame`** for per-frame logic — never `setInterval`.
- All interactive 3D objects handle **both `onClick` and `onPointerDown`** for mobile compatibility.
- Materials: `MeshLambertMaterial` or `MeshToonMaterial` only — no PBR.
- Geometry segments: ≤ 4 for organic shapes. Keep the low-poly look intentional.
- Color palette: warm ambers, dusty roses, muted teals. No neon or saturated hues.
- Texture resolution: power-of-2, ≤ 256×256.

### File Naming

| Pattern | Use |
|---|---|
| `PascalCase.tsx` | React components |
| `camelCase.ts` | Hooks and utilities |
| `kebab-case.png` | Assets |
| `UPPER_SNAKE` | Exported constants |

---

## Lint & Build

```bash
npm run lint    # ESLint — @typescript-eslint + react-hooks; zero warnings
npm run build   # tsc (strict) then vite build
```

The build must pass `tsc` with zero errors before the Vite step runs. Fix type errors before marking work complete.

---

## Deployment

This is a **static site** — no server required.

```bash
npm run build
# deploy dist/ to GitHub Pages (or any static host)
```

For GitHub Pages, `vite.config.ts` must set `base: '/mewseum-foundation/'`. Do not change this unless the repo name changes.

---

## Things to Avoid

- Do **not** enable `antialias` on the Canvas.
- Do **not** increase `dpr` above 1.
- Do **not** use PBR materials (`MeshStandardMaterial`, `MeshPhysicalMaterial`).
- Do **not** add smooth subdivisions to geometry.
- Do **not** store Three.js object references in React state — use `useRef`.
- Do **not** call `findCat` more than once per cat — it is idempotent but the guard logic in `Cat.tsx` relies on `isCatFound` being false on the first pet only.
- Sound must default to **off**. Never autoplay audio.
- Do **not** push directly to `main`. Branch and PR for any non-trivial change.
