// src/ui.ts
import appState from './appState.js'; 
import { normalizeVocabularyWord } from './utils.js';
import type { UIElements } from './types.js';

// --- DOM Element References (initialized by initUIElements) ---
let storyTitleDiv: HTMLElement | null, storyOutputDiv: HTMLElement | null, generateButton: HTMLButtonElement | null, elaborateStoryButton: HTMLButtonElement | null;
let copyStoryButton: HTMLButtonElement | null, saveStoryButton: HTMLButtonElement | null, decreaseFontButton: HTMLButtonElement | null, increaseFontButton: HTMLButtonElement | null;
let craftingFrameworkSelect: HTMLSelectElement | null, frameworkSummaryDiv: HTMLElement | null, userSuggestionsTextarea: HTMLTextAreaElement | null;
let authorStyleSelect: HTMLSelectElement | null, styleSummaryDiv: HTMLElement | null;

export function initUIElements(elements: UIElements): void {
    storyTitleDiv = elements.storyTitleDiv;
    storyOutputDiv = elements.storyOutputDiv;
    generateButton = elements.generateButton;
    elaborateStoryButton = elements.elaborateStoryButton;
    copyStoryButton = elements.copyStoryButton;
    saveStoryButton = elements.saveStoryButton;
    decreaseFontButton = elements.decreaseFontButton;
    increaseFontButton = elements.increaseFontButton;
    craftingFrameworkSelect = elements.craftingFrameworkSelect;
    frameworkSummaryDiv = elements.frameworkSummaryDiv;
    userSuggestionsTextarea = elements.userSuggestionsTextarea;

    // New element references
    authorStyleSelect = elements.authorStyleSelect;
    styleSummaryDiv = elements.styleSummaryDiv;

    // Initial state for action buttons (hidden)
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (elaborateStoryButton) elaborateStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden');
    if (increaseFontButton) increaseFontButton.classList.add('hidden');


    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Your Story Title Will Appear Here";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function clearStoryOutput(): void {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent = "";
    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Generating title...";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function updateStatusInStoryOutput(message: string): void {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent += message;
    storyOutputDiv.scrollTop = storyOutputDiv.scrollHeight; 
}

export function displayFinalStoryOutput(title: string, storyText: string, isElaboration: boolean = false): void {
    if (storyTitleDiv) {
        storyTitleDiv.textContent = title || "Untitled Story";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        // Format story text as proper paragraphs
        const formattedHtml = formatStoryAsHtml(storyText);
        storyOutputDiv.innerHTML = formattedHtml; 
        storyOutputDiv.scrollTop = 0; 
    }

    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryToast(successMessage, 'success');

    // Show all action buttons
    if (copyStoryButton) copyStoryButton.classList.remove('hidden');
    if (saveStoryButton) saveStoryButton.classList.remove('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.remove('hidden');
    if (increaseFontButton) increaseFontButton.classList.remove('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.remove('hidden');
        if (generateButton && !generateButton.disabled) {
            elaborateStoryButton.disabled = false;
        }
    }
}

export function displayErrorInStoryOutput(errorMessage: string): void {
    console.error("Pipeline Error:", errorMessage); 

    if (storyTitleDiv) {
        storyTitleDiv.textContent = "Error Occurred";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        storyOutputDiv.textContent = "If an error has occurred, it's likely a rate limit. This means your API key has been used as much as it can be today. It should be refreshed with a new small quota if you're on the free tier within 24 hours. If you're on the paid tier, rate limits are unlikely. However, there is at present (Feb 2026) a generous amount of usage per day, so you should get a couple of stories before hitting any limit.\n\nAn error occurred. Please check the browser console for details and ensure your API key and settings are correct.";
        storyOutputDiv.scrollTop = 0; 
    }

    // Hide action buttons on error
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden');
    if (increaseFontButton) increaseFontButton.classList.add('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.add('hidden');
        elaborateStoryButton.disabled = true; 
    }
}

export function showTemporaryToast(message: string, type: string = 'info', duration: number = 3000): void {
    console.log(`[UI Toast - ${type.toUpperCase()}]: ${message}`);
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        // Fallback removal if transitionend doesn't fire
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, duration);
}

