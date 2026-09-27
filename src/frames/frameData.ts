export interface FrameDef {
  id: string
  title: string
  description: string
  url?: string
  position: [number, number, number]
  rotation: [number, number, number]
  accentColor: string
}

/**
 * FRAME_DATA — the Sanctuary Exhibits / Found Frames.
 * Each entry is a game or experience accessible from the Mewseum.
 * Replace `url` values with real game URLs when available.
 */
export const FRAME_DATA: FrameDef[] = [
  {
    id: 'breathe',
    title: 'Breathe',
    description: 'A gentle breathing exercise game.',
    url: 'https://example.com/games/breathe',
    position: [0, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#5A8A8A',
  },
  {
    id: 'garden',
    title: 'Quiet Garden',
    description: 'Tend a small pixel garden.',
    url: 'https://example.com/games/garden',
    position: [-5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#4A7A3A',
  },
  {
    id: 'drift',
    title: 'Drift',
    description: 'Float through a calm starfield.',
    url: 'https://example.com/games/drift',
    position: [5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#6A5A8A',
  },
  {
    id: 'rain',
    title: 'Rain Room',
    description: 'Listen to procedural rain.',
    url: 'https://example.com/games/rain',
    position: [9.9, 2.2, -4],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#5A7A9A',
  },
  {
    id: 'pebbles',
    title: 'Pebble Sort',
    description: 'Sort smooth pebbles by colour.',
    position: [9.9, 2.2, 4],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#9A8A7A',
  },
]
