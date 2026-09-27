// ─────────────────────────────────────────────────────────────────────────────
// Social properties for cats
// ─────────────────────────────────────────────────────────────────────────────
// 0 = very antisocial, 10 = super social (how often they seek friends)
export type SocialDrive = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

// 0 = never social, 1 = always social (maximum time between social interactions)
export type SocialFatigue = number

export interface CatDef {
  id: string
  name: string
  description: string
  position: [number, number, number]
  rotation: [number, number, number]
  color: string         // body color (hex)
  accentColor: string   // ear / paw accent
  socialDrive?: SocialDrive     // how eager to socialize (default: 5)
  socialFatigue?: SocialFatigue // time between social interactions (default: 15)
}

/**
 * CAT_REGISTRY — all cats that can be found in the Mewseum.
 * Add or remove entries here to populate the sanctuary.
 */
export const CAT_REGISTRY: CatDef[] = [
  {
    id: 'dusty',
    name: 'Dusty',
    description: 'A grey tabby who enjoys sunbeams. Moderately social.',
    position: [-5.5, 0, -7],
    rotation: [0, 0.8, 0],
    color: '#9E8C7A',
    accentColor: '#7A6A58',
    socialDrive: 6,
    socialFatigue: 20,
  },
  {
    id: 'cinder',
    name: 'Cinder',
    description: 'Jet black with amber eyes. Very sleepy. Low social drive.',
    position: [4, 0, -9],
    rotation: [0, -0.5, 0],
    color: '#2A2020',
    accentColor: '#1A1414',
    socialDrive: 2,
    socialFatigue: 30,
  },
  {
    id: 'marmalade',
    name: 'Marmalade',
    description: 'Orange and loud. Loves being petted. Very social!',
    position: [-3, 0, 5],
    rotation: [0, 1.2, 0],
    color: '#D4804A',
    accentColor: '#B86030',
    socialDrive: 9,
    socialFatigue: 10,
  },
  {
    id: 'casper',
    name: 'Casper',
    description: 'Small and round. Naps on benches. Likes solitude.',
    position: [5, 0.5, 9],
    rotation: [0, -1.8, 0],
    color: '#C8B49A',
    accentColor: '#A89070',
    socialDrive: 3,
    socialFatigue: 25,
  },
  {
    id: 'inkblot',
    name: 'Inkblot',
    description: 'Mostly white with black patches. Friendly neighbor.',
    position: [7, 0, 2],
    rotation: [0, 2.5, 0],
    color: '#E8E0D4',
    accentColor: '#302020',
    socialDrive: 7,
    socialFatigue: 18,
  },
  {
    id: 'pingu',
    name: 'Pingu',
    description: 'A dapper tuxedo cat always dressed for the occasion. Super social!',
    position: [0, 0, -2],
    rotation: [0, -0.2, 0],
    color: '#1a1a1a',
    accentColor: '#ffffff',
    socialDrive: 10,
    socialFatigue: 8,
  },
  {
    id: 'cali',
    name: 'Cali',
    description: 'A beautiful calico with white, orange, and black patches. Curious and gentle.',
    position: [-7, 0, 3],
    rotation: [0, 1.5, 0],
    color: '#ffffff',
    accentColor: '#D4804A',
    socialDrive: 5,
    socialFatigue: 20,
  },
  {
    id: 'juniper',
    name: 'Juniper',
    description: 'A soft sage-green stray who watches the room from a quiet corner. Shy but curious.',
    position: [8.5, 0, -3.5],
    rotation: [0, -1.1, 0],
    color: '#A8AA82',
    accentColor: '#797B59',
    socialDrive: 3,
    socialFatigue: 26,
  },
  {
    id: 'pebble',
    name: 'Pebble',
    description: 'A round little brown tabby who follows every interesting sound. Friendly and playful.',
    position: [-8.5, 0, 0],
    rotation: [0, 0.4, 0],
    color: '#9A795B',
    accentColor: '#73563D',
    socialDrive: 8,
    socialFatigue: 14,
  },
  {
    id: 'saffron',
    name: 'Saffron',
    description: 'A pale cream cat with golden ears who loves a peaceful nap. Gentle and independent.',
    position: [2, 0, 3],
    rotation: [0, 2.1, 0],
    color: '#E4D5B7',
    accentColor: '#C79A5A',
    socialDrive: 4,
    socialFatigue: 24,
  },
]
