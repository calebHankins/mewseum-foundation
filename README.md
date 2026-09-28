# Mewseum: Foundation

> *A sanctuary for found felines and cozy games.*

A browser-based 3D hub-world gallery built with React Three Fiber. Navigate a warm, liminal safe room, pet stray cats to bring them home, and discover cozy games displayed as gallery frames on the walls. Built with a PS1-era low-poly aesthetic — chunky geometry, dithered colors, warm god rays.

---

## Features

- **3D first-person navigation** — WASD + mouse look on desktop, dual-touch joystick on mobile
- **PS1 aesthetic** — no anti-aliasing, screen-space dithering, colour banding post-processing, low-poly geometry throughout
- **Cat sanctuary progression** — five cats hidden in the space; petting them "finds" them and they appear permanently, saved to `localStorage`
- **Sanctuary exhibits** — five wall-mounted game frames; click any frame to open the linked game in a new tab
- **Ambient soundscape** — synthesised via Web Audio API (ambient drone, purring loop, building hum) — off by default
- **Minimal HUD** — sound toggle, cat counter, first-visit tutorial; built in React + Tailwind, overlaid on the 3D scene
- **Static deployable** — no server required; builds to a `dist/` folder suitable for GitHub Pages

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across all TypeScript files |

---

## Project Structure

```
src/
├── Scene.tsx                   # Root R3F Canvas — scene composition & lighting
├── App.tsx                     # Context providers + HUD mount
│
├── audio/
│   ├── AudioContext.tsx         # React context for audio on/off state
│   └── useAmbientAudio.ts       # Web Audio API synthesiser (drone, purr, hum)
│
├── cats/
│   ├── catData.ts               # CAT_REGISTRY — add new cats here
│   ├── Cat.tsx                  # Individual cat mesh + pet interaction + animation
│   └── CatRegistry.tsx          # Renders all cats from the registry
│
├── environment/
│   ├── SanctuaryRoom.tsx        # Room geometry (walls, floor, windows, furniture)
│   └── Atmosphere.tsx           # God rays + floating pixel dust particles
│
├── frames/
│   ├── frameData.ts             # FRAME_DATA — add new game exhibits here
│   ├── GameFrame.tsx            # Wall-mounted frame mesh + click-to-open
│   └── FrameRegistry.tsx        # Renders all frames from the registry
│
├── player/
│   └── PlayerController.tsx     # WASD + mouse look + mobile touch controls
│
├── progression/
│   └── CatProgressContext.tsx   # localStorage-backed found-cat state
│
├── shaders/
│   ├── PS1Effect.tsx            # Custom postprocessing Effect (dither + banding)
│   └── PS1Pipeline.tsx          # EffectComposer wrapper for the PS1 effect
│
└── ui/
    └── HUD.tsx                  # React overlay (tutorial, sound toggle, cat count)
```

---

## Customisation

### Adding a cat

Open `src/cats/catData.ts` and add an entry to `CAT_REGISTRY`:

```ts
{
  id: 'ember',
  name: 'Ember',
  description: 'A tiny tortoiseshell who likes warm corners.',
  position: [3, 0, -4],
  rotation: [0, 1.5, 0],
  color: '#C87040',
  accentColor: '#8A4820',
},
```

No other changes needed — `CatRegistry` picks it up automatically.

### Adding a game frame

Open `src/frames/frameData.ts` and add an entry to `FRAME_DATA`:

```ts
{
  id: 'my-game',
  title: 'My Game',
  description: 'A short description of the experience.',
  url: 'https://your-game-url.com',
  position: [-9.9, 2.2, 0],
  rotation: [0, Math.PI / 2, 0],
  accentColor: '#7A5A8A',
},
```

### GitHub Pages deployment

The GitHub Actions workflow builds the site and deploys `dist/` whenever a commit is pushed to `main`. To enable it, open **Settings → Pages** in the repository and select **GitHub Actions** as the build and deployment source. You can also run the deployment manually from the Actions tab.

The public site will be available at <https://calebhankins.github.io/mewseum-foundation/> after the first successful deployment. GitHub Pages sites are public even when their source repository is private; publishing from a private repository requires a GitHub plan that supports it. Only the built site is published, but review its contents for anything you do not want public before enabling deployment.

---

## Development Notes

### Debug: unlock cats in-browser

While developing, press **F** in the browser to mark the next unfound cat as found. This helper lives in `src/Scene.tsx` (`DebugCatUnlocker`) — remove it before shipping.

### Resetting progression

To reset all found cats during testing, run this in the browser console:

```js
localStorage.removeItem('mewseum_found_cats')
location.reload()
```

### PS1 aesthetic settings

The dither intensity and colour band count are adjustable in `src/shaders/PS1Pipeline.tsx`:

```tsx
<PS1Effect bands={24} ditherStrength={0.06} />
```

Lower `bands` = more aggressive colour banding. Raise `ditherStrength` for a grainier look.

---

## Tech Stack

| Library | Purpose |
| --- | --- |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | Three.js in React |
| [@react-three/drei](https://github.com/pmndrs/drei) | R3F helpers (Text, Billboard, controls) |
| [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) | Post-processing effect pipeline |
| [Three.js](https://threejs.org/) | 3D engine |
| [Vite](https://vitejs.dev/) | Build tool |
| [TailwindCSS](https://tailwindcss.com/) | HUD overlay styling |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |

---

## Kiro Documentation

Project steering files and spec are in `.kiro/`:

```
.kiro/
├── steering/
│   ├── project-overview.md     # Concept, vocabulary, key file map
│   ├── tech-stack.md           # Libraries, architecture, build commands
│   └── coding-standards.md     # PS1 rules, R3F conventions, naming
└── specs/
    └── mewseum-foundation.md   # Full requirements, design decisions, task list
```

---

*Part of the Mewseum project. All cats deserve a warm place to sleep.*
