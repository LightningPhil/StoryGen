import { ADJUSTMENT_MODULES } from '../prompts/adjustment_modules';

interface StyleSelectModalProps {
  selectedStyle: string;
  styles: Record<string, string>;
  onSelect: (key: string) => void;
  onClose: () => void;
}
// Note: Adjustment dropdowns are in this modal but controlled by App.tsx via props
// For now, they're passed via the modal and saved via onSelect
// The parent manages tone/pacing/humor/emotion state

export function StyleSelectModal({ selectedStyle, styles, onSelect, onClose }: StyleSelectModalProps & {
  toneAdj?: string;
  pacingAdj?: string;
  humorAdj?: string;
  emotionAdj?: string;
  onToneChange?: (v: string) => void;
  onPacingChange?: (v: string) => void;
  onHumorChange?: (v: string) => void;
  onEmotionChange?: (v: string) => void;
}) {
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
        </div>
        <footer className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
