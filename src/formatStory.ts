// src/formatStory.ts — Extracted from ui.ts for use in React components
// Converts markdown story text to HTML with word-assist spans.

import { normalizeVocabularyWord } from './utils';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatParagraphForAssist(paragraphText: string): string {
    const WORD_TOKEN_REGEX = /\p{L}+(?:[''\u2019-]\p{L}+)*/gu;
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

function applyInlineMarkdown(html: string): string {
    html = html.replace(/`([^`]+?)`/g, '<code class="story-inline-code">$1</code>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    return html;
}

function renderTable(tableLines: string[]): string {
    if (tableLines.length === 0) return '';

    const parseRow = (line: string): string[] => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    const headerCells = parseRow(tableLines[0]);
    let alignments: string[] = headerCells.map(() => '');
    let bodyStart = 1;

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

function renderList(lines: string[], startIdx: number): { html: string; linesConsumed: number } {
    const items: { text: string; subList: string }[] = [];
    let i = startIdx;

    const firstLine = lines[startIdx];
    const isOrdered = /^\s*\d+[.)]\s+/.test(firstLine);
    const baseIndent = (firstLine.match(/^(\s*)/) as RegExpMatchArray)[1].length;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '') break;

        const indent = (line.match(/^(\s*)/) as RegExpMatchArray)[1].length;

        if (indent > baseIndent && items.length > 0) {
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
            items[items.length - 1].subList = subHtml;
            continue;
        }

        if (indent < baseIndent) break;

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

export function formatStoryAsHtml(text: string): string {
    if (!text) return '';

    const codeBlocks: { lang: string; code: string }[] = [];
    text = text.replace(/^```(\w*)\r?\n([\s\S]*?)^```\s*$/gm, (_match: string, lang: string, code: string) => {
        const idx = codeBlocks.length;
        codeBlocks.push({ lang: lang || '', code });
        return `\x00CODEBLOCK_${idx}\x00`;
    });

    const lines: string[] = text.split(/\n/);
    const output: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '') { i++; continue; }

        const cbMatch = trimmed.match(/^\x00CODEBLOCK_(\d+)\x00$/);
        if (cbMatch) {
            const cb = codeBlocks[parseInt(cbMatch[1])];
            const escaped = escapeHtml(cb.code.replace(/\n$/, ''));
            const langAttr = cb.lang ? ` data-language="${escapeHtml(cb.lang)}"` : '';
            output.push(`<pre class="story-code-block"${langAttr}><code>${escaped}</code></pre>`);
            i++; continue;
        }

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
        if (trimmed === '* * *') {
            output.push(`<div class="story-break" aria-hidden="true">✦</div>`);
            i++; continue;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 6);
            const tag = `h${Math.min(level + 1, 6)}`;
            const content = applyInlineMarkdown(formatParagraphForAssist(headingMatch[2]));
            output.push(`<${tag} class="story-chapter">${content}</${tag}>`);
            i++; continue;
        }

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }
            output.push(renderTable(tableLines));
            continue;
        }

        if (trimmed.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            const inner = formatStoryAsHtml(quoteLines.join('\n'));
            output.push(`<blockquote class="story-blockquote">${inner}</blockquote>`);
            continue;
        }

        if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
            const { html: listHtml, linesConsumed } = renderList(lines, i);
            output.push(listHtml);
            i += linesConsumed;
            continue;
        }

        const paraLines: string[] = [];
        while (i < lines.length) {
            const pl = lines[i];
            const pt = pl.trim();
            if (pt === '') break;
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
