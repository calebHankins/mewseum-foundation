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
    position: [9.9, 2.2, -4],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#5A7A9A',
    badgeGlyph: '🌧️',
  },
  {
    id: 'pebbles',
    title: 'Pebble Sort',
    description: 'Sort smooth pebbles by colour.',
    position: [9.9, 2.2, 4],
    rotation: [0, -Math.PI / 2, 0],
    accentColor: '#9A8A7A',
    badgeGlyph: '🪨',
  },
]
