import { StoryInfoPanel, type StoryMetadata } from './StoryInfoPanel';
import { useEscapeKey } from '../useEscapeKey';

interface StoryMetadataModalProps {
  story: StoryMetadata;
  onClose: () => void;
}

export function StoryMetadataModal({ story, onClose }: StoryMetadataModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-lg">
        <header className="modal-header">
          <h2>Story Information</h2>
          <button type="button" className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          <StoryInfoPanel story={story} />
        </div>
      </div>
    </div>
  );
}
