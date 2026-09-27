# Tech Stack & Architecture

## Core Libraries

| Library | Version | Purpose |
|---|---|---|
| React | ^18 | UI component model |
| React Three Fiber | ^8 | Three.js in React |
| @react-three/drei | ^9 | R3F helpers (controls, loaders, shaders) |
| @react-three/postprocessing | ^2 | Post-processing effects pipeline |
| Three.js | ^0.165 | 3D engine |
| TypeScript | ^5 | Type safety |
| Vite | ^5 | Build tool, dev server |
| TailwindCSS | ^3 | UI overlay styling |

## Architecture Pattern

```
App
└── HUD (React overlay, absolute positioned)
└── Canvas (R3F)
    ├── PS1EffectPipeline (postprocessing)
    ├── PlayerController (camera + movement)
    ├── SanctuaryRoom (static geometry)
    ├── Atmosphere (particles + light shafts)
    ├── CatRegistry (maps found cats → Cat instances)
    │   └── Cat × N (mesh + interaction)
    └── FrameRegistry (game frames)
        └── GameFrame × N (mesh + click handler)
```

## State Management

- **Cat progression**: React Context (`CatProgressContext`) backed by `localStorage`
- **Audio state**: Local React state in `HUD`, passed down via context
- **3D interaction**: Raycasting handled in individual interactive components via R3F's `onClick` / `onPointerOver`

## Renderer Settings (PS1 Aesthetic)

```ts
// Applied to R3F Canvas
antialias: false
pixelRatio: 1          // forces pixel-perfect look at 1:1
shadowMap: PCFSoftShadowMap  // hard-ish shadows
```

## Build & Deploy

```bash
npm run dev     # Vite dev server with HMR
npm run build   # Outputs to dist/
npm run preview # Preview the static build
```

For GitHub Pages, set `base` in `vite.config.ts` to your repo name:
```ts
base: '/mewseum-foundation/'
```
