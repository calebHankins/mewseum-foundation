# Coding Standards

## General

- TypeScript strict mode is on — no `any` unless unavoidable (comment why)
- Prefer named exports over default exports, except for page/screen components
- Each file should have a single clear responsibility
- All `useEffect` deps arrays must be complete (ESLint enforced)

## React Three Fiber Conventions

- Use `useFrame` for per-frame animation, never `setInterval`
- Use `useRef` for Three.js object references — do not store them in state
- Prefer declarative mesh composition with R3F JSX over imperative `scene.add()`
- All interactive objects (cats, frames) must handle both `onClick` and `onPointerDown` for mobile compatibility
- Dispose of geometries/materials in `useEffect` cleanup when creating them imperatively

```tsx
// Good
const meshRef = useRef<THREE.Mesh>(null)
useFrame((_, delta) => {
  if (meshRef.current) meshRef.current.rotation.y += delta * 0.5
})

// Bad — causes React re-renders on every frame
const [rotation, setRotation] = useState(0)
```

## PS1 Aesthetic Rules

- **Never** enable anti-aliasing (`antialias: false` on Canvas)
- Texture resolution must be a power of 2, kept ≤ 256×256
- Prefer `MeshLambertMaterial` or `MeshToonMaterial` over PBR materials
- Hard shadows only — no soft shadow blurring beyond PCF minimum
- Color palette: warm ambers, dusty roses, muted teals — no neon or saturated hues
- All geometry should be visibly low-poly (avoid subdivisions beyond 4 segments for organic shapes)

## Depth and Shadow Checks

- Avoid coplanar overlapping meshes. A closed room shell includes top and bottom faces, so separate floor and ceiling planes must be offset into the room; glass panes should sit slightly in front of their frame faces.
- If a surface flickers or changes tone with camera movement, check for z-fighting before changing its material, lighting, or post-processing.
- Keep shadow casting limited to intentional key lights. Fill point lights should not cast shadows by default; verify shadow changes with screenshots before and after a small camera move.

## Cat & Interaction Standards

- Every cat must have a unique `id` (string slug, e.g. `"dusty"`, `"cinder"`)
- Cat `found` state lives in `CatProgressContext` only — never local component state
- The first pet of an undiscovered cat triggers `findCat(id)` — subsequent pets play animation only
- Petting feedback: scale pulse + floating heart sprite + (optionally) purr sound

## File Naming

```md
PascalCase  → React components  (Cat.tsx, GameFrame.tsx)
camelCase   → hooks, utils      (useCatProgress.ts, audioUtils.ts)
kebab-case  → assets            (dusty-cat-texture.png)
UPPER_SNAKE → constants         (CAT_REGISTRY, FRAME_DATA)
```

## Accessibility

- All clickable 3D objects should have `aria-label` equivalents in a hidden DOM overlay or tooltip
- Sound must default to **off** (autoplay policy) — user initiates via UI toggle
- Tutorial instructions must use high-contrast text over the 3D scene

## Linting

ESLint with `@typescript-eslint` and `eslint-plugin-react-hooks` enforced.
Run `npm run lint` before committing.
