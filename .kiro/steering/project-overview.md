# Mewseum: Foundation — Project Overview

## What This Is

Mewseum: Foundation is a browser-based, static-deployable 3D hub-world gallery. It serves as a connective "demo disc" menu for a collection of cozy stress-management games. Players navigate a warm indoor sanctuary, interact with cats, and discover games displayed as art frames on the walls.

## Core Experience Loop

1. Player navigates the 3D "Found Foyer" (a liminal safe-room sanctuary)
2. Player encounters and pets low-poly stray cats
3. Petting a cat "finds" it — it's saved to localStorage and persists across sessions
4. Clicking gallery frames opens linked games in new tabs
5. The space gradually fills with more cats as the player engages

## Vocabulary (Use These Terms)

| Concept | Preferred Term |
| --- | --- |
| The main hub space | The Found Foyer, The Atrium, The Refuge |
| Game entry points | Found Frames, Sanctuary Exhibits |
| Lighting elements | Luma, Radiant, Skylight, Sunbeam, Ambient |
| Mood / tone words | Sanctuary, Haven, Ethereal, Oasis, Respite, Stillness |

## Deployment

- **Static only** — GitHub Pages compatible, no server required
- Build output: `dist/` directory via `vite build`
- All assets are bundled or procedurally generated at runtime

## Key Files

| File | Role |
| --- | --- |
| `src/Scene.tsx` | Root R3F Canvas and scene composition |
| `src/environment/SanctuaryRoom.tsx` | Room geometry, walls, windows, furniture |
| `src/environment/Atmosphere.tsx` | God rays, pixel dust particles |
| `src/cats/Cat.tsx` | Individual cat mesh + animation |
| `src/cats/CatRegistry.tsx` | Cat data definitions and placement |
| `src/progression/useCatProgress.ts` | localStorage hook for found cats |
| `src/frames/GameFrame.tsx` | Gallery frame mesh + click-to-open |
| `src/player/PlayerController.tsx` | WASD + mouse look + touch controls |
| `src/audio/useAmbientAudio.ts` | Web Audio ambient soundscape |
| `src/ui/HUD.tsx` | React overlay (sound toggle, tutorial) |
| `src/shaders/PS1Effect.tsx` | Post-processing dither + banding shader |