export function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA: Record<string, string>): void {
    if (!craftingFrameworkSelect || !frameworkSummaryDiv) return;
    const selectedFrameworkKey = craftingFrameworkSelect.value;
    const summary = STORY_FRAMEWORK_SUMMARIES_DATA[selectedFrameworkKey] || "No summary available for this framework.";
    frameworkSummaryDiv.textContent = summary;
}

// New function for author style summary
export function updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES_DATA: Record<string, string>): void {
    if (!authorStyleSelect || !styleSummaryDiv) return;
    const selectedStyleKey = authorStyleSelect.value;
    const summary = STORY_STYLE_SUMMARIES_DATA[selectedStyleKey] || "No summary available for this style.";
    styleSummaryDiv.textContent = summary;
}

export function disableMainControls(): void {
    if (generateButton) generateButton.disabled = true;
    if (elaborateStoryButton) elaborateStoryButton.disabled = true;
    // Font buttons usability depends on story presence, managed by displayFinalStoryOutput/displayErrorInStoryOutput
}

export function enableMainControls(): void {
    if (generateButton) generateButton.disabled = false;
    
    if (appState.latestGeneratedStoryText && elaborateStoryButton) {
        elaborateStoryButton.disabled = false;
        elaborateStoryButton.classList.remove('hidden'); 
    } else if (elaborateStoryButton) {
        elaborateStoryButton.disabled = true;
        // elaborateStoryButton.classList.add('hidden'); // Visibility handled by display functions
    }
    // Font buttons visibility is also handled by displayFinalStoryOutput/displayErrorInStoryOutput
}

// New function to apply font size to the story output
export function applyStoryFontSize(newSizeRem: number): void {
    if (storyOutputDiv && typeof newSizeRem === 'number' && newSizeRem > 0) {
        storyOutputDiv.style.fontSize = `${newSizeRem}rem`;
    }
}

// New generic function to populate dropdowns
export function populateDropdown(selectElement: HTMLSelectElement, optionsObject: Record<string, unknown>, capitalize: boolean = true): void {
    if (!selectElement || !optionsObject) return;
    selectElement.innerHTML = '';
    for (const key in optionsObject) {
        const option = document.createElement('option');
        option.value = key;
        let textContent = key.replace(/_/g, ' ');
        if (capitalize) {
            textContent = textContent.charAt(0).toUpperCase() + textContent.slice(1);
        }
        option.textContent = textContent;
        selectElement.appendChild(option);
    }
}

/**
 * Formats story text as HTML with proper paragraphs, typography, and markdown
 * rendering.
 *
 * Supported markdown features:
 *   - Headings:          # H1 … ###### H6
 *   - Bold:              **text**
 *   - Italic:            *text*
 *   - Strikethrough:     ~~text~~
 *   - Inline code:       `code`
 *   - Fenced code blocks: ```lang … ```
 *   - Horizontal rules:  ---, ***, ___
 *   - Unordered lists:   lines starting with - or * (nested via indentation)
 *   - Ordered lists:     lines starting with 1. 2. etc. (nested via indentation)
 *   - Blockquotes:       > text  (nesting via >>)
 *   - Tables:            | col | col | with optional alignment row
 *   - Scene breaks:      * * *  (decorative variant)
 *
 * @param {string} text - Raw story / markdown text
 * @returns {string} HTML formatted story
 */
