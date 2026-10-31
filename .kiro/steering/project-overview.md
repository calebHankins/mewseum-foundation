# Mewseum: Foundation — Project Overview

## What This Is

Mewseum: Foundation is a browser-based, static-deployable 3D hub-world gallery. It serves as a connective "demo disc" menu for a collection of cozy stress-management games. Players navigate a warm indoor sanctuary, interact with cats, and discover games displayed as art frames on the walls.

## Core Experience Loop

1. Player navigates the 3D "Found Foyer" (a liminal safe-room sanctuary)
2. Player discovers hidden low-poly cats using the Cat Talisman or playable game frames
3. Found cats appear in the sanctuary and are saved to localStorage; players can then pet them
4. Player dispenses treats and drops them in the world for cats to seek and eat
5. Clicking gallery frames opens linked games in new tabs or launches the integrated Pebble Sort mini-game
6. The space gradually fills with more cats as the player engages

## Vocabulary (Use These Terms)

| Concept | Preferred Term |
| --- | --- |
| The main hub space | The Found Foyer, The Atrium, The Refuge |
| Game entry points | Found Frames, Sanctuary Exhibits |
| Interactive Altar | Cat Talisman |
| Snack station | Treat Dispenser, World Treats |
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
| `src/cats/Cat.tsx` | Cat coordinator (physics, state machine, visuals, interactions) |
| `src/cats/CatRegistry.tsx` | Cat data definitions and placement |
| `src/cats/CatTalisman.tsx` | Sanctuary altar offering to discover unfound cats |
| `src/treats/TreatDispenser.tsx` | Interactive treat dispenser in the sanctuary |
| `src/treats/WorldTreat.tsx` | Dropped treat rendering and pickup handling |
| `src/treats/TreatContext.tsx` | State context for held and world treats |
| `src/progression/CatProgressContext.tsx` | localStorage hook & provider for found cats |
| `src/frames/GameFrame.tsx` | Gallery frame mesh + click-to-open / mini-game launcher |
| `src/games/PebbleSort.tsx` | Built-in interactive pebble sorting mini-game |
| `src/player/PlayerController.tsx` | WASD + mouse look + mobile touch controls |
| `src/audio/useAmbientAudio.ts` | Web Audio ambient soundscape |
| `src/ui/HUD.tsx` | React overlay (cat count, sound toggle, help, held treat, tutorial) |
| `src/shaders/PS1Effect.tsx` | Post-processing dither + banding shader |
