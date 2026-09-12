import { READING_PALETTE_PRESETS, SAND_READING_COLORS, resolveReadingColors, type ReadingPaletteState } from '../readingPalette';
import { useEscapeKey } from '../useEscapeKey';

interface ReadingPalettePickerProps {
  open: boolean;
  palette: ReadingPaletteState;
  onChange: (next: ReadingPaletteState) => void;
  onClose: () => void;
}

export function ReadingPalettePicker({ open, palette, onChange, onClose }: ReadingPalettePickerProps) {
  const resolved = resolveReadingColors(palette);

  useEscapeKey(() => { if (open) onClose(); });

  if (!open) return null;

  const pickerBg = resolved.bg || SAND_READING_COLORS.bg;
  const pickerFg = resolved.fg || SAND_READING_COLORS.fg;

  return (
    <div className="reading-palette-menu" role="dialog" aria-label="Reading colours">
      <p className="reading-palette-title">Reading colours</p>
      <p className="reading-palette-hint">Colours the story page only. The rest of the app still follows light or dark mode.</p>

      <div className="reading-palette-grid">
        <button
          type="button"
          className={`reading-palette-swatch${palette.presetId === 'default' ? ' is-selected' : ''}`}
          style={{ backgroundColor: SAND_READING_COLORS.bg, color: SAND_READING_COLORS.fg }}
          onClick={() => onChange({ presetId: 'default', customBg: null, customFg: null })}
        >
          <span className="reading-palette-sample">Aa</span>
          <span className="reading-palette-name">Sand</span>
        </button>
        {READING_PALETTE_PRESETS.map(preset => (
          <button
            type="button"
            key={preset.id}
            className={`reading-palette-swatch${palette.presetId === preset.id ? ' is-selected' : ''}`}
            style={{ backgroundColor: preset.bg, color: preset.fg }}
            onClick={() => onChange({ presetId: preset.id, customBg: null, customFg: null })}
          >
            <span className="reading-palette-sample">Aa</span>
            <span className="reading-palette-name">{preset.name}</span>
          </button>
        ))}
      </div>

      <div className="reading-palette-custom">
        <div className="reading-palette-custom-row">
          <span>Background</span>
          <input
            type="color"
            aria-label="Custom background colour"
            value={pickerBg}
            onChange={event => onChange({ ...palette, customBg: event.target.value })}
          />
          <button
            type="button"
            className={`reading-palette-reset${palette.customBg ? '' : ' is-active'}`}
            onClick={() => onChange({ ...palette, customBg: null })}
          >
            Default
          </button>
        </div>
        <div className="reading-palette-custom-row">
          <span>Font</span>
          <input
            type="color"
            aria-label="Custom font colour"
            value={pickerFg}
            onChange={event => onChange({ ...palette, customFg: event.target.value })}
          />
          <button
            type="button"
            className={`reading-palette-reset${palette.customFg ? '' : ' is-active'}`}
            onClick={() => onChange({ ...palette, customFg: null })}
          >
            Default
          </button>
        </div>
      </div>
    </div>
  );
}
