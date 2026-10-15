# Mewseum: Foundation

> *A sanctuary for found felines and cozy games.*

A browser-based 3D hub-world gallery built with React Three Fiber. Navigate a warm, liminal safe room, pet stray cats to bring them home, and discover cozy games displayed as gallery frames on the walls. Built with a PS1-era low-poly aesthetic — chunky geometry, dithered colors, warm god rays.

---

## Features

- **3D first-person navigation** — WASD + mouse look (pointer lock) on desktop, touch look + move + jump controls on mobile
- **PS1 aesthetic** — no anti-aliasing, fixed pixel ratio, screen-space 4×4 Bayer dithering, colour banding post-processing, low-poly geometry throughout
- **Cat sanctuary progression** — 10 cats hidden throughout the sanctuary; petting them or discovering them via the Cat Talisman "finds" them, saving progress to `localStorage`
- **Cat behaviors & treats** — dynamic multi-state behavior system (wander, social interactions with hearts, cooldown, and treat seeking/eating) with a central treat dispenser and treat dropping/pickup mechanics
- **Sanctuary exhibits & games** — wall-mounted game frames linking to external cozy games, plus an integrated interactive Pebble Sort mini-game playable directly inside the sanctuary
- **Procedural soundscape** — synthesised via Web Audio API (ambient drone, purr loop, and meow / pebble sound effects) with autoplay-compliant opt-in toggle
- **Responsive HUD** — cat counter, ambient audio toggle, help toggle, held treat status, dynamic crosshair/reticle, and first-visit tutorial
- **Static deployable** — no server required; builds cleanly to a `dist/` folder ready for GitHub Pages or static hosts

---

## Getting Started

**Prerequisites:** Node.js 20+ (supports modern LTS: Node >=20.19.0 or >=22.12.0)

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Expose on local network (useful for mobile testing)
npm run dev:expose
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run dev:expose` | Start Vite dev server exposed to local network (`--host`) |
| `npm run build` | Type-check (`tsc`) + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across TypeScript and TSX files |

---

## Project Structure

```md
src/
├── App.tsx                        # Root — Context providers, 3D Canvas mount, HUD, and PebbleSort
├── Scene.tsx                      # Root R3F Canvas — centeredEvents, SceneLights, scene composition
│
├── audio/
│   ├── AudioContext.tsx           # React context for audio on/off state
│   ├── meow.ts                    # Web Audio procedural cat meow generator
│   ├── pebbleSounds.ts            # Sound synthesis for Pebble Sort interactions
│   └── useAmbientAudio.ts         # Ambient drone & purr synthesizer
│
├── cats/
│   ├── catData.ts                 # CAT_REGISTRY (10 cats, positions, social attributes)
│   ├── Cat.tsx                    # Cat component coordinating physics, behavior, visuals, and petting
│   ├── CatRegistry.tsx            # Maps CAT_REGISTRY → <Cat> instances
│   ├── CatTalisman.tsx            # Altar object for discovering unfound cats
│   ├── CatVisual.tsx              # Low-poly cat meshes, ear twitching, tail wagging, and hearts
│   ├── catBehavior.ts             # Shared constants, steering forces, state types, and registry
│   ├── catPhysics.ts              # Cat jumping and floor/gravity handling
│   ├── catAnimation.ts            # Cat scale pulses, heart animations, and treat growth
│   ├── catWanderBehavior.ts       # Cat wandering and obstacle avoidance
│   ├── catSocialBehavior.ts       # Social interactions between nearby cats
│   ├── catCooldownBehavior.ts     # Post-pet cooldown behavior
│   └── catTreatBehavior.ts        # Cat pathing towards and eating treats
│
├── environment/
│   ├── SanctuaryRoom.tsx          # Room geometry (walls, floor, ceiling, pillars, windows, furniture)
│   └── Atmosphere.tsx             # Particle dust and warm light shaft god rays
│
├── frames/
│   ├── frameData.ts               # FRAME_DATA — game exhibit definitions
│   ├── GameFrame.tsx              # Wall-mounted exhibit mesh, hover cues, and click handlers
│   └── FrameRegistry.tsx          # Maps FRAME_DATA → <GameFrame> instances
│
├── games/
│   └── PebbleSort.tsx             # Interactive cozy pebble sorting mini-game
│
├── player/
│   ├── PlayerController.tsx       # Desktop (WASD + pointer lock) & mobile (dual touch + jump)
│   ├── obstacleCollision.ts       # Room obstacles, bounds checking, and steering avoidance
│   └── playerState.ts             # Global player position & forward direction tracker
│
├── progression/
│   └── CatProgressContext.tsx     # localStorage-backed found-cat state (`useCatProgress`)
│
├── shaders/
│   ├── PS1Effect.tsx              # Custom postprocessing Effect (Bayer dither + colour banding)
│   └── PS1Pipeline.tsx            # EffectComposer wrapper for the PS1 post-processing effect
│
├── treats/
│   ├── TreatContext.tsx           # Context managing held treats and world treats
│   ├── treatData.ts               # Treat timing, radii, and colour palette
│   ├── TreatDispenser.tsx         # Central treat dispenser machine with candy globe
│   └── WorldTreat.tsx             # Dropped treat meshes with bobbing animation & pickup handling
│
└── ui/
    └── HUD.tsx                    # React overlay (tutorial, help, reticle, audio toggle, treat slot, cat count)
