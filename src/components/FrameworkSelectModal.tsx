import { normalizeLookupKey } from '../lookupKeys';
import { useEscapeKey } from '../useEscapeKey';

interface FrameworkSelectModalProps {
  selectedFramework: string;
  frameworks: Record<string, string>;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function FrameworkSelectModal({ selectedFramework, frameworks, onSelect, onClose }: FrameworkSelectModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-xl">
        <header className="modal-header">
          <h2>Select Story Framework</h2>
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          <p className="modal-description">Choose a structure that will guide how your story unfolds. Each framework offers a different approach to storytelling.</p>
          <div className="selection-grid">
            {Object.entries(frameworks).map(([key, summary]) => (
              <div
                key={key}
                className={`selection-card${normalizeLookupKey(key) === normalizeLookupKey(selectedFramework) ? ' selected' : ''}`}
                onClick={() => onSelect(key)}
              >
                <div className="selection-card-title">{key}</div>
                <div className="selection-card-description">{summary}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
