import type { AlignedChunk, PhonicsAssist } from './types.js';
/**
 * Lazily load RiTa from CDN on first use.
 * Returns a Promise that resolves when window.RiTa is available.
 */
export declare function ensureRitaLoaded(): Promise<void>;
export declare function isRitaLoaded(): boolean;
/**
 * Get ARPAbet-like phones from RiTa for a word.
 * Returns array of uppercase tokens, e.g. ["N", "AY1", "T"], or null.
 */
export declare function getPhones(word: string): string[] | null;
/**
 * Normalize a phone: drop stress digits and lowercase.
 * e.g. "AY1" → "ay", "SH" → "sh"
 */
export declare function normalizePhone(p: string): string;
/**
 * Align spelling chunks (graphemes) to a phoneme stream.
 * Returns array of { grapheme, phoneme } or null if alignment fails.
 */
export declare function alignGraphemesToPhones(word: string, phonesUpper: string[]): AlignedChunk[] | null;
/**
 * Map a phoneme string to a short hint the browser TTS can pronounce.
 */
export declare function ttsHintForPhoneme(p: string): string;
/**
 * Build the full phonicsAssist object for a word.
 * Requires RiTa to be loaded (call ensureRitaLoaded() first).
 */
export declare function buildPhonicsAssist(word: string): PhonicsAssist;
