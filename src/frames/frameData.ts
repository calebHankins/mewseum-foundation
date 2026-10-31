export interface FrameDef {
  id: string
  title: string
  description: string
  url?: string
  position: [number, number, number]
  rotation: [number, number, number]
  accentColor: string
  badgeGlyph?: string
}

/**
 * FRAME_DATA — the Sanctuary Exhibits / Found Frames.
 * Each entry is a game or experience accessible from the Mewseum.
 * Add `url` values when an exhibit has a real destination.
 */
export const FRAME_DATA: FrameDef[] = [
  {
    id: 'breathe',
    title: 'Breathe',
    description: 'A gentle breathing exercise game.',
    position: [-2.5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#5A8A8A',
    badgeGlyph: '🌬️',
  },
  {
    id: 'garden',
    title: 'Quiet Garden',
    description: 'Tend a small pixel garden.',
    position: [-7.5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#4A7A3A',
    badgeGlyph: '🌱',
  },
  {
    id: 'sober-life-ii',
    title: 'SoberLife II',
    description: 'Try to make it through the day without getting too stressed!',
    url: 'https://calebhankins.github.io/SoberLife-II/',
    position: [2.5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#6A5A8A',
    badgeGlyph: '😱',
  },
  {
    id: 'sober-life-iii',
    title: 'SoberLife III',
    description: 'A life-sim about recovery and small victories.',
    url: 'https://calebhankins.github.io/SoberLife-III/',
    position: [7.5, 2.2, -11.9],
    rotation: [0, 0, 0],
    accentColor: '#7A6A9A',
    badgeGlyph: '🧘‍♀️',
  },
  {
    id: 'rain',
    title: 'Rain Room',
    description: 'Listen to procedural rain.',
    position: [9.9, 2.2, -5.5],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#5A7A9A',
    badgeGlyph: '🌧️',
  },
  {
    id: 'pebbles',
    title: 'Pebble Sort',
    description: 'Sort smooth pebbles by colour.',
    position: [9.9, 2.2, 5.5],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#9A8A7A',
    badgeGlyph: '🪨',
  },
  {
    id: 'ecohex4',
    title: 'EcoHex 4',
    description: 'Build a thriving hex ecosystem and balance its food web.',
    url: 'https://calebhankins.github.io/Bruce-Box/games/ecohex4/',
    position: [24, 2.2, -8.9],
    rotation: [0, 0, 0],
    accentColor: '#639B75',
    badgeGlyph: '🌿',
  },
  {
    id: 'hopper2',
    title: 'Hopper 2',
    description: 'Hop across a puzzle board, gather pigments, and rescue friends.',
    url: 'https://calebhankins.github.io/Bruce-Box/games/hopper2/',
    position: [33, 2.2, -8.9],
    rotation: [0, 0, 0],
    accentColor: '#B27A4D',
    badgeGlyph: '🍄',
  },
  {
    id: 'my-garden-grow',
    title: 'My Garden Grow',
    description: 'Turn a stubborn patch into a garden over five years.',
    url: 'https://calebhankins.github.io/Bruce-Box/games/my-garden-grow/',
    position: [24, 2.2, 8.9],
    rotation: [0, Math.PI, 0],
    accentColor: '#7E9653',
    badgeGlyph: '🌷',
  },
  {
    id: 'smother3',
    title: 'Smother 3',
    description: 'Race for the star through a maze of waking walls.',
    url: 'https://calebhankins.github.io/Bruce-Box/games/smother3/',
    position: [33, 2.2, 8.9],
    rotation: [0, Math.PI, 0],
    accentColor: '#8D748F',
    badgeGlyph: '⭐',
  },
]
