/**
 * Read-aloud chunking and follow-along highlighting.
 *
 * A chunk is the unit of everything: it is spoken as one utterance and, while
 * it is spoken, its words are the only dark text on the page. Keeping those two
 * things identical is what makes follow-along reliable — the highlight moves
 * when the next utterance is queued, so it never depends on the voice reporting
 * word boundaries (many voices don't).
 *
 * Short mode: a short sentence, or a clause between commas. Long mode: a whole
 * sentence. Both merge tiny fragments so nothing is spoken as a one-word blip,
 * and both know about abbreviations, ellipses, dialogue tags, quotes, dashes,
 * decimals and times, so a chunk never ends somewhere a reader wouldn't pause.
 */

export type SelectionLength = 'short' | 'long';

export interface ReadChunk {
  text: string;
  wordEls: HTMLElement[];
  /** Offset of each word inside `text`, parallel to `wordEls`. */
  wordStarts: number[];
  /** Position of the first word among every `.story-word` in the story, so a paused read can restart here. */
  firstWordIndex: number;
}

/**
 * A word plus the punctuation and whitespace that follow it up to the next
 * word. Chunking works on these alone, so it can be tested without a DOM.
 */
export interface Piece {
  /** The bare word (letters, apostrophes, hyphens). */
  word: string;
  /** The word followed by its trailing punctuation and space. */
  text: string;
}

interface Token extends Piece {
  el: HTMLElement;
  block: Element | null;
  index: number;
}

/** Sentences up to this many words are spoken whole in Short mode. */
const SHORT_WHOLE_SENTENCE_WORDS = 10;
/** Clause fragments shorter than this join a neighbour ("Yes," / "she said."). */
const MIN_CLAUSE_WORDS = 3;
/** Long mode: sentences shorter than this join the next sentence ("No. Not now."). */
const LONG_MIN_SENTENCE_WORDS = 4;
/** Long mode never grows a merged chunk past this; remote voices cut off long utterances. */
const LONG_MAX_CHARS = 320;

const ABBREVIATIONS = new Set([
  'e', 'g', 'eg', 'i', 'ie', 'etc', 'mr', 'mrs', 'ms', 'dr', 'prof',
  'sr', 'jr', 'vs', 'viz', 'cf', 'al', 'st', 'no', 'nos', 'approx',
  'inc', 'ltd', 'co', 'vol', 'ch', 'pp', 'fig', 'ed', 'rev', 'est',
]);

