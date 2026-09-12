export interface ReadingPalettePreset {
  id: string;
  name: string;
  bg: string;
  fg: string;
}

export interface ReadingPaletteState {
  presetId: string;
  customBg: string | null;
  customFg: string | null;
}

export const DEFAULT_READING_PALETTE: ReadingPaletteState = {
  presetId: 'default',
  customBg: null,
  customFg: null,
};

/** Sand is the built-in light-mode reading paper. */
export const SAND_READING_COLORS = { bg: '#f1ebe1', fg: '#4b453c' };

export const READING_PALETTE_PRESETS: ReadingPalettePreset[] = [
  { id: 'linen', name: 'Linen', bg: '#f0eee8', fg: '#454440' },
  { id: 'parchment', name: 'Parchment', bg: '#f3efe6', fg: '#4a4640' },
  { id: 'mist', name: 'Mist', bg: '#eef1f3', fg: '#41464c' },
  { id: 'sage', name: 'Sage', bg: '#e8ebe4', fg: '#424843' },
  { id: 'blush', name: 'Rosewater', bg: '#f4e6e8', fg: '#4a3f42' },
  { id: 'sky', name: 'Forget-me-not', bg: '#e4ecf3', fg: '#3d4650' },
  { id: 'lavender', name: 'Lavender', bg: '#eeeaf0', fg: '#46424c' },
  { id: 'honey', name: 'Honey', bg: '#f3ebd8', fg: '#4a4438' },
  { id: 'seafoam', name: 'Seafoam', bg: '#e6eeec', fg: '#3f4a48' },
];

const PRESET_BY_ID = new Map(READING_PALETTE_PRESETS.map(preset => [preset.id, preset]));

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function parseReadingPalette(raw: string | null): ReadingPaletteState {
  if (!raw) return { ...DEFAULT_READING_PALETTE };
  try {
    const parsed = JSON.parse(raw) as Partial<ReadingPaletteState>;
    const presetId = typeof parsed.presetId === 'string' && (parsed.presetId === 'default' || parsed.presetId === 'sand' || PRESET_BY_ID.has(parsed.presetId))
      ? (parsed.presetId === 'sand' ? 'default' : parsed.presetId)
      : 'default';
    const customBg = typeof parsed.customBg === 'string' && isHexColor(parsed.customBg) ? parsed.customBg : null;
    const customFg = typeof parsed.customFg === 'string' && isHexColor(parsed.customFg) ? parsed.customFg : null;
    return { presetId, customBg, customFg };
  } catch {
    return { ...DEFAULT_READING_PALETTE };
  }
}

export function getPreset(id: string): ReadingPalettePreset | undefined {
  return PRESET_BY_ID.get(id);
}

export function resolveReadingColors(
  palette: ReadingPaletteState,
): { bg: string | null; fg: string | null } {
  let bg: string | null = SAND_READING_COLORS.bg;
  let fg: string | null = SAND_READING_COLORS.fg;

  if (palette.presetId !== 'default') {
    const preset = PRESET_BY_ID.get(palette.presetId);
    if (preset) {
      bg = preset.bg;
      fg = preset.fg;
    }
  }

  if (palette.customBg) bg = palette.customBg;
  if (palette.customFg) fg = palette.customFg;
  return { bg, fg };
}