```

---

## Customisation

### Adding a cat

Open `src/cats/catData.ts` and add an entry to `CAT_REGISTRY`:

```ts
{
  id: 'ember',
  name: 'Ember',
  description: 'A shy tortoiseshell who peeks from behind planters.',
  position: [3, 0, 4],
  rotation: [0, 1.0, 0],
  color: '#8B4513',
  accentColor: '#5C2A0A',
  socialDrive: 4,         // 0 (solitary) to 10 (very social)
  socialFatigue: 22,      // seconds between social interactions
},
```

No other changes needed — `CatRegistry` and the HUD cat counter pick it up automatically.

### Adding a game frame

Open `src/frames/frameData.ts` and add an entry to `FRAME_DATA`:

```ts
{
  id: 'tidepools',
  title: 'Tidepools',
  description: 'Watch creatures in a pixel tide pool.',
  url: 'https://your-game-url.com',
  position: [-9.9, 2.2, 0],
  rotation: [0, Math.PI / 2, 0],
  accentColor: '#3A7A9A',
},
```

### GitHub Pages deployment

The GitHub Actions workflow builds the site and deploys `dist/` whenever a commit is pushed to `main`. To enable it, open **Settings → Pages** in the repository and select **GitHub Actions** as the build and deployment source. You can also run the deployment manually from the Actions tab.

The public site will be available at <https://calebhankins.github.io/mewseum-foundation/> after the first successful deployment. GitHub Pages sites are public even when their source repository is private; publishing from a private repository requires a GitHub plan that supports it. Only the built site is published, but review its contents for anything you do not want public before enabling deployment.

---

## Development Notes

### Resetting progression

To reset all found cats during testing, run this in the browser console:

```js
localStorage.removeItem('mewseum_found_cats')
location.reload()
```

### PS1 aesthetic settings

The dither intensity and colour band count are configured in `src/shaders/PS1Pipeline.tsx`:

```tsx
<PS1Effect
  blendFunction={BlendFunction.NORMAL}
  bands={64}
  ditherStrength={0.015625}
/>
```

Lower `bands` = more aggressive colour banding. Higher `ditherStrength` produces more noticeable Bayer matrix dithering.

---

## Tech Stack

| Library | Purpose |
| --- | --- |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | Three.js in React |
| [@react-three/drei](https://github.com/pmndrs/drei) | R3F helpers (Text, Billboard, controls) |
| [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) | Post-processing effect pipeline |
| [postprocessing](https://github.com/pmndrs/postprocessing) | Postprocessing pass and shader framework |
| [Three.js](https://threejs.org/) | 3D rendering engine |
| [Vite](https://vitejs.dev/) | Build tool & local dev server |
| [TailwindCSS v4](https://tailwindcss.com/) | HUD overlay and mini-game styling |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |

---

## Evergreen Documentation

Project steering files, guides, and specifications:

```md
├── AGENTS.md                   # Agent guidelines, architecture, state boundaries, conventions
├── README.md                   # Project overview, quick start, directory structure, customisation
└── .kiro/
    ├── steering/
    │   ├── project-overview.md # Concept, vocabulary, core experience loop, key file map
    │   ├── tech-stack.md       # Core libraries, renderer settings, shadow/surface rules
    │   └── coding-standards.md # Low-poly PS1 standards, R3F conventions, naming rules
    └── specs/
        └── mewseum-foundation.md # Foundational requirements, architecture, and design
```

---

*Part of the Mewseum project. All cats deserve a warm place to sleep.*