const CLOSERS = '["”’\')\\]]*';
/** `.` `!` `?` `…` or `...`, optional closing quotes/brackets, then space or end. */
const SENTENCE_END = new RegExp(`(?:[.!?…]|\\.{3})${CLOSERS}\\s*$`, 'u');
/** The same, but the final stop is a plain full stop (so abbreviation rules apply). */
const FULL_STOP_END = new RegExp(`(?<![.!?…])\\.${CLOSERS}\\s*$`, 'u');
/** Comma, semicolon or colon followed by a space; em dash anywhere; spaced en dash or hyphen. */
const CLAUSE_BREAK = new RegExp(`(?:[,;:]${CLOSERS}\\s|—|\\s[–-]\\s)`, 'u');
const OPENERS = /(\s)([“‘"'(\[]+)$/u;
const LEADING_OPENERS = /^[“‘"'(\[]+/u;

// ─── Sentence and clause rules ──────────────────────────────────────────────

function isAbbreviation(piece: Piece): boolean {
  const letters = piece.word.replace(/[^\p{L}]/gu, '');
  if (!letters) return false;
  // The stop must be glued to the word itself: "Mr. " yes, "gone 5. " no.
  // An opening quote may have been moved in front of the word ("Mrs. Fox").
  const body = piece.text.replace(LEADING_OPENERS, '');
  if (!body.startsWith(piece.word + '.')) return false;
  if (letters.length === 1) return true;
  return letters.length <= 4 && ABBREVIATIONS.has(letters.toLowerCase());
}

function startsLowercase(piece: Piece | undefined): boolean {
  return !!piece && /^\p{Ll}/u.test(piece.word);
}

/**
 * Does the sentence end after this piece?
 *  - "gone." "Really?" "Stop!" "waited…"          yes
 *  - "Mr. " "e.g. " "J. K."                       no (abbreviations)
 *  - "3.5 kg" "09:15" "file.txt"                  no (stop glued to what follows)
 *  - `"Really?" she asked` / "so… wet!"           no (lowercase carries the sentence on)
 */
export function endsSentence(piece: Piece, next: Piece | undefined): boolean {
  if (!SENTENCE_END.test(piece.text)) return false;
  if (FULL_STOP_END.test(piece.text) && isAbbreviation(piece)) return false;
  if (startsLowercase(next)) return false;
  return true;
}

/** A place a reader would take a short breath: comma, semicolon, colon, dash. */
export function endsClause(piece: Piece): boolean {
  return CLAUSE_BREAK.test(piece.text);
}

// ─── Chunking over plain pieces ─────────────────────────────────────────────

function wordCount(group: Piece[]): number {
  return group.length;
}

function charCount(group: Piece[]): number {
  return group.reduce((sum, piece) => sum + piece.text.length, 0);
}

function splitSentences<T extends Piece>(pieces: T[]): T[][] {
  const sentences: T[][] = [];
  let current: T[] = [];
  pieces.forEach((piece, i) => {
    current.push(piece);
    if (endsSentence(piece, pieces[i + 1])) {
      sentences.push(current);
      current = [];
    }
  });
  if (current.length) sentences.push(current);
  return sentences;
}

function splitClauses<T extends Piece>(sentence: T[]): T[][] {
  const clauses: T[][] = [];
  let current: T[] = [];
  sentence.forEach((piece, i) => {
    current.push(piece);
    if (i < sentence.length - 1 && endsClause(piece)) {
      clauses.push(current);
      current = [];
    }
  });
  if (current.length) clauses.push(current);
  return clauses;
}

/**
 * Fold groups that are too small into a neighbour. Small groups prefer the
 * one that follows ("Yes, said Pip" reads better than "Yes," alone); the last
 * group folds backwards. `maxChars` stops Long mode building huge chunks.
 */
function mergeSmall<T extends Piece>(groups: T[][], minWords: number, maxChars = Infinity): T[][] {
  const merged: T[][] = [];
  let carry: T[] = [];
  for (const group of groups) {
    const combined = carry.concat(group);
    if (wordCount(combined) < minWords && charCount(combined) <= maxChars) {
      carry = combined;
      continue;
    }
    merged.push(combined);
    carry = [];
  }
  if (carry.length) {
    const last = merged[merged.length - 1];
    if (last && charCount(last) + charCount(carry) <= maxChars) merged[merged.length - 1] = last.concat(carry);
    else merged.push(carry);
  }
  return merged;
}

/** Short mode: short sentences whole, longer ones clause by clause. */
function chunkShort<T extends Piece>(block: T[]): T[][] {
  const chunks: T[][] = [];
  for (const sentence of splitSentences(block)) {
    if (wordCount(sentence) <= SHORT_WHOLE_SENTENCE_WORDS) {
      chunks.push(sentence);
      continue;
    }
    chunks.push(...mergeSmall(splitClauses(sentence), MIN_CLAUSE_WORDS));
  }
  return chunks;
}

/** Long mode: one sentence at a time, with tiny sentences joined to the next. */
function chunkLong<T extends Piece>(block: T[]): T[][] {
  return mergeSmall(splitSentences(block), LONG_MIN_SENTENCE_WORDS, LONG_MAX_CHARS);
}

/**
 * Group one block's pieces into chunks. Blocks (paragraphs, headings, list
 * items) never share a chunk, so the caller passes one block at a time.
 */
export function chunkPieces<T extends Piece>(block: T[], selectionLength: SelectionLength): T[][] {
  if (block.length === 0) return [];
  return (selectionLength === 'short' ? chunkShort(block) : chunkLong(block)).filter(group => group.length);
}

// ─── Plain-text helpers (tests, and anything without a DOM) ────────────────

/** Same word shape as formatStory: letters, with inner apostrophes and hyphens. */
const WORD_TOKEN = /\p{L}+(?:[''\u2019-]\p{L}+)*/gu;

/** Turn a paragraph of text into pieces the way the DOM walker would. */
export function piecesFromText(text: string): Piece[] {
  const matches = Array.from(text.matchAll(WORD_TOKEN));
  const pieces: Piece[] = matches.map((match, i) => {
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    return { word: match[0], text: text.slice(start, end) };
  });
  // Text before the first word (an opening quote) belongs to that word.
  if (pieces.length && (matches[0].index ?? 0) > 0) pieces[0].text = text.slice(0, matches[0].index) + pieces[0].text;
  moveOpenersForward(pieces);
  return pieces;
}

/** Chunk a paragraph of plain text; returns the spoken text of each chunk. */
export function chunkText(text: string, selectionLength: SelectionLength): string[] {
  return chunkPieces(piecesFromText(text), selectionLength).map(group => groupText(group));
}

function groupText(group: Piece[]): string {
  return group.map(piece => piece.text).join('').replace(/\s+/g, ' ').trim();
}

/**
 * `said, "Wait` — an opening quote or bracket trails the previous word's text
 * but belongs to the next one, otherwise a chunk ends with a stray quote and
 * the next starts without it.
 */
function moveOpenersForward(pieces: Piece[], sameGroup: (a: Piece, b: Piece) => boolean = () => true): void {
  for (let i = 0; i < pieces.length - 1; i++) {
    const piece = pieces[i];
    const next = pieces[i + 1];
    if (!sameGroup(piece, next)) continue;
    const match = piece.text.match(OPENERS);
    if (!match || match.index === undefined) continue;
    piece.text = piece.text.slice(0, match.index + 1);
    next.text = match[2] + next.text;
  }
}

// ─── DOM walking ────────────────────────────────────────────────────────────

function closestBlock(el: HTMLElement): Element | null {
  return el.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre');
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

/** Text between the start of the block and its first word (an opening quote). */
function leadingText(el: HTMLElement, block: Element | null): string {
  let text = '';
  let cursor: Node = el;
  for (;;) {
    let node: ChildNode | null = cursor.previousSibling;
    while (!node) {
      const parent = cursor.parentElement;
      if (!parent || parent === block) return text;
      cursor = parent;
      node = cursor.previousSibling;
    }
    if (containsWord(node)) return text;
    text = (node.textContent || '') + text;
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
    const word = el.textContent || '';
    let text = word + followingText(el, block);
    // Only the block's real first word owns its opening quote; reading from a
    // word mid-paragraph must not drag the paragraph's opening quote along.
    const firstInBlock = i === 0 || closestBlock(words[i - 1]) !== block;
    if (firstInBlock) text = leadingText(el, block).trimStart() + text;
    tokens.push({ el, word, text, block, index: i });
  }

  moveOpenersForward(tokens, (a, b) => (a as Token).block === (b as Token).block);
  return tokens;
}

function groupByBlock(tokens: Token[]): Token[][] {
  const groups: Token[][] = [];
  let current: Token[] = [];
  let lastBlock: Element | null = null;
  for (const token of tokens) {
    if (current.length && token.block !== lastBlock) {
      groups.push(current);
      current = [];
    }
    current.push(token);
    lastBlock = token.block;
  }
  if (current.length) groups.push(current);
  return groups;
}

function toChunk(tokens: Token[]): ReadChunk {
  let text = '';
  const wordStarts: number[] = [];
  for (const token of tokens) {
    const piece = token.text.replace(/\s+/g, ' ');
    // Leading quote (first word of a block) sits before the word itself.
    wordStarts.push(text.length + Math.max(0, piece.indexOf(token.word)));
    text += piece;
  }
  const leading = text.length - text.trimStart().length;
  return {
    text: text.trim(),
    wordEls: tokens.map(token => token.el),
    wordStarts: wordStarts.map(start => Math.max(0, start - leading)),
    firstWordIndex: tokens[0]?.index ?? 0,
  };
}

/** Build the chunks to speak, starting at a word index (0 for the whole story). */
export function buildReadChunks(
  root: HTMLElement,
  startWordIndex: number,
  selectionLength: SelectionLength,
): ReadChunk[] {
  const tokens = collectTokens(root, Number.isFinite(startWordIndex) ? startWordIndex : 0);
  const chunks: ReadChunk[] = [];
  for (const block of groupByBlock(tokens)) {
    for (const group of chunkPieces(block, selectionLength)) chunks.push(toChunk(group));
  }
  return chunks.filter(chunk => chunk.text);
}

// ─── Follow-along highlighting ─────────────────────────────────────────────

/**
 * Which word of a chunk is being spoken at a SpeechSynthesis boundary
 * `charIndex`. Some voices report the index a character or two early (before
 * an opening quote), so it is the last word starting at or before the offset.
 */
export function wordIndexAtChar(chunk: ReadChunk, charIndex: number): number {
  const safeIndex = Math.max(0, charIndex);
  let wordIndex = 0;
  for (let i = 0; i < chunk.wordStarts.length; i++) {
    if (chunk.wordStarts[i] > safeIndex) break;
    wordIndex = i;
  }
  return wordIndex;
}

export function clearReadAloudFollow(root: HTMLElement | null): void {
  if (!root) return;
  root.classList.remove('is-follow-reading');
  root.querySelectorAll('.story-word.is-speaking, .story-word.is-speaking-word').forEach(el => {
    el.classList.remove('is-speaking', 'is-speaking-word');
  });
}

/** Darken one chunk (and optionally one word inside it); everything else stays light. */
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