export function formatStoryAsHtml(text: string): string {
    if (!text) return '';

    // ── Step 1: Extract fenced code blocks before any other processing ──
    const codeBlocks: { lang: string; code: string }[] = [];
    text = text.replace(/^```(\w*)\r?\n([\s\S]*?)^```\s*$/gm, (_match: string, lang: string, code: string) => {
        const idx = codeBlocks.length;
        codeBlocks.push({ lang: lang || '', code });
        return `\x00CODEBLOCK_${idx}\x00`;
    });

    // ── Step 2: Split into lines and process block-level structures ──
    const lines: string[] = text.split(/\n/);
    const output: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // --- Blank line → skip (paragraph gaps handled by block collectors) ---
        if (trimmed === '') { i++; continue; }

        // --- Code block placeholder ---
        const cbMatch = trimmed.match(/^\x00CODEBLOCK_(\d+)\x00$/);
        if (cbMatch) {
            const cb = codeBlocks[parseInt(cbMatch[1])];
            const escaped = escapeHtml(cb.code.replace(/\n$/, ''));
            const langAttr = cb.lang ? ` data-language="${escapeHtml(cb.lang)}"` : '';
            output.push(`<pre class="story-code-block"${langAttr}><code>${escaped}</code></pre>`);
            i++; continue;
        }

        // --- Horizontal rule (---, ***, ___ with optional spaces, at least 3 chars) ---
        if (/^(\*[\s*]*\*[\s*]*\*[\s*]*)$/.test(trimmed) && trimmed !== '* * *') {
            output.push(`<hr class="story-hr">`);
            i++; continue;
        }
        if (/^(-[\s-]*-[\s-]*-[\s-]*)$/.test(trimmed)) {
            output.push(`<hr class="story-hr">`);
            i++; continue;
        }
        if (/^(_[\s_]*_[\s_]*_[\s_]*)$/.test(trimmed)) {
            output.push(`<hr class="story-hr">`);
            i++; continue;
        }
        // Decorative scene break
        if (trimmed === '* * *') {
            output.push(`<div class="story-break" aria-hidden="true">✦</div>`);
            i++; continue;
        }

        // --- Heading (# to ######) ---
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 6);
            // Map # → h2, ## → h3, etc. (h1 is reserved for page title)
            const tag = `h${Math.min(level + 1, 6)}`;
            const content = applyInlineMarkdown(formatParagraphForAssist(headingMatch[2]));
            output.push(`<${tag} class="story-chapter">${content}</${tag}>`);
            i++; continue;
        }

        // --- Table (| col | col |) ---
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }
            output.push(renderTable(tableLines));
            continue;
        }

        // --- Blockquote (> …) ---
        if (trimmed.startsWith('>')) {
            const quoteLines = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            const inner = formatStoryAsHtml(quoteLines.join('\n'));
            output.push(`<blockquote class="story-blockquote">${inner}</blockquote>`);
            continue;
        }

        // --- Lists (unordered: - / *, ordered: 1.) ---
        if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
            const { html: listHtml, linesConsumed } = renderList(lines, i);
            output.push(listHtml);
            i += linesConsumed;
            continue;
        }

        // --- Regular paragraph (collect consecutive non-blank, non-special lines) ---
        const paraLines = [];
        while (i < lines.length) {
            const pl = lines[i];
            const pt = pl.trim();
            if (pt === '') break;
            // Stop if the next line looks like a new block-level element
            if (/^#{1,6}\s/.test(pt)) break;
            if (pt.startsWith('|') && pt.endsWith('|')) break;
            if (pt.startsWith('>')) break;
            if (/^\s*[-*]\s+/.test(pl)) break;
            if (/^\s*\d+[.)]\s+/.test(pl)) break;
            if (/^(\*[\s*]*\*[\s*]*\*|---+|___+)$/.test(pt)) break;
            if (/^\x00CODEBLOCK_\d+\x00$/.test(pt)) break;
            paraLines.push(pt);
            i++;
        }
        if (paraLines.length > 0) {
            const combined = paraLines.join(' ');
            const html = applyInlineMarkdown(formatParagraphForAssist(combined));
            output.push(`<p class="story-paragraph">${html}</p>`);
        }
    }

    return output.join('\n');
}

/**
 * Renders a markdown table from an array of pipe-delimited lines.
 * The second line may be an alignment row (|---|:---:|---:|).
 */
