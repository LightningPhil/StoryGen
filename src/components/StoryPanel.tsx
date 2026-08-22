import { useRef, useCallback, useEffect, forwardRef } from 'react';
import appState from '../appState';
import { formatStoryAsHtml } from '../formatStory';
import type { ToastMessage } from '../App';

interface StoryPanelProps {
  title: string;
  storyHtml: string;
  storyMarkdown: string;
  statusText: string;
  hasStory: boolean;
  isGenerating: boolean;
  fontSize: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onElaborate: () => void;
  onOpenLibrary: () => void;
  onOpenOnlineBrowser?: () => void;
  onExportJson?: () => void;
  onWordClick?: (word: string, wordIndex: number | null) => void;
  onShowInfo?: () => void;
  onFileLoaded?: (title: string, text: string) => void;
  showToast: (msg: string, type?: ToastMessage['type']) => void;
}

const WELCOME_TEXT = 'Welcome to StoryGen!\n\nStoryGen was created to help children with reading \u2014 specifically to aid understanding and pronunciation of new words. Tap any word in a story to hear it spoken aloud, see its definition, and explore examples.\n\nRather than asking one AI to write a story in one go, StoryGen uses a team of specialist agents \u2014 a Crafter writes the first draft, an Elaborator adds detail, a Reviewer gives feedback, a Polisher refines, a Cleaner tidies up, and a Titler names the finished story.\n\nTo create a story:\n1. Enter your characters in the Characters field\n2. Set your target audience (e.g. \u201cchildren aged 5-7\u201d)\n3. Choose a Story Framework and Authorial Style\n4. Click \u201cGenerate Story\u201d\n\nYou can also open a previously saved story \u2014 use the folder icon (\uD83D\uDCC2) at the top right to load a .md or .txt file.\n\nFirst time? Configure your Gemini API Key in Settings (\u2699\uFE0F). Need help? Click the question mark icon (\u2753) to open the Help Wiki.\n\nStories can be made using various Frameworks and Authorial Styles. They don\u2019t copy the work of the authors and creators they\u2019re based on \u2014 they were chosen to explore stories crafted with an enthusiasm that leans in different directions. It\u2019s well worth exploring the stories created with the same characters and plot points using different combinations of Frameworks and Authorial Styles.\n\nWhile there is argument that LLMs have been trained on copyrighted content, we\u2019re asking for unique creations and not duplications here. The purpose is absolutely for educational purposes only. Use what\u2019s learned here as a stepping stone to explore the real works of great authors. Enjoy, create your own stories, learn and then explore the rich world of books.';

