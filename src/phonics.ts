// src/phonics.ts
// Pure-logic module for phonics assist — grapheme–phoneme alignment using RiTa.
// No DOM access. All functions are exported for use by script.ts.

import type { GraphemeMapEntry, AlignedChunk, PhonicsChunk, PhonicsAssist } from './types.js';

// ─── RiTa Lazy-Loading ──────────────────────────────────────────────────────

let ritaLoadPromise: Promise<void> | null = null;
let ritaReady: boolean = false;

/**
 * Lazily load RiTa from CDN on first use.
 * Returns a Promise that resolves when window.RiTa is available.
 */
export function ensureRitaLoaded(): Promise<void> {
    if (ritaReady && window.RiTa) return Promise.resolve();
    if (ritaLoadPromise) return ritaLoadPromise;

    ritaLoadPromise = new Promise((resolve, reject) => {
        // Already loaded by a <script> tag?
        if (window.RiTa) {
            ritaReady = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        // Use the explicit IIFE/browser build — dist/rita.js is ESM
        // and throws "Cannot use import statement outside a module".
        script.src = 'https://unpkg.com/rita/dist/rita.min.js';
        script.async = true;
        script.onload = () => {
            if (window.RiTa) {
                ritaReady = true;
                resolve();
            } else {
                reject(new Error('RiTa script loaded but window.RiTa is not available'));
            }
        };
        script.onerror = () => {
            ritaLoadPromise = null; // allow retry
            reject(new Error('Failed to load RiTa from CDN'));
        };
        document.head.appendChild(script);
    });

    return ritaLoadPromise;
}

export function isRitaLoaded(): boolean {
    return ritaReady && !!window.RiTa;
}

// ─── Grapheme → Phoneme Map ─────────────────────────────────────────────────

const GRAPHEME_MAP: GraphemeMapEntry[] = [
    // quadgraphs / common clusters
    { g: "eigh", p: ["ey"] },
    { g: "tion", p: ["sh", "ah", "n"] },
    { g: "sion", p: ["zh", "ah", "n"] },
    { g: "ough", p: ["ao"] },              // variable; rough approx

    // trigraphs
    { g: "igh", p: ["ay"] },
    { g: "tch", p: ["ch"] },
    { g: "dge", p: ["jh"] },
    { g: "ear", p: ["ih", "r"] },
    { g: "air", p: ["eh", "r"] },
    { g: "ore", p: ["ao", "r"] },
    { g: "ure", p: ["y", "uh", "r"] },

    // digraphs
    { g: "sh",  p: ["sh"] },
    { g: "ch",  p: ["ch"] },
    { g: "th",  p: ["th"] },
    { g: "th",  p: ["dh"] },              // voiced th variant
    { g: "ng",  p: ["ng"] },
    { g: "ph",  p: ["f"] },
    { g: "wh",  p: ["w"] },
    { g: "wr",  p: ["r"] },
    { g: "kn",  p: ["n"] },               // silent k
    { g: "gn",  p: ["n"] },               // silent g
    { g: "mb",  p: ["m"] },               // silent b (lamb, climb)
    { g: "ck",  p: ["k"] },
    { g: "ee",  p: ["iy"] },
    { g: "ea",  p: ["iy"] },
    { g: "ea",  p: ["eh"] },              // bread, head
    { g: "oo",  p: ["uw"] },
    { g: "oo",  p: ["uh"] },              // book, look
    { g: "oa",  p: ["ow"] },
    { g: "ai",  p: ["ey"] },
    { g: "ay",  p: ["ey"] },
    { g: "oi",  p: ["oy"] },
    { g: "oy",  p: ["oy"] },
    { g: "ou",  p: ["aw"] },
    { g: "ow",  p: ["aw"] },
    { g: "ow",  p: ["ow"] },
    { g: "ew",  p: ["uw"] },
    { g: "ie",  p: ["iy"] },
    { g: "ie",  p: ["ay"] },              // pie, tie
    { g: "ei",  p: ["iy"] },
    { g: "ei",  p: ["ey"] },
    { g: "er",  p: ["er"] },
    { g: "ir",  p: ["er"] },
    { g: "ur",  p: ["er"] },
    { g: "ar",  p: ["aa", "r"] },
    { g: "or",  p: ["ao", "r"] },
    { g: "qu",  p: ["k", "w"] },

    // single letters (fallback)
    { g: "a", p: ["ae"] },  { g: "a", p: ["ah"] },  { g: "a", p: ["ey"] },
    { g: "a", p: ["aa"] },  { g: "a", p: ["ao"] },
    { g: "b", p: ["b"] },
    { g: "c", p: ["k"] },   { g: "c", p: ["s"] },
    { g: "d", p: ["d"] },
    { g: "e", p: ["eh"] },  { g: "e", p: ["iy"] },  { g: "e", p: ["ih"] },
    { g: "f", p: ["f"] },
    { g: "g", p: ["g"] },   { g: "g", p: ["jh"] },
    { g: "h", p: ["hh"] },
    { g: "i", p: ["ih"] },  { g: "i", p: ["ay"] },
    { g: "j", p: ["jh"] },
    { g: "k", p: ["k"] },
    { g: "l", p: ["l"] },
    { g: "m", p: ["m"] },
    { g: "n", p: ["n"] },
    { g: "o", p: ["aa"] },  { g: "o", p: ["ow"] },  { g: "o", p: ["ah"] },
    { g: "o", p: ["ao"] },
    { g: "p", p: ["p"] },
    { g: "r", p: ["r"] },
    { g: "s", p: ["s"] },   { g: "s", p: ["z"] },
    { g: "t", p: ["t"] },
    { g: "u", p: ["ah"] },  { g: "u", p: ["uw"] },  { g: "u", p: ["uh"] },
    { g: "v", p: ["v"] },
    { g: "w", p: ["w"] },
    { g: "x", p: ["k", "s"] },
    { g: "y", p: ["y"] },   { g: "y", p: ["iy"] },  { g: "y", p: ["ay"] },
    { g: "y", p: ["ih"] },
    { g: "z", p: ["z"] },
];

// Pre-sort: longest grapheme first for greedy matching
const SORTED_GRAPHEMES: GraphemeMapEntry[] = [...GRAPHEME_MAP].sort((a, b) => b.g.length - a.g.length);

// ─── Phoneme Helpers ─────────────────────────────────────────────────────────

/**
 * Get ARPAbet-like phones from RiTa for a word.
 * Returns array of uppercase tokens, e.g. ["N", "AY1", "T"], or null.
 */
export function getPhones(word: string): string[] | null {
    if (!window.RiTa) return null;
    const raw = window.RiTa.phones(word);
    if (!raw) return null;
    const tokens = raw.split(/[-\s]+/g).filter(Boolean).map(t => t.toUpperCase());
    return tokens.length > 0 ? tokens : null;
}

/**
 * Normalize a phone: drop stress digits and lowercase.
 * e.g. "AY1" → "ay", "SH" → "sh"
 */
export function normalizePhone(p: string): string {
    return p.replace(/[0-2]$/g, '').toLowerCase();
}

// ─── Grapheme–Phoneme Alignment (DFS with backtracking) ──────────────────────

/**
 * Align spelling chunks (graphemes) to a phoneme stream.
 * Returns array of { grapheme, phoneme } or null if alignment fails.
 */
export function alignGraphemesToPhones(word: string, phonesUpper: string[]): AlignedChunk[] | null {
    const w = word.toLowerCase();
    const phones = phonesUpper.map(normalizePhone);

    function dfs(iChar: number, iPh: number): AlignedChunk[] | null {
        if (iChar === w.length && iPh === phones.length) return [];
        if (iChar >= w.length || iPh > phones.length) return null;

        for (const entry of SORTED_GRAPHEMES) {
            const { g, p } = entry;
            if (!w.startsWith(g, iChar)) continue;

            // Check phoneme sequence match
            if (iPh + p.length > phones.length) continue;
            let ok = true;
            for (let k = 0; k < p.length; k++) {
                if (phones[iPh + k] !== p[k]) { ok = false; break; }
            }
            if (!ok) continue;

            const rest = dfs(iChar + g.length, iPh + p.length);
            if (rest !== null) {
                return [{ grapheme: g, phoneme: p.join(' ') }, ...rest];
            }
        }

        // Silent-e: consume one letter, zero phonemes
        if (w[iChar] === 'e' && iChar === w.length - 1) {
            const rest = dfs(iChar + 1, iPh);
            if (rest !== null) {
                return [{ grapheme: 'e', phoneme: '' }, ...rest];
            }
        }

        // Fallback: consume one letter + one phoneme
        if (iPh < phones.length) {
            const rest = dfs(iChar + 1, iPh + 1);
            if (rest !== null) {
                return [{ grapheme: w[iChar], phoneme: phones[iPh] }, ...rest];
            }
        }

        return null;
    }

    return dfs(0, 0);
}

// ─── TTS Hints ───────────────────────────────────────────────────────────────

const TTS_HINT_MAP: Record<string, string> = {
    'ay':       'eye',
    'iy':       'ee',
    'uw':       'oo',
    'ow':       'oh',
    'ey':       'ay',
    'ao':       'aw',
    'aw':       'ow',
    'oy':       'oy',
    'ae':       'ah',
    'ah':       'uh',
    'ih':       'ih',
    'eh':       'eh',
    'uh':       'oo',
    'er':       'er',
    'aa':       'ah',
    'sh':       'shh',
    'ch':       'ch',
    'th':       'th',
    'dh':       'the',
    'ng':       'ng',
    'jh':       'j',
    'zh':       'zh',
    'hh':       'h',
    'sh ah n':  'shun',
    'zh ah n':  'zhun',
    'k s':      'ks',
    'k w':      'kw',
    'aa r':     'are',
    'ao r':     'or',
    'ih r':     'ear',
    'eh r':     'air',
};

/**
 * Map a phoneme string to a short hint the browser TTS can pronounce.
 */
export function ttsHintForPhoneme(p: string): string {
    if (!p) return '';
    if (TTS_HINT_MAP[p] !== undefined) return TTS_HINT_MAP[p];
    // For single consonants, the phoneme itself is usually fine
    return p;
}

// ─── Main Builder ────────────────────────────────────────────────────────────

/**
 * Build the full phonicsAssist object for a word.
 * Requires RiTa to be loaded (call ensureRitaLoaded() first).
 */
export function buildPhonicsAssist(word: string): PhonicsAssist {
    if (!word || typeof word !== 'string') {
        return { word: word || '', fallback: true, chunks: [], phones: [], phonemes: [], confidence: 0 };
    }

    const phonesUpper = getPhones(word);
    if (!phonesUpper) {
        return { word, fallback: true, chunks: [], phones: [], phonemes: [], confidence: 0 };
    }

    const chunksRaw = alignGraphemesToPhones(word, phonesUpper);
    if (!chunksRaw) {
        return {
            word,
            phones: phonesUpper,
            phonemes: phonesUpper.map(normalizePhone),
            chunks: [],
            confidence: 0,
            fallback: true
        };
    }

    // Remove empty-phoneme chunks (silent letters) for display purposes,
    // but keep grapheme merged into adjacent chunk
    const chunks: PhonicsChunk[] = [];
    for (const ch of chunksRaw) {
        if (!ch.phoneme && chunks.length > 0) {
            // Merge silent letter into previous chunk's grapheme
            chunks[chunks.length - 1].grapheme += ch.grapheme;
        } else if (!ch.phoneme) {
            // Silent letter at start — just add it as-is
            chunks.push({
                grapheme: ch.grapheme,
                phoneme: '',
                ttsHint: '',
            });
        } else {
            chunks.push({
                grapheme: ch.grapheme,
                phoneme: ch.phoneme,
                ttsHint: ttsHintForPhoneme(ch.phoneme),
            });
        }
    }

    // Confidence heuristic: fewer single-letter fallback chunks = higher confidence
    const fallbackCount = chunks.filter(c => c.grapheme.length === 1 && c.phoneme).length;
    const confidence = Math.max(0.1, 1 - fallbackCount / Math.max(3, chunks.length));

    return {
        word,
        phones: phonesUpper,
        phonemes: phonesUpper.map(normalizePhone),
        chunks,
        confidence,
        fallback: false
    };
}
