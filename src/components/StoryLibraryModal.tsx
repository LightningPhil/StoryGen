import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllStories, deleteStoryFromLibrary, type SavedStory } from '../storyLibrary';
import { StoryInfoPanel, formatLibraryDate } from './StoryInfoPanel';
import { useEscapeKey } from '../useEscapeKey';

type SortField = 'title' | 'date';
type SortDir = 'asc' | 'desc';

interface StoryLibraryModalProps {
  onLoad: (story: SavedStory) => void;
  onClose: () => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

function truncateText(str: string, len: number): string {
  if (!str) return '';
  return str.length <= len ? str : str.slice(0, len) + '\u2026';
}

function matchesQuery(value: string | undefined, query: string): boolean {
  return (value || '').toLowerCase().includes(query);
}

export function StoryLibraryModal({ onLoad, onClose, showToast }: StoryLibraryModalProps) {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [infoStory, setInfoStory] = useState<SavedStory | null>(null);

  // Escape steps back out of the info panel before it closes the whole modal.
  useEscapeKey(useCallback(() => {
    if (infoStory) setInfoStory(null);
    else onClose();
  }, [infoStory, onClose]));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getAllStories()
      .then(nextStories => {
        if (cancelled) return;
        setStories(nextStories);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        showToast('Could not load saved stories.', 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = stories;
    if (q) {
      list = stories.filter(s =>
        matchesQuery(s.title, q) ||
        matchesQuery(s.characters, q) ||
        matchesQuery(s.framework, q) ||
        matchesQuery(s.style, q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortField === 'title') {
        const cmp = (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [stories, search, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(currentDir => currentDir === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortDir(field === 'date' ? 'desc' : 'asc');
  }, [sortField]);

  const handleDelete = useCallback(async (id: number | undefined) => {
    if (id == null) {
      showToast('This story cannot be deleted because it has no library id.', 'error');
      return;
    }

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
    if (sortField !== field) return <span className="lib-sort-arrow lib-sort-arrow--inactive">{'\u2195'}</span>;
    return <span className="lib-sort-arrow">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  return (
    <div className="modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content modal-xl lib-modal">
        <header className="modal-header">
          <h2>Story Library</h2>
          <button type="button" className="modal-close" aria-label="Close modal" onClick={onClose}>&times;</button>
        </header>

        {infoStory ? (
          <StoryInfoPanel story={infoStory} onBack={() => setInfoStory(null)} />
        ) : (
          <>
            <div className="lib-toolbar">
              <div className="lib-search-wrap">
                <svg className="lib-search-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="lib-search"
                  type="text"
                  placeholder={'Search stories\u2026'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button type="button" className="lib-search-clear" onClick={() => setSearch('')} aria-label="Clear search">&times;</button>
                )}
              </div>
              <span className="lib-count">
                {loading ? '\u2026' : `${filtered.length} stor${filtered.length === 1 ? 'y' : 'ies'}`}
              </span>
            </div>

            <div className="lib-header-row">
              <button type="button" className="lib-col lib-col-title lib-col-sortable" onClick={() => toggleSort('title')}>
                Title {sortArrow('title')}
              </button>
              <span className="lib-col lib-col-chars">Characters</span>
              <button type="button" className="lib-col lib-col-date lib-col-sortable" onClick={() => toggleSort('date')}>
                Date {sortArrow('date')}
              </button>
              <span className="lib-col lib-col-actions">Actions</span>
            </div>

            <div className="lib-list">
              {loading ? (
                <div className="lib-empty">{'Loading stories\u2026'}</div>
              ) : filtered.length === 0 ? (
                <div className="lib-empty">
                  {search ? 'No stories match your search.' : 'No saved stories yet. Generate a story and it will appear here.'}
                </div>
              ) : (
                filtered.map(story => (
                  <div key={story.id ?? `${story.title}-${story.date}`} className="lib-row">
                    <span className="lib-col lib-col-title lib-title-text" title={story.title}>
                      {story.title}
                    </span>
                    <span className="lib-col lib-col-chars" title={story.characters}>
                      {truncateText(story.characters || '', 40)}
                    </span>
                    <span className="lib-col lib-col-date">
                      {formatLibraryDate(story.date)}
                    </span>
                    <span className="lib-col lib-col-actions">
                      {confirmDeleteId === story.id ? (
                        <span className="lib-confirm-delete">
                          <span className="lib-confirm-text">Delete?</span>
                          <button type="button" className="lib-action-btn lib-action-btn--danger" title="Confirm delete" onClick={() => handleDelete(story.id)}>Yes</button>
                          <button type="button" className="lib-action-btn" title="Cancel" onClick={() => setConfirmDeleteId(null)}>No</button>
                        </span>
                      ) : (
                        <>
                          <button type="button" className="lib-action-btn" title="Story info" onClick={() => setInfoStory(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          </button>
                          <button type="button" className="lib-action-btn lib-action-btn--primary" title="Load story" onClick={() => onLoad(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          </button>
                          <button type="button" className="lib-action-btn" title="Download as Markdown" onClick={() => handleDownload(story)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          </button>
                          <button
                            type="button"
                            className="lib-action-btn lib-action-btn--danger"
                            title={story.id == null ? 'Story cannot be deleted' : 'Delete story'}
                            onClick={() => story.id != null && setConfirmDeleteId(story.id)}
                            disabled={story.id == null}
                          >
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
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
