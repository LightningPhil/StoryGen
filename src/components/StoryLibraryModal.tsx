import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllStories, deleteStoryFromLibrary, type SavedStory } from '../storyLibrary';

type SortField = 'title' | 'date';
type SortDir = 'asc' | 'desc';

interface StoryLibraryModalProps {
  onLoad: (story: SavedStory) => void;
  onClose: () => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length <= len ? str : str.slice(0, len) + '…';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function formatLabel(val: string | undefined): string {
  if (!val || val === 'default' || val === 'none') return '—';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StoryInfoPanel({ story, onBack }: { story: SavedStory; onBack: () => void }) {
  return (
    <div className="lib-info-panel">
      <button className="lib-info-back" onClick={onBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to list
      </button>

      <h3 className="lib-info-title">{story.title}</h3>

      <div className="lib-info-grid">
        <div className="lib-info-item">
          <span className="lib-info-label">Date Created</span>
          <span className="lib-info-value">{formatDate(story.date)}</span>
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
      </div>

      <div className="lib-info-section">
        <h4>User Inputs</h4>
        <div className="lib-info-grid">
          <div className="lib-info-item lib-info-item--wide">
            <span className="lib-info-label">Characters</span>
            <span className="lib-info-value">{story.characters || '—'}</span>
          </div>
          <div className="lib-info-item lib-info-item--wide">
            <span className="lib-info-label">Target Audience</span>
            <span className="lib-info-value">{story.audience || '—'}</span>
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
            <span className="lib-info-value">{story.framework || '—'}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Authorial Style</span>
            <span className="lib-info-value">{story.style || '—'}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Tone</span>
            <span className="lib-info-value">{formatLabel(story.tone)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Pacing</span>
            <span className="lib-info-value">{formatLabel(story.pacing)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Humor Style</span>
            <span className="lib-info-value">{formatLabel(story.humor)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Emotional Journey</span>
            <span className="lib-info-value">{formatLabel(story.emotion)}</span>
          </div>
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
    </div>
  );
}

export function StoryLibraryModal({ onLoad, onClose, showToast }: StoryLibraryModalProps) {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [infoStory, setInfoStory] = useState<SavedStory | null>(null);

  useEffect(() => {
    getAllStories().then(s => { setStories(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = stories;
    if (q) {
      list = stories.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.characters.toLowerCase().includes(q) ||
        s.framework.toLowerCase().includes(q) ||
        s.style.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortField === 'title') {
        const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [stories, search, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  }, [sortField]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteStoryFromLibrary(id);
      setStories(prev => prev.filter(s => s.id !== id));
      setConfirmDeleteId(null);
      showToast('Story deleted', 'info');
    } catch {
      showToast('Failed to delete story', 'error');
    }
  }, [showToast]);

  const handleDownload = useCallback((story: SavedStory) => {
    const blob = new Blob([story.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9 _-]/gi, '').trim() || 'story'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return <span className="lib-sort-arrow lib-sort-arrow--inactive">↕</span>;
    return <span className="lib-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-xl lib-modal">
        <header className="modal-header">
          <h2>Story Library</h2>
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>

        {infoStory ? (
          <StoryInfoPanel story={infoStory} onBack={() => setInfoStory(null)} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="lib-toolbar">
              <div className="lib-search-wrap">
                <svg className="lib-search-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="lib-search"
                  type="text"
                  placeholder="Search stories…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button className="lib-search-clear" onClick={() => setSearch('')} aria-label="Clear search">&times;</button>
                )}
              </div>
              <span className="lib-count">
                {loading ? '…' : `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'}`}
              </span>
            </div>

            {/* Column headers */}
            <div className="lib-header-row">
              <button className="lib-col lib-col-title lib-col-sortable" onClick={() => toggleSort('title')}>
                Title {sortArrow('title')}
              </button>
              <span className="lib-col lib-col-chars">Characters</span>
              <button className="lib-col lib-col-date lib-col-sortable" onClick={() => toggleSort('date')}>
                Date {sortArrow('date')}
              </button>
              <span className="lib-col lib-col-actions">Actions</span>
            </div>

            {/* Story list */}
            <div className="lib-list">
              {loading ? (
                <div className="lib-empty">Loading stories…</div>
              ) : filtered.length === 0 ? (
                <div className="lib-empty">
                  {search ? 'No stories match your search.' : 'No saved stories yet. Generate a story and it will appear here.'}
                </div>
              ) : (
                filtered.map(story => (
                  <div key={story.id} className="lib-row">
                    <span className="lib-col lib-col-title lib-title-text" title={story.title}>
                      {story.title}
                    </span>
                    <span className="lib-col lib-col-chars" title={story.characters}>
                      {truncate(story.characters, 40)}
                    </span>
                    <span className="lib-col lib-col-date">
                      {formatDate(story.date)}
                    </span>
                    <span className="lib-col lib-col-actions">
                      {confirmDeleteId === story.id ? (
                        <span className="lib-confirm-delete">
                          <span className="lib-confirm-text">Delete?</span>
                          <button className="lib-action-btn lib-action-btn--danger" title="Confirm delete" onClick={() => handleDelete(story.id!)}>Yes</button>
                          <button className="lib-action-btn" title="Cancel" onClick={() => setConfirmDeleteId(null)}>No</button>
                        </span>
                      ) : (
                        <>
                          <button className="lib-action-btn" title="Story info" onClick={() => setInfoStory(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          </button>
                          <button className="lib-action-btn lib-action-btn--primary" title="Load story" onClick={() => onLoad(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          </button>
                          <button className="lib-action-btn" title="Download as Markdown" onClick={() => handleDownload(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                          <button className="lib-action-btn lib-action-btn--danger" title="Delete story" onClick={() => setConfirmDeleteId(story.id!)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <footer className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
