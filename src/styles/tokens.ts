// Visual tokens — ported from logos-co/flywheels.logos.co design language.
export const INK = '#1a1a1a';
export const PAPER = '#f4f1e8';
export const PANEL = '#faf8f1';
export const GRID = 'rgba(26,26,26,0.07)';
export const MUTED = 'rgba(26,26,26,0.45)';
export const SUBTLE = 'rgba(26,26,26,0.22)';
export const FAINT = 'rgba(26,26,26,0.10)';

export const MATCH_FILL = '#fff19a';
export const MATCH_NONE_BG = '#f6e2db';

// L-Prize accent (purple) — matches flywheels INSTRUMENT_COLOR['lambda-prize'].
export const LPRIZE = '#9c5da8';
export const LPRIZE_BORDER = '#b283bb';
export const LPRIZE_TINT = '#ecdcef';

// Status / lifecycle colors (cool -> warm).
export const STATUS_COLOR: Record<string, string> = {
  draft: '#9a958b',
  open: '#c39820',
  closed: '#1f5e3a',
  unknown: MUTED,
};
export const STATUS_FILL: Record<string, string> = {
  draft: 'transparent',
  open: '#fbecbe',
  closed: '#bdd9c7',
  unknown: 'transparent',
};

// 3-stage LP lifecycle: identified -> in_progress -> delivered.
export const LP_STAGES = [
  { id: 'identified', step: 1, label: 'Draft' },
  { id: 'published', step: 2, label: 'Open' },
  { id: 'delivered', step: 3, label: 'Closed' },
];
export const LP_STAGE_COLOR: Record<string, string> = {
  identified: '#9a958b',
  published: '#c39820',
  delivered: '#1f5e3a',
};

export const SIZE_COLOR: Record<string, string> = {
  XS: '#7d8a86', S: '#2c8a8e', M: '#2c6fcf', L: '#9c5da8', XL: '#b5402f',
};
// Normalize word sizes to letters.
export const SIZE_NORM: Record<string, string> = {
  Small: 'S', Medium: 'M', Large: 'L', XS: 'XS', S: 'S', M: 'M', L: 'L', XL: 'XL',
};

export const OK_GREEN = '#1f7a4d';
export const WARN_RED = '#c25540';
export const WARN_AMBER = '#c39820';