function renderTable(tableLines: string[]): string {
    if (tableLines.length === 0) return '';

    const parseRow = (line: string): string[] => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    const headerCells = parseRow(tableLines[0]);
    let alignments: string[] = headerCells.map(() => '');
    let bodyStart = 1;

    // Check for alignment row
    if (tableLines.length > 1) {
        const possibleAlign = parseRow(tableLines[1]);
        const isAlignRow = possibleAlign.every(c => /^:?-+:?$/.test(c.trim()));
        if (isAlignRow) {
            alignments = possibleAlign.map(c => {
                const t = c.trim();
                if (t.startsWith(':') && t.endsWith(':')) return 'center';
                if (t.endsWith(':')) return 'right';
                return 'left';
            });
            bodyStart = 2;
        }
    }

    const alignAttr = (idx: number): string => alignments[idx] ? ` style="text-align:${alignments[idx]}"` : '';

    let html = '<table class="story-table"><thead><tr>';
    headerCells.forEach((cell, idx) => {
        html += `<th${alignAttr(idx)}>${applyInlineMarkdown(formatParagraphForAssist(cell))}</th>`;
    });
    html += '</tr></thead>';

    if (bodyStart < tableLines.length) {
        html += '<tbody>';
        for (let r = bodyStart; r < tableLines.length; r++) {
            const cells = parseRow(tableLines[r]);
            html += '<tr>';
            cells.forEach((cell, idx) => {
                html += `<td${alignAttr(idx)}>${applyInlineMarkdown(formatParagraphForAssist(cell))}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody>';
    }

    html += '</table>';
    return html;
}

/**
 * Renders a (possibly nested) list starting at lines[startIdx].
 * Detects ordered vs unordered and nests based on indentation.
 * Returns { html, linesConsumed }.
 */
function renderList(lines: string[], startIdx: number): { html: string; linesConsumed: number } {
    const items: { text: string; subList: string }[] = [];
    let i = startIdx;

    // Determine list type from the first line
    const firstLine = lines[startIdx];
    const isOrdered = /^\s*\d+[.)]\s+/.test(firstLine);
    const baseIndent = (firstLine.match(/^(\s*)/) as RegExpMatchArray)[1].length;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '') break;

        const indent = line.match(/^(\s*)/)[1].length;

        // If indent is deeper than base, it belongs to a nested sub-list
        if (indent > baseIndent && items.length > 0) {
            // Collect all deeper-indented lines for recursive processing
            const subLines: string[] = [];
            while (i < lines.length) {
                const sub = lines[i];
                const subTrimmed = sub.trim();
                if (subTrimmed === '') break;
                const subIndent = (sub.match(/^(\s*)/) as RegExpMatchArray)[1].length;
                if (subIndent <= baseIndent) break;
                subLines.push(sub);
                i++;
            }
            const { html: subHtml } = renderList(subLines, 0);
            // Append sub-list HTML to last item
            items[items.length - 1].subList = subHtml;
            continue;
        }

        // If indent is less than base, this line doesn't belong to our list
        if (indent < baseIndent) break;

        // Match list marker
        const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
        const olMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
        if (ulMatch || olMatch) {
            const text = ulMatch ? ulMatch[1] : olMatch![1];
            items.push({ text, subList: '' });
            i++;
        } else {
            break;
        }
    }

    const tag = isOrdered ? 'ol' : 'ul';
    const cls = isOrdered ? 'story-ordered-list' : 'story-list';
    let html = `<${tag} class="${cls}">`;
    for (const item of items) {
        html += `<li>${applyInlineMarkdown(formatParagraphForAssist(item.text))}`;
        if (item.subList) html += item.subList;
        html += `</li>`;
    }
    html += `</${tag}>`;

    return { html, linesConsumed: i - startIdx };
}

/**
 * Applies inline markdown to HTML that already has word-assist spans.
 * Works on the rendered HTML string so spans are preserved.
 *
 * Handles (in order):
 *   - `inline code`
 *   - ~~strikethrough~~
 *   - **bold**
 *   - *italic*
 */
function applyInlineMarkdown(html: string): string {
    // Inline code (backticks) — do this first so contents aren't further processed
    html = html.replace(/`([^`]+?)`/g, '<code class="story-inline-code">$1</code>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* — but not the asterisks inside <strong>
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    return html;
}

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatParagraphForAssist(paragraphText: string): string {
    const WORD_TOKEN_REGEX = /\p{L}+(?:[’'-]\p{L}+)*/gu;
    let html = '';
    let cursor = 0;

    for (const match of paragraphText.matchAll(WORD_TOKEN_REGEX)) {
        const word = match[0];
        const start = match.index ?? 0;

        if (start > cursor) {
            html += escapeHtml(paragraphText.slice(cursor, start));
        }

        const normalizedWord = normalizeVocabularyWord(word);
        const escapedWord = escapeHtml(word);
        const escapedNormalizedWord = escapeHtml(normalizedWord);
        html += `<span class="story-word" data-story-word="${escapedWord}" data-word-normalized="${escapedNormalizedWord}">${escapedWord}</span>`;

        cursor = start + word.length;
    }

    if (cursor < paragraphText.length) {
        html += escapeHtml(paragraphText.slice(cursor));
    }

    return html;
}
