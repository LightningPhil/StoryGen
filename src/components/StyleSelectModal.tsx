import { ADJUSTMENT_MODULES } from '../prompts/adjustment_modules';

interface StyleSelectModalProps {
  selectedStyle: string;
  styles: Record<string, string>;
  toneAdj: string;
  pacingAdj: string;
  humorAdj: string;
  emotionAdj: string;
  onSelect: (key: string) => void;
  onToneChange: (v: string) => void;
  onPacingChange: (v: string) => void;
  onHumorChange: (v: string) => void;
  onEmotionChange: (v: string) => void;
  onClose: () => void;
}

function formatOptionLabel(key: string): string {
  if (key === 'default' || key === 'none') return 'Default (No adjustment)';
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function StyleSelectModal({
  selectedStyle, styles, onSelect, onClose,
  toneAdj, pacingAdj, humorAdj, emotionAdj,
  onToneChange, onPacingChange, onHumorChange, onEmotionChange,
}: StyleSelectModalProps) {
  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-xl">
        <header className="modal-header">
          <h2>Select Authorial Style</h2>
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body modal-body-split">
          <div className="modal-column modal-column-left">
            <p className="modal-description">Choose a style that influences the tone and voice of your story.</p>
            <div className="selection-grid">
              {Object.entries(styles).map(([key, summary]) => (
                <div
                  key={key}
                  className={`selection-card${key === selectedStyle ? ' selected' : ''}`}
                  onClick={() => onSelect(key)}
                >
                  <div className="selection-card-title">{key}</div>
                  <div className="selection-card-description">{summary}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-column modal-column-right">
            <h3>Fine-tune the Style</h3>
            <div className="field">
              <label htmlFor="toneSelect">Tone</label>
              <select id="toneSelect" value={toneAdj} onChange={e => onToneChange(e.target.value)}>
                {Object.keys(ADJUSTMENT_MODULES.tone).map(key => (
                  <option key={key} value={key}>{formatOptionLabel(key)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pacingSelect">Pacing</label>
              <select id="pacingSelect" value={pacingAdj} onChange={e => onPacingChange(e.target.value)}>
                {Object.keys(ADJUSTMENT_MODULES.pacing).map(key => (
                  <option key={key} value={key}>{formatOptionLabel(key)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="humorSelect">Humor Style</label>
              <select id="humorSelect" value={humorAdj} onChange={e => onHumorChange(e.target.value)}>
                {Object.keys(ADJUSTMENT_MODULES.humor).map(key => (
                  <option key={key} value={key}>{formatOptionLabel(key)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="emotionSelect">Emotional Journey</label>
              <select id="emotionSelect" value={emotionAdj} onChange={e => onEmotionChange(e.target.value)}>
                {Object.keys(ADJUSTMENT_MODULES.emotion).map(key => (
                  <option key={key} value={key}>{formatOptionLabel(key)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
