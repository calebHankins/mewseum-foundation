export const TREAT_DETECTION_RADIUS = 3.5
export const TREAT_REACH_DISTANCE = 0.4
export const TREAT_CLAIM_TIMEOUT = 15
export const DROP_FORWARD_OFFSET = 1.5
export const TREAT_REST_HEIGHT = 0.19
export const DROP_ANIM_DURATION = 0.3
export const TREAT_BOB_AMPLITUDE = 0.05
export const CAT_TREAT_SCALE_INCREASE = 0.1
export const CAT_TREAT_DIGESTION_DURATION = 20

export const TREAT_COLOR = '#D4955A'
export const TREAT_ACCENT = '#A77A52'
export const TREAT_COLORS = [TREAT_COLOR, '#91A98A', '#D4606A', TREAT_ACCENT] as const
export type TreatColor = (typeof TREAT_COLORS)[number]
export const DISPENSER_GLOBE_COLOR = '#C87050'
export const DISPENSER_BASE_COLOR = '#5C3D20'