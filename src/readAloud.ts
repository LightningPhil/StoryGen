export type SelectionLength = 'short' | 'long';

export interface ReadChunk {
  text: string;
  wordEls: HTMLElement[];
  /** Offset of each word inside `text`, parallel to `wordEls`. */
  wordStarts: number[];
  /** Position of the first word among every `.story-word` in the story, so a paused read can restart here. */
  firstWordIndex: number;
}

export interface SpeakUnit {
  text: string;
  chunks: ReadChunk[];
}

export interface SpokenPosition {
  chunkIndex: number;
  wordIndex: number;
}

interface Token {
  el: HTMLElement;
  text: string;
  block: Element | null;
  index: number;
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

/** `"Really?" she asked.` — a lowercase word after the punctuation means the sentence carries on. */
function continuesSentence(next: Token | undefined): boolean {
  return !!next && /^\p{Ll}/u.test(next.el.textContent || '');
}

function endsSentenceBefore(token: Token, next: Token | undefined): boolean {
  return isSentenceEnd(token) && !continuesSentence(next);
}

function containsWord(node: Node): boolean {
  return node instanceof HTMLElement && (node.classList.contains('story-word') || !!node.querySelector('.story-word'));
}

/**
 * Punctuation and spaces that follow a word up to the next word. Words inside
 * inline markup (`<em>`, `<strong>`, `<code>`) have no next sibling of their
 * own, so climb out of the wrapper and keep reading until the block ends.
 */
function followingText(el: HTMLElement, block: Element | null): string {
  let text = '';
  let cursor: Node = el;
  for (;;) {
    let node: ChildNode | null = cursor.nextSibling;
    while (!node) {
      const parent = cursor.parentElement;
      if (!parent || parent === block) return text;
      cursor = parent;
      node = cursor.nextSibling;
    }
    if (containsWord(node)) return text;
    text += node.textContent || '';
    cursor = node;
  }
}

function collectTokens(root: HTMLElement, startWordIndex: number): Token[] {
  const words = Array.from(root.querySelectorAll('.story-word')) as HTMLElement[];
  const start = Math.max(0, startWordIndex);
  const tokens: Token[] = [];

  for (let i = start; i < words.length; i++) {
    const el = words[i];
    const block = closestBlock(el);
    const text = (el.textContent || '') + followingText(el, block);
    tokens.push({ el, text, block, index: i });
  }

  // `said, "Wait` — an opening quote or bracket trails the previous word's
  // text but belongs to the next one, otherwise sentence chunks end with a
  // stray quote and the next starts without it.
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    if (token.block !== next.block) continue;
    const match = token.text.match(/(\s)([“‘"'(\[]+)$/u);
    if (!match || match.index === undefined) continue;
    token.text = token.text.slice(0, match.index + 1);
    next.text = match[2] + next.text;
  }

  return tokens;
}

function toChunk(tokens: Token[]): ReadChunk {
  let text = '';
  const wordStarts: number[] = [];
  for (const token of tokens) {
    wordStarts.push(text.length);
    text += token.text.replace(/\s+/g, ' ');
  }
  return {
    text: text.trim(),
    wordEls: tokens.map(token => token.el),
    wordStarts,
    firstWordIndex: tokens[0]?.index ?? 0,
  };
}

function toUnit(chunks: ReadChunk[]): SpeakUnit {
  return {
    text: chunks.map(chunk => chunk.text).join(' ').replace(/\s+/g, ' ').trim(),
    chunks,
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
    block.forEach((token, i) => {
      current.push(token);
      const next = block[i + 1];
      // A `?` or `!` inside dialogue that carries on ("Really?" she asked) is
      // not a break; commas and colons always are.
      const splits = isSentenceEnd(token) ? endsSentenceBefore(token, next) : shouldSplitShort(token);
      if (splits) {
        chunks.push(toChunk(current));
        current = [];
      }
    });
    if (current.length) chunks.push(toChunk(current));
  }

  return chunks.filter(chunk => chunk.text);
}

function splitSentences(tokens: Token[]): Token[][] {
  const sentences: Token[][] = [];
  let current: Token[] = [];
  tokens.forEach((token, i) => {
    current.push(token);
    if (endsSentenceBefore(token, tokens[i + 1])) {
      sentences.push(current);
      current = [];
    }
  });
  if (current.length) sentences.push(current);
  return sentences;
}

/** Long mode highlights one sentence at a time, so chunks are sentences. */
function packLong(tokens: Token[]): ReadChunk[] {
  const chunks: ReadChunk[] = [];
  for (const paragraph of groupByBlock(tokens)) {
    for (const sentence of splitSentences(paragraph)) chunks.push(toChunk(sentence));
  }
  return chunks.filter(chunk => chunk.text);
}

/**
 * Long mode speaks a paragraph (up to LONG_MAX_CHARS) as one utterance so the
 * voice flows, while follow-along still steps sentence by sentence.
 */
function packLongUnits(tokens: Token[]): SpeakUnit[] {
  const units: SpeakUnit[] = [];
  for (const paragraph of groupByBlock(tokens)) {
    let current: ReadChunk[] = [];
    let length = 0;
    const flush = () => {
      if (current.length) units.push(toUnit(current));
      current = [];
      length = 0;
    };
    for (const sentence of splitSentences(paragraph)) {
      const chunk = toChunk(sentence);
      if (!chunk.text) continue;
      if (current.length && length + chunk.text.length + 1 > LONG_MAX_CHARS) flush();
      current.push(chunk);
      length += chunk.text.length + 1;
    }
    flush();
  }
  return units.filter(unit => unit.text);
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

/** Everything the reader needs: what to say, and which words light up while saying it. */
export function buildSpeakUnits(
  root: HTMLElement,
  startWordIndex: number,
  selectionLength: SelectionLength,
): SpeakUnit[] {
  const tokens = collectTokens(root, Number.isFinite(startWordIndex) ? startWordIndex : 0);
  if (tokens.length === 0) return [];
  return selectionLength === 'short' ? groupChunksForSpeech(packShort(tokens)) : packLongUnits(tokens);
}

/** Mid-sentence breaks. A new utterance here sounds like a full stop. */
export function endsWithClausePause(text: string): boolean {
  return /[,;:]\s*$/.test(text);
}

export function endsWithSentencePause(text: string): boolean {
  return /[.!?…]["')\]]?\s*$/.test(text);
}

/**
 * Join comma/clause chunks into one spoken utterance so the voice uses a
 * short comma pause instead of the long gap between SpeechSynthesis jobs.
 * Follow-along highlighting can still step through the original chunks.
 */
export function groupChunksForSpeech(chunks: ReadChunk[]): SpeakUnit[] {
  const units: SpeakUnit[] = [];
  let current: ReadChunk[] = [];

  const flush = () => {
    if (!current.length) return;
    units.push(toUnit(current));
    current = [];
  };

  for (const chunk of chunks) {
    current.push(chunk);
    if (endsWithClausePause(chunk.text) && !endsWithSentencePause(chunk.text)) continue;
    flush();
  }
  flush();
  return units.filter(unit => unit.text);
}

/**
 * Map a SpeechSynthesis boundary `charIndex` (an offset into `unit.text`) to
 * the chunk and word being spoken. Some voices report the index a character
 * or two early (before an opening quote), so the word is the last one that
 * starts at or before the offset.
 */
export function positionAtChar(unit: SpeakUnit, charIndex: number): SpokenPosition {
  const safeIndex = Math.max(0, charIndex);
  let offset = 0;
  const last = unit.chunks.length - 1;
  for (let i = 0; i <= last; i++) {
    if (i > 0) offset += 1;
    const chunk = unit.chunks[i];
    const next = offset + chunk.text.length;
    if (safeIndex < next || i === last) {
      const local = safeIndex - offset;
      let wordIndex = 0;
      for (let j = 0; j < chunk.wordStarts.length; j++) {
        if (chunk.wordStarts[j] > local) break;
        wordIndex = j;
      }
      return { chunkIndex: i, wordIndex };
    }
    offset = next;
  }
  return { chunkIndex: 0, wordIndex: 0 };
}

export function chunkIndexAtChar(unit: SpeakUnit, charIndex: number): number {
  return positionAtChar(unit, charIndex).chunkIndex;
}

export function clearReadAloudFollow(root: HTMLElement | null): void {
  if (!root) return;
  root.classList.remove('is-follow-reading');
  root.querySelectorAll('.story-word.is-speaking, .story-word.is-speaking-word').forEach(el => {
    el.classList.remove('is-speaking', 'is-speaking-word');
  });
}

export function showReadAloudChunk(
  root: HTMLElement | null,
  chunk: ReadChunk | null,
  followOn: boolean,
  wordEl: HTMLElement | null = null,
): void {
  const chunkAlreadyShown = !!chunk?.wordEls[0]?.classList.contains('is-speaking');
  clearReadAloudFollow(root);
  if (!root || !chunk || !followOn) return;
  root.classList.add('is-follow-reading');
  chunk.wordEls.forEach(el => el.classList.add('is-speaking'));
  wordEl?.classList.add('is-speaking-word');
  // Scroll once per chunk, not once per word, so the page doesn't twitch.
  if (!chunkAlreadyShown) chunk.wordEls[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
