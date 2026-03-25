import type { AssistData } from './types.js';
/**
 * Look up a word using free dictionary APIs with IndexedDB caching.
 * Tries Free Dictionary API first (richest data), then Wiktionary REST.
 *
 * @param {string} rawWord - The word to look up.
 * @returns {Promise<object|null>} AssistData object or null if not found.
 *
 * AssistData shape:
 * {
 *   word: string,
 *   definitions: { partOfSpeech: string, glosses: string[] }[],
 *   ipa: string,
 *   ipaDialect: string,
 *   audioUrl: string,
 *   synonyms: string[],
 *   antonyms: string[],
 *   etymology: string,
 *   source: 'freedict' | 'wiktionary' | 'cache'
 * }
 */
export declare function lookupWord(rawWord: string): Promise<AssistData | null>;
