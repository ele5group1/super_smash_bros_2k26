/**
 * Design Tokens for Scenario Battle Simulator (TypeScript mapping)
 * Matches frontend/src/styles/tokens.css
 */

export const spacing = {
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  8: 'var(--space-8)',
  10: 'var(--space-10)',
  12: 'var(--space-12)',
  16: 'var(--space-16)',
} as const;

export const radius = {
  none: 'var(--radius-none)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: 'var(--radius-full)',
} as const;

export const typography = {
  fontSans: 'var(--font-family-sans)',
  fontDisplay: 'var(--font-family-display)',
  fontSizeSmall: 'var(--font-size-small)',
  fontSizeBody: 'var(--font-size-body)',
  fontSizeH3: 'var(--font-size-h3)',
  fontSizeH2: 'var(--font-size-h2)',
  fontSizeH1: 'var(--font-size-h1)',
  fontSizeDisplay: 'var(--font-size-display)',
  fontWeightRegular: 'var(--font-weight-regular)',
  fontWeightBold: 'var(--font-weight-bold)',
} as const;

export const motion = {
  durationShort: 'var(--duration-short)',
  durationMedium: 'var(--duration-medium)',
  durationLong: 'var(--duration-long)',
  easeStandard: 'var(--ease-standard)',
  easeDecelerate: 'var(--ease-decelerate)',
  easeAccelerate: 'var(--ease-accelerate)',
} as const;

export const creatureTypes = ['fire', 'water', 'grass', 'electric', 'stone'] as const;
export type CreatureType = typeof creatureTypes[number];

export const creatureColors: Record<CreatureType, { text: string; bg: string }> = {
  fire: { text: 'var(--color-fire)', bg: 'var(--color-fire-bg)' },
  water: { text: 'var(--color-water)', bg: 'var(--color-water-bg)' },
  grass: { text: 'var(--color-grass)', bg: 'var(--color-grass-bg)' },
  electric: { text: 'var(--color-electric)', bg: 'var(--color-electric-bg)' },
  stone: { text: 'var(--color-stone)', bg: 'var(--color-stone-bg)' },
};

export const statusColors = {
  success: { text: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  warning: { text: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  error: { text: 'var(--color-error)', bg: 'var(--color-error-bg)' },
  info: { text: 'var(--color-info)', bg: 'var(--color-info-bg)' },
} as const;
