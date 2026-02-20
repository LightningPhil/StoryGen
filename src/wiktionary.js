// src/wiktionary.js
// Dictionary lookup module using Free Dictionary API + Wiktionary REST fallback
// with IndexedDB caching. No API key required.

const DB_NAME = 'storyGenDictionary';
const DB_VERSION = 1;
const STORE_NAME = 'words';
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FETCH_TIMEOUT_MS = 6000;

// ─── IndexedDB Cache ────────────────────────────────────────────────────────

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'word' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };
    });
    return dbPromise;
}

async function getCachedWord(word) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(word);
            request.onsuccess = () => {
                const record = request.result;
                if (!record) return resolve(null);
                if (Date.now() - record.cachedAt > CACHE_EXPIRY_MS) return resolve(null);
                resolve(record.data);
            };
            request.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function cacheWord(word, data) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ word, data, cachedAt: Date.now() });
    } catch {
        // Caching is best-effort — silently ignore errors
    }
}

// ─── Fetch with timeout ─────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// ─── Free Dictionary API (primary source) ───────────────────────────────────
// Returns definitions, IPA, audio URLs, synonyms, and antonyms.
// Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/{word}

async function fetchFromFreeDictionary(word) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return normalizeFreeDictResponse(data);
}

function normalizeFreeDictResponse(entries) {
    const entry = entries[0];

    // IPA & Audio
    let ipa = '';
    let audioUrl = '';
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
            if (p.text && !ipa) ipa = p.text;
            if (p.audio && !audioUrl) audioUrl = p.audio;
        }
    }
    if (!ipa && entry.phonetic) ipa = entry.phonetic;

    // Fix protocol-relative URLs (e.g. "//ssl.gstatic.com/...")
    if (audioUrl && audioUrl.startsWith('//')) {
        audioUrl = 'https:' + audioUrl;
    }

    // Definitions grouped by part of speech
    const definitions = [];
    const allSynonyms = new Set();
    const allAntonyms = new Set();

    if (entry.meanings && Array.isArray(entry.meanings)) {
        for (const meaning of entry.meanings) {
            const pos = meaning.partOfSpeech || 'unknown';
            const glosses = [];

            if (meaning.definitions && Array.isArray(meaning.definitions)) {
                for (const def of meaning.definitions.slice(0, 3)) {
                    if (def.definition) glosses.push(def.definition);
                    if (Array.isArray(def.synonyms)) def.synonyms.forEach(s => allSynonyms.add(s));
                    if (Array.isArray(def.antonyms)) def.antonyms.forEach(a => allAntonyms.add(a));
                }
            }

            // POS-level synonyms/antonyms
            if (Array.isArray(meaning.synonyms)) meaning.synonyms.forEach(s => allSynonyms.add(s));
            if (Array.isArray(meaning.antonyms)) meaning.antonyms.forEach(a => allAntonyms.add(a));

            if (glosses.length > 0) {
                definitions.push({ partOfSpeech: pos, glosses });
            }
        }
    }

    return {
        word: entry.word || '',
        definitions,
        ipa,
        audioUrl: audioUrl || '',
        synonyms: [...allSynonyms].slice(0, 8),
        antonyms: [...allAntonyms].slice(0, 5),
        etymology: '',
        source: 'freedict'
    };
}

// ─── Wiktionary REST API (fallback) ─────────────────────────────────────────
// Endpoint: https://en.wiktionary.org/api/rest_v1/page/definition/{word}
// Returns structured definitions with CORS support. Does not provide
// IPA or audio directly in the structured response.

async function fetchFromWiktionary(word) {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.en || !Array.isArray(data.en)) return null;
    return normalizeWiktionaryResponse(data, word);
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').trim();
}

function normalizeWiktionaryResponse(data, originalWord) {
    const sections = data.en;
    const definitions = [];

    for (const section of sections) {
        const pos = section.partOfSpeech || 'unknown';
        const glosses = [];

        if (section.definitions && Array.isArray(section.definitions)) {
            for (const def of section.definitions.slice(0, 3)) {
                const text = stripHtml(def.definition || '');
                if (text) glosses.push(text);
            }
        }

        if (glosses.length > 0) {
            definitions.push({ partOfSpeech: pos, glosses });
        }
    }

    return {
        word: originalWord,
        definitions,
        ipa: '',
        audioUrl: '',
        synonyms: [],
        antonyms: [],
        etymology: '',
        source: 'wiktionary'
    };
}

// ─── Main Lookup Orchestrator ───────────────────────────────────────────────

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
 *   audioUrl: string,
 *   synonyms: string[],
 *   antonyms: string[],
 *   etymology: string,
 *   source: 'freedict' | 'wiktionary' | 'cache'
 * }
 */
export async function lookupWord(rawWord) {
    const word = rawWord.trim().toLowerCase();
    if (!word) return null;

    // 1. Check cache
    const cached = await getCachedWord(word);
    if (cached) return { ...cached, source: 'cache' };

    // 2. Try Free Dictionary API (best for IPA + audio + synonyms)
    try {
        const fdResult = await fetchFromFreeDictionary(word);
        if (fdResult && fdResult.definitions.length > 0) {
            await cacheWord(word, fdResult);
            return fdResult;
        }
    } catch (e) { /* fall through to next source */ }

    // 3. Fallback to Wiktionary REST API (definitions only)
    try {
        const wiktResult = await fetchFromWiktionary(word);
        if (wiktResult && wiktResult.definitions.length > 0) {
            await cacheWord(word, wiktResult);
            return wiktResult;
        }
    } catch (e) { /* fall through */ }

    // 4. Word not found in any source
    return null;
}
