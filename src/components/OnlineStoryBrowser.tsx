import { useState, useEffect, useMemo, useCallback } from 'react';

/** Lightweight index entry (no markdown) */
export interface StoryIndexEntry {
  id: string;
  file: string;
  title: string;
  author: string;
  characters: string;
  audience: string;
  ageGroup?: string;
  framework?: string;
  style?: string;
  tone?: string;
  pacing?: string;
  humor?: string;
  emotion?: string;
  wordCount?: number;
  date: string;
  tags?: string[];
}

/** Full story (fetched on demand from individual file) */
export interface OnlineStory extends StoryIndexEntry {
  markdown: string;
}

type SortField = 'title' | 'date' | 'author';
type SortDir = 'asc' | 'desc';

interface OnlineStoryBrowserProps {
  onLoad: (story: OnlineStory) => void;
  onClose: () => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length <= len ? str : str.slice(0, len) + '\u2026';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function formatLabel(val: string | undefined): string {
  if (!val || val === 'default' || val === 'none') return '\u2014';
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Fetch full story content from the individual JSON file */
async function fetchStoryContent(entry: StoryIndexEntry): Promise<OnlineStory> {
  const res = await fetch(`./stories/${entry.file}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Detail panel (shown after fetching full story) ─────────────────────

function StoryDetailPanel({ entry, onBack, onLoad, showToast }: {
  entry: StoryIndexEntry;
  onBack: () => void;
  onLoad: (story: OnlineStory) => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}) {
  const [story, setStory] = useState<OnlineStory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStoryContent(entry)
      .then(s => { setStory(s); setLoading(false); })
      .catch(() => {
        showToast('Could not load story content.', 'error');
        setLoading(false);
      });
  }, [entry, showToast]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading story\u2026</div>;
  }

  return (
    <div className="lib-info-panel">
      <button className="lib-info-back" onClick={onBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to list
      </button>

      <h3 className="lib-info-title">{entry.title}</h3>

      <div className="lib-info-grid">
        <div className="lib-info-item">
          <span className="lib-info-label">Author</span>
          <span className="lib-info-value">{entry.author}</span>
        </div>
        <div className="lib-info-item">
          <span className="lib-info-label">Date</span>
          <span className="lib-info-value">{formatDate(entry.date)}</span>
        </div>
        {entry.wordCount != null && (
          <div className="lib-info-item">
            <span className="lib-info-label">Word Count</span>
            <span className="lib-info-value">{entry.wordCount.toLocaleString()}</span>
          </div>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <div className="lib-info-item">
            <span className="lib-info-label">Tags</span>
            <span className="lib-info-value">{entry.tags.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="lib-info-section">
        <h4>Story Settings</h4>
        <div className="lib-info-grid">
          <div className="lib-info-item">
            <span className="lib-info-label">Characters</span>
            <span className="lib-info-value">{entry.characters || '\u2014'}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Audience</span>
            <span className="lib-info-value">{entry.audience || '\u2014'}</span>
          </div>
          {entry.framework && (
            <div className="lib-info-item">
              <span className="lib-info-label">Framework</span>
              <span className="lib-info-value">{entry.framework}</span>
            </div>
          )}
          {entry.style && (
            <div className="lib-info-item">
              <span className="lib-info-label">Style</span>
              <span className="lib-info-value">{entry.style}</span>
            </div>
          )}
          <div className="lib-info-item">
            <span className="lib-info-label">Tone</span>
            <span className="lib-info-value">{formatLabel(entry.tone)}</span>
          </div>
          <div className="lib-info-item">
            <span className="lib-info-label">Humor</span>
            <span className="lib-info-value">{formatLabel(entry.humor)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button className="primary-btn" onClick={() => story && onLoad(story)} disabled={!story}>
          Load This Story
        </button>
      </div>
    </div>
  );
}

// ─── Main browser component ─────────────────────────────────────────────

export function OnlineStoryBrowser({ onLoad, onClose, showToast }: OnlineStoryBrowserProps) {
  const [index, setIndex] = useState<StoryIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedEntry, setSelectedEntry] = useState<StoryIndexEntry | null>(null);
  const [loadingStoryId, setLoadingStoryId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('./stories-index.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: StoryIndexEntry[]) => {
        setIndex(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not load the story database.');
        setLoading(false);
        console.error('Failed to load stories-index.json:', err);
      });
  }, []);

  const filtered = useMemo(() => {
    let list = index;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.characters.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'author') cmp = a.author.localeCompare(b.author);
      else cmp = a.date.localeCompare(b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [index, search, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  }, [sortField]);

  /** Directly load a story (fetch content then pass to parent) */
  const handleDirectLoad = useCallback(async (entry: StoryIndexEntry) => {
    setLoadingStoryId(entry.id);
    try {
      const story = await fetchStoryContent(entry);
      onLoad(story);
      showToast(`Loaded: ${story.title}`, 'success');
    } catch {
      showToast('Could not load story content.', 'error');
    } finally {
      setLoadingStoryId(null);
    }
  }, [onLoad, showToast]);

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lib-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Story Database ({index.length})</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {selectedEntry ? (
          <StoryDetailPanel
            entry={selectedEntry}
            onBack={() => setSelectedEntry(null)}
            onLoad={(story) => { onLoad(story); showToast(`Loaded: ${story.title}`, 'success'); }}
            showToast={showToast}
          />
        ) : (
          <>
            <div className="lib-search-bar">
              <input type="text" placeholder="Search by title, characters, author, or tags\u2026" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading stories\u2026</div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error, #c33)' }}>{error}</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                {search.trim() ? 'No stories match your search.' : 'No stories in the database yet.'}
              </div>
            ) : (
              <div className="lib-table-wrap">
                <table className="lib-table">
                  <thead>
                    <tr>
                      <th className="lib-th-title" onClick={() => toggleSort('title')} style={{ cursor: 'pointer' }}>Title{sortArrow('title')}</th>
                      <th className="lib-th-chars" onClick={() => toggleSort('author')} style={{ cursor: 'pointer' }}>Author{sortArrow('author')}</th>
                      <th className="lib-th-date" onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Date{sortArrow('date')}</th>
                      <th className="lib-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry, i) => (
                      <tr key={entry.id} className={i % 2 === 1 ? 'lib-row-alt' : ''}>
                        <td>{truncate(entry.title, 40)}</td>
                        <td>{truncate(entry.author, 25)}</td>
                        <td>{formatDate(entry.date)}</td>
                        <td className="lib-actions-cell">
                          <button className="lib-action-btn" title="View details" onClick={() => setSelectedEntry(entry)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </button>
                          <button
                            className="lib-action-btn"
                            title="Load this story"
                            disabled={loadingStoryId === entry.id}
                            onClick={() => handleDirectLoad(entry)}
                          >
                            {loadingStoryId === entry.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
