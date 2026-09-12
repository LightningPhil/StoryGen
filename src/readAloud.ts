export type SelectionLength = 'short' | 'long';

export interface ReadChunk {
  text: string;
  wordEls: HTMLElement[];
}

interface Token {
  el: HTMLElement;
  text: string;
  block: Element | null;
}

const LONG_MAX_CHARS = 800;
const SHORT_LINE_WORDS = 10;
const CLAUSE_PUNCT = /[,;:!?…—–]/;
const ABBREVIATIONS = new Set([
  'e', 'g', 'eg', 'i', 'ie', 'etc', 'mr', 'mrs', 'ms', 'dr', 'prof',
  'sr', 'jr', 'vs', 'viz', 'cf', 'al', 'st', 'no', 'nos', 'approx',
  'inc', 'ltd', 'co', 'vol', 'ch', 'pp', 'fig', 'ed', 'rev', 'est',
]);

function closestBlock(el: HTMLElement): Element | null {
  return el.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre');
}

function wordLetters(token: Token): string {
  return (token.el.textContent || '').replace(/[^A-Za-z]/g, '');
}

function isAbbreviation(token: Token): boolean {
  const word = wordLetters(token);
  if (!word || !token.text.includes('.')) return false;
  if (word.length === 1) return true;
  return word.length <= 4 && ABBREVIATIONS.has(word.toLowerCase());
}

/** ".md", "file.txt" — a stop with no space after it belongs to the next short bit. */
function isGluedPeriod(token: Token): boolean {
  const index = token.text.lastIndexOf('.');
  if (index === -1) return false;
  const after = token.text.slice(index + 1);
  return !/^\s/.test(after);
}

function shouldSplitShort(token: Token): boolean {
  if (CLAUSE_PUNCT.test(token.text)) return true;
  if (!token.text.includes('.')) return false;
  if (isGluedPeriod(token)) return false;
  return !isAbbreviation(token);
}

function isSentenceEnd(token: Token): boolean {
  if (/[!?…]/.test(token.text)) return true;
  if (!token.text.includes('.')) return false;
  if (isGluedPeriod(token)) return false;
  return !isAbbreviation(token);
}

function collectTokens(root: HTMLElement, startWordIndex: number): Token[] {
  const words = Array.from(root.querySelectorAll('.story-word')) as HTMLElement[];
  const start = Math.max(0, startWordIndex);
  const tokens: Token[] = [];

  for (let i = start; i < words.length; i++) {
    const el = words[i];
    let text = el.textContent || '';
    let node: ChildNode | null = el.nextSibling;
    while (node) {
      if (node instanceof HTMLElement && (node.classList.contains('story-word') || node.querySelector('.story-word'))) {
        break;
      }
      text += node.textContent || '';
      node = node.nextSibling;
    }
    tokens.push({ el, text, block: closestBlock(el) });
  }

  return tokens;
}

function toChunk(tokens: Token[]): ReadChunk {
  return {
    text: tokens.map(token => token.text).join('').replace(/\s+/g, ' ').trim(),
    wordEls: tokens.map(token => token.el),
  };
}

function groupByBlock(tokens: Token[]): Token[][] {
  const groups: Token[][] = [];
  let current: Token[] = [];
  let lastBlock: Element | null = null;
  for (const token of tokens) {
    if (lastBlock && token.block !== lastBlock && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(token);
    lastBlock = token.block;
  }
  if (current.length) groups.push(current);
  return groups;
}

function packShort(tokens: Token[]): ReadChunk[] {
  const chunks: ReadChunk[] = [];

  for (const block of groupByBlock(tokens)) {
    if (block.length <= SHORT_LINE_WORDS) {
      chunks.push(toChunk(block));
      continue;
    }

    let current: Token[] = [];
    for (const token of block) {
      current.push(token);
      if (shouldSplitShort(token)) {
        chunks.push(toChunk(current));
        current = [];
      }
    }
    if (current.length) chunks.push(toChunk(current));
  }

  return chunks.filter(chunk => chunk.text);
}

function splitSentences(tokens: Token[]): Token[][] {
  const sentences: Token[][] = [];
  let current: Token[] = [];
  for (const token of tokens) {
    current.push(token);
    if (isSentenceEnd(token)) {
      sentences.push(current);
      current = [];
    }
  }
  if (current.length) sentences.push(current);
  return sentences;
}

function packToMax(groups: Token[][], maxChars: number): ReadChunk[] {
  const chunks: ReadChunk[] = [];
  let current: Token[] = [];
  let length = 0;

  for (const group of groups) {
    const groupLength = group.reduce((sum, token) => sum + token.text.length, 0);
    if (current.length && length + groupLength > maxChars) {
      chunks.push(toChunk(current));
      current = [];
      length = 0;
    }
    current.push(...group);
    length += groupLength;
  }
  if (current.length) chunks.push(toChunk(current));
  return chunks.filter(chunk => chunk.text);
}

function packLong(tokens: Token[]): ReadChunk[] {
  const chunks: ReadChunk[] = [];
  for (const paragraph of groupByBlock(tokens)) {
    const joinedLength = paragraph.reduce((sum, token) => sum + token.text.length, 0);
    if (joinedLength <= LONG_MAX_CHARS) {
      chunks.push(toChunk(paragraph));
    } else {
      chunks.push(...packToMax(splitSentences(paragraph), LONG_MAX_CHARS));
    }
  }
  return chunks.filter(chunk => chunk.text);
}

export function buildReadChunks(
  root: HTMLElement,
  startWordIndex: number,
  selectionLength: SelectionLength,
): ReadChunk[] {
  const tokens = collectTokens(root, Number.isFinite(startWordIndex) ? startWordIndex : 0);
  if (tokens.length === 0) return [];
  return selectionLength === 'short' ? packShort(tokens) : packLong(tokens);
}

export function clearReadAloudFollow(root: HTMLElement | null): void {
  if (!root) return;
  root.classList.remove('is-follow-reading');
  root.querySelectorAll('.story-word.is-speaking').forEach(el => el.classList.remove('is-speaking'));
}

export function showReadAloudChunk(root: HTMLElement | null, chunk: ReadChunk | null, followOn: boolean): void {
  clearReadAloudFollow(root);
  if (!root || !chunk || !followOn) return;
  root.classList.add('is-follow-reading');
  chunk.wordEls.forEach(el => el.classList.add('is-speaking'));
  chunk.wordEls[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