export const StoryPanel = forwardRef<HTMLElement, StoryPanelProps>(function StoryPanel(props, ref) {
  const {
    title, storyHtml, storyMarkdown, statusText, hasStory, isGenerating,
    fontSize, onIncreaseFontSize, onDecreaseFontSize,
    onElaborate, onOpenLibrary, onOpenOnlineBrowser, onExportJson, onWordClick, onShowInfo, onFileLoaded, showToast,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyArticleRef = useRef<HTMLElement>(null);

  // Merge forwarded ref with local ref
  const setRefs = useCallback((el: HTMLElement | null) => {
    storyArticleRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
  }, [ref]);

  // Handle word clicks on .story-word spans
  useEffect(() => {
    const el = storyArticleRef.current;
    if (!el || !onWordClick) return;

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.story-word') as HTMLElement | null;
      if (!target) {
        // Clicked whitespace — clear selection
        el.querySelectorAll('.story-word.is-selected').forEach(s => s.classList.remove('is-selected'));
        onWordClick('', null);
        return;
      }
      const word = target.getAttribute('data-story-word') || target.textContent || '';
      if (!word) return;
      const wordIndex = Array.from(el.querySelectorAll('.story-word')).indexOf(target);

      // Remove previous selection, highlight clicked word
      el.querySelectorAll('.story-word.is-selected').forEach(s => s.classList.remove('is-selected'));
      target.classList.add('is-selected');

      onWordClick(word.trim(), wordIndex >= 0 ? wordIndex : null);
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onWordClick, storyHtml]);

  const handleCopy = useCallback(() => {
    if (storyMarkdown) {
      navigator.clipboard.writeText(storyMarkdown)
        .then(() => showToast('Story copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy story.', 'error'));
    }
  }, [showToast, storyMarkdown]);

  const handleSave = useCallback(() => {
    if (!storyMarkdown) return;
    const storyTitle = title || 'Untitled Story';
    const dateStr = new Date().toISOString().split('T')[0];

    let md = '---\n';
    md += `title: "${storyTitle.replace(/"/g, '\\"')}"\n`;
    md += `date: ${dateStr}\n`;
    md += '---\n\n';
    md += `# ${storyTitle}\n\n`;
    md += storyMarkdown;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = storyTitle.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase() || 'untitled_story';
    a.download = `${safeFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Story saved as markdown!', 'success');
  }, [showToast, storyMarkdown, title]);

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      let fileTitle = '';
      let storyBody = content;

      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        storyBody = content.slice(frontmatterMatch[0].length);
        const titleMatch = frontmatter.match(/^title:\s*"?(.*?)"?\s*$/m);
        if (titleMatch) fileTitle = titleMatch[1];
      }

      storyBody = storyBody.replace(/^\s+/, '');
      const headingMatch = storyBody.match(/^#\s+(.+)\r?\n+/);
      if (headingMatch) {
        if (!fileTitle) fileTitle = headingMatch[1];
        if (headingMatch[1].trim() === fileTitle.trim()) {
          storyBody = storyBody.slice(headingMatch[0].length);
        }
      }

      if (!fileTitle) {
        fileTitle = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[_-]/g, ' ');
      }

      storyBody = storyBody.trim();
      if (!storyBody) {
        showToast('The file appears to be empty.', 'error');
        return;
      }

      if (onFileLoaded) {
        onFileLoaded(fileTitle, storyBody);
      } else {
        appState.latestGeneratedStoryTitle = fileTitle;
        appState.latestGeneratedStoryText = storyBody;
      }
      showToast(`Loaded: ${fileTitle}`, 'success');
    };
    reader.onerror = () => showToast('Could not read the file.', 'error');
    reader.readAsText(file);
    e.target.value = '';
  }, [onFileLoaded, showToast]);

  // Determine what to show
  const showContent = storyHtml || hasStory;
  const displayTitle = title || 'Your Story Title Will Appear Here';
  const titleClass = title ? '' : ' placeholder';

  // The story html to render - during generation show status, otherwise show story or welcome
  const htmlToRender = isGenerating && !storyHtml
    ? ''
    : (storyHtml || formatStoryAsHtml(WELCOME_TEXT));

  return (
    <main className="story-panel">
      <header className="story-header">
        <h2 className={titleClass}>{displayTitle}</h2>
        <div className="story-actions">
          <button className="icon-button" aria-label="Open a saved story" title="Open a saved story" onClick={handleOpenFile}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button className="icon-button" aria-label="Story Library" title="Story Library" onClick={onOpenLibrary}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </button>
          {onOpenOnlineBrowser && (
            <button className="icon-button" aria-label="Story Database" title="Browse Story Database" onClick={onOpenOnlineBrowser}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".md,.markdown,.txt" className="hidden" aria-hidden="true" onChange={handleFileChange} />
          {hasStory && (
            <>
              <button className="icon-button" aria-label="Save story" title="Save as Markdown" onClick={handleSave}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              {onExportJson && (
                <button className="icon-button" aria-label="Export as JSON" title="Export as JSON" onClick={onExportJson}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>
                  </svg>
                </button>
              )}
              <button className="icon-button" aria-label="Decrease font size" title="Decrease font size" onClick={onDecreaseFontSize}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7V5h12v2M8 5v14m4-14v14M10 19h4"/><line x1="17" y1="12" x2="21" y2="12"/>
                </svg>
              </button>
              <button className="icon-button" aria-label="Increase font size" title="Increase font size" onClick={onIncreaseFontSize}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7V5h12v2M8 5v14m4-14v14M10 19h4"/><line x1="19" y1="10" x2="19" y2="14"/><line x1="17" y1="12" x2="21" y2="12"/>
                </svg>
              </button>
              <button className="icon-button" aria-label="Copy story" title="Copy story" onClick={handleCopy}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              {onShowInfo && (
                <button className="icon-button" aria-label="Story information" title="Story information" onClick={onShowInfo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </button>
              )}
              <button className="icon-button" aria-label="Elaborate story" title="Elaborate story" onClick={onElaborate} disabled={isGenerating}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </header>
      <article className="story-content" ref={setRefs} style={{ fontSize: `${fontSize}rem` }}>
        {isGenerating && !storyHtml ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{statusText}</pre>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: htmlToRender }} />
        )}
      </article>
    </main>
  );
});
