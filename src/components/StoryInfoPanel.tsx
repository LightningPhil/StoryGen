import type { StoryMetadata } from '../types';

export type { StoryMetadata };

export function formatLibraryDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function formatDisplayLabel(val: string | undefined): string {
  if (!val || val === 'default' || val === 'none') return '\u2014';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface StoryInfoPanelProps {
  story: StoryMetadata;
  onBack?: () => void;
  backLabel?: string;
}

export function StoryInfoPanel({ story, onBack, backLabel }: StoryInfoPanelProps) {
  return (
    <div className="lib-info-panel">
      {onBack && (
        <button type="button" className="lib-info-back" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          {backLabel || 'Back to list'}
        </button>
      )}

      <h3 className="lib-info-title">{story.title}</h3>

      <div className="lib-info-grid">
        <div className="lib-info-item">
          <span className="lib-info-label">Date Created</span>
          <span className="lib-info-value">{formatLibraryDate(story.date)}</span>
        </div>
        {story.wordCount != null && (
          <div className="lib-info-item">
            <span className="lib-info-label">Word Count</span>
            <span className="lib-info-value">{story.wordCount.toLocaleString()}</span>
          </div>
        )}
        {story.model && (
          <div className="lib-info-item">
            <span className="lib-info-label">Model</span>
            <span className="lib-info-value">{story.model}</span>
          </div>
        )}
        {story.author && (
          <div className="lib-info-item">
            <span className="lib-info-label">Author</span>
            <span className="lib-info-value">{story.author}</span>
          </div>
        )}
      </div>

      <div className="lib-info-section">
        <h4>User Inputs</h4>
        <div className="lib-info-grid">
          <div className="lib-info-item lib-info-item--wide">
            <span className="lib-info-label">Characters</span>
            <span className="lib-info-value">{story.characters || '\u2014'}</span>
          </div>
          <div className="lib-info-item lib-info-item--wide">
            <span className="lib-info-label">Target Audience</span>
            <span className="lib-info-value">{story.audience || '\u2014'}</span>
          </div>
          {story.plotPoints && (
            <div className="lib-info-item lib-info-item--wide">
              <span className="lib-info-label">Plot Points</span>
              <span className="lib-info-value">{story.plotPoints}</span>
            </div>
          )}
        </div>
      </div>

      <div className="lib-info-section">
        <h4>Story Settings</h4>
        <div className="lib-info-grid">
          <div className="lib-info-item">
            <span className="lib-info-label">Framework</span>
            <span className="lib-info-value">{story.framework || '\u2014'}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Authorial Style</span>
            <span className="lib-info-value">{story.style || '\u2014'}</span>
          </div>
          {story.narrator && story.narrator !== 'Default (No Narrator Persona)' && (
            <div className="lib-info-item">
              <span className="lib-info-label">Narrator</span>
              <span className="lib-info-value">{story.narrator}</span>
            </div>
          )}
          <div className="lib-info-item">
            <span className="lib-info-label">Tone</span>
            <span className="lib-info-value">{formatDisplayLabel(story.tone)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Pacing</span>
            <span className="lib-info-value">{formatDisplayLabel(story.pacing)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Humor Style</span>
            <span className="lib-info-value">{formatDisplayLabel(story.humor)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Emotional Journey</span>
            <span className="lib-info-value">{formatDisplayLabel(story.emotion)}</span>
          </div>
          {story.ageGroup && (
            <div className="lib-info-item">
              <span className="lib-info-label">Age Group</span>
              <span className="lib-info-value">{story.ageGroup}</span>
            </div>
          )}
          {story.readingAge != null && (
            <div className="lib-info-item">
              <span className="lib-info-label">Reading Age</span>
              <span className="lib-info-value">{story.readingAge}</span>
            </div>
          )}
          {story.consolidator != null && (
            <div className="lib-info-item">
              <span className="lib-info-label">Consolidator</span>
              <span className="lib-info-value">{story.consolidator ? 'Enabled' : 'Disabled'}</span>
            </div>
          )}
        </div>
      </div>

      {story.tags && story.tags.length > 0 && (
        <div className="lib-info-section">
          <h4>Tags</h4>
          <div className="lib-info-tags">
            {story.tags.map((tag, i) => (
              <span key={i} className="lib-info-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
