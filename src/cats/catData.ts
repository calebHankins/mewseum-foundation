export interface CatDef {
  id: string
  name: string
  description: string
  position: [number, number, number]
  rotation: [number, number, number]
  color: string         // body color (hex)
  accentColor: string   // ear / paw accent
}

/**
 * CAT_REGISTRY — all cats that can be found in the Mewseum.
 * Add or remove entries here to populate the sanctuary.
 */
export const CAT_REGISTRY: CatDef[] = [
  {
    id: 'dusty',
    name: 'Dusty',
    description: 'A grey tabby who enjoys sunbeams.',
    position: [-5.5, 0, -7],
    rotation: [0, 0.8, 0],
    color: '#9E8C7A',
    accentColor: '#7A6A58',
  },
  {
    id: 'cinder',
    name: 'Cinder',
    description: 'Jet black with amber eyes. Very sleepy.',
    position: [4, 0, -9],
    rotation: [0, -0.5, 0],
    color: '#2A2020',
    accentColor: '#1A1414',
  },
  {
    id: 'marmalade',
    name: 'Marmalade',
    description: 'Orange and loud. Loves being petted.',
    position: [-3, 0, 5],
    rotation: [0, 1.2, 0],
    color: '#D4804A',
    accentColor: '#B86030',
  },
  {
    id: 'pebble',
    name: 'Pebble',
    description: 'Small and round. Naps on benches.',
    position: [5, 0.5, 9],
    rotation: [0, -1.8, 0],
    color: '#C8B49A',
    accentColor: '#A89070',
  },
  {
    id: 'inkblot',
    name: 'Inkblot',
    description: 'Mostly white with black patches.',
    position: [7, 0, 2],
    rotation: [0, 2.5, 0],
    color: '#E8E0D4',
    accentColor: '#302020',
  },
  {
    id: 'pingu',
    name: 'Pingu',
    description: 'A dapper tuxedo cat always dressed for the occasion.',
    position: [0, 0, -2],
    rotation: [0, -0.2, 0],
    color: '#1a1a1a',
    accentColor: '#ffffff',
  },
]
