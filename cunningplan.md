# Cunning Plan: Assist Tab Overhaul

## Current State Assessment

### What Already Works (on paper)

The assist tab is **extensively implemented**. The full pipeline exists:

1. **HTML** — Three-state panel (`assistEmptyState` → loading → `assistWordState`) with sections for definition, synonyms/antonyms, IPA, and a "Hear pronunciation" button.
2. **Word tokenisation** — `formatParagraphForAssist()` in `ui.js` wraps every word in `<span class="story-word" data-story-word="..." data-word-normalized="...">`, making the entire story clickable at the word level.
3. **Click handler** — `handleStoryWordClick()` in `script.js` highlights the word, switches to the Assist tab, calls the LLM, and renders the result.
4. **LLM lookup** — `lookupAssistDataForWord()` fires a Gemini API call with a JSON-mode prompt asking for `{ word, definition, ipa, synonyms[], antonyms[] }`.
5. **TTS** — `speakSelectedAssistWord()` uses the native `SpeechSynthesis` API.
6. **Tab gating** — `setAssistTabEnabled(true)` is called after `displayFinalStoryOutput()` in both `handleGenerateStory()` and `handleElaborateStory()`.
7. **Vocabulary tracking** — Every lookup is persisted to localStorage with a timestamp and count.

### Known / Suspected Bugs

| # | Issue | Root Cause | Severity |
|---|-------|-----------|----------|
| B1 | **Assist tab doesn't visually enable after story generation** | Likely a CSS specificity or DOM-ordering issue. `setAssistTabEnabled(true)` removes the `disabled` attribute, but the button may still *appear* greyed out if the `.tab-btn:disabled` style isn't fully overridden, or if `aria-disabled` alone isn't enough for some browsers. **Needs live debugging.** Also check whether `assistTabButton` is actually resolved to the DOM element at init time — if the `document.getElementById` call runs before the DOM is ready, it will be `null` and `setAssistTabEnabled` silently returns. | **Critical** |
| B2 | **`showTemporaryToast()` is a no-op** | The function in `ui.js` only does `console.log`. The "Story generated successfully!" toast never appears, so users get no visual feedback that the story is done and assist is ready. | Medium |
| B3 | **Race-condition on very fast clicks** | The `requestToken` guard is correct, but if the Gemini call takes 3-5 seconds and the user clicks another word in that window, the loading spinner stays visible from the first call while the second call's spinner also starts. No explicit "cancel previous in-flight fetch" exists (AbortController is not used). | Low |

### Fundamental Design Problem

The current lookup is **entirely dependent on a Gemini API call**. This means:

- Every single word click costs API quota and has 1-5 second latency.
- If the user has no API key configured, Assist is completely dead.
- The LLM can hallucinate definitions, IPA, and synonyms — unacceptable for a vocabulary-learning feature aimed at children.
- There is no caching; clicking the same word twice fires two API calls.

---

## The Plan: Replace LLM Lookup with Wiktionary / Wiktextract

### Why Wiktextract?

[Wiktextract](https://github.com/tatuylonen/wiktextract) is a project that parses the entire English Wiktionary dump into structured JSON. The processed data is available as a downloadable JSONL file (~700 MB uncompressed for English) or via the **Kaikki** API at `https://kaikki.org/dictionary/`. Each entry contains:

- **Definitions** (with sense glosses, examples, tags)
- **IPA pronunciations** (often multiple: GenAm, RP, etc.)
- **Synonyms and antonyms** (from Wiktionary's thesaurus sections)
- **Etymology, part of speech, usage notes**, and more

This is factual, human-curated, and **free**.

### Architecture Decision: How to Query Wiktextract

There are three viable approaches. The recommended option is **Option A**.

#### Option A: Client-side fetch from Kaikki REST endpoint (Recommended)

Kaikki.org provides per-word JSON files at predictable URLs:
```
https://kaikki.org/dictionary/English/meaning/{first_letter}/{word}.json
```

**Pros:** Zero infrastructure, no API key needed, instant availability, no cost.
**Cons:** Relies on a third-party server (kaikki.org); may have CORS issues (needs testing); the URL scheme may change. Limited offline capability.

**Fallback strategy:** If kaikki.org is unreachable or the word isn't found, fall back to the Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`) which also provides definitions, IPA, and audio links.

#### Option B: Pre-built SQLite dictionary loaded via sql.js

Download the Wiktextract English JSONL dump, process it into a 50-100 MB SQLite database with only the fields we need (word, definitions, IPA, synonyms, antonyms), and load it client-side via `sql.js` (WebAssembly SQLite). This gives fully offline, instant lookups.

**Pros:** Completely offline, blazing fast, no network dependency.
**Cons:** Requires a build step to generate the database; 50-100 MB download on first load; needs to be periodically updated.

#### Option C: Hybrid — Kaikki fetch with localStorage cache

Fetch from Kaikki on first lookup, then cache the parsed result in localStorage/IndexedDB. Subsequent lookups for the same word are instant and offline.

**Pros:** Best of both worlds — no big upfront download, progressively faster.
**Cons:** localStorage has a 5-10 MB limit; would need IndexedDB for a large vocabulary. Cache invalidation is manual.

### Recommendation

**Start with Option A (Kaikki fetch) + Option C's caching layer (IndexedDB).** This gives us:
- Zero infrastructure cost
- No API key requirement for Assist
- Accurate, curated data
- Progressive offline capability
- A clean fallback chain: Kaikki → Free Dictionary API → graceful error message

---

## Detailed Implementation Plan

### Phase 1: Fix the Existing Bug (Assist tab not enabling)

**Files:** `script.js`, `ui.js`, `index.html`, `style.css`

1. **Verify DOM element references at init time.** In `script.js`, confirm that `assistTabButton` (and all other assist-related element refs like `assistEmptyState`, `assistWordState`, etc.) are assigned *after* `DOMContentLoaded`. Add a console assertion:
   ```js
   console.assert(assistTabButton !== null, 'assistTabButton not found in DOM');
   ```
   If any are `null`, the entire assist feature silently fails.

2. **Audit `setAssistTabEnabled(true)` call site.** In `handleGenerateStory()`, the call happens *after* `displayFinalStoryOutput()`. Verify this order is correct and that nothing in `displayFinalStoryOutput()` inadvertently disables the button again.

3. **Check CSS specificity.** The `.tab-btn:disabled` rule at `style.css` L415-426 sets `opacity: 0.55` and `cursor: not-allowed`. Confirm that when `disabled` is removed, these styles are actually removed. Some CSS-in-JS or specificity conflicts could keep the button looking disabled. Test by temporarily adding `outline: 3px solid red` to `.tab-btn:not(:disabled)` to see if it fires.

4. **Test `aria-disabled` vs `disabled`.** The code sets both. Some screen-reader-friendly patterns use `aria-disabled="true"` *without* the native `disabled` attribute (so the button is still focusable). If we're using native `disabled`, ensure the click handler's `if (btn.disabled) return;` guard works correctly. Consider whether we need both.

5. **Add a visible toast.** Replace the `console.log`-only `showTemporaryToast()` with an actual DOM toast so users *see* that the story is ready and can now click words for help. This is a separate but related UX improvement.

### Phase 2: Create the Wiktionary Lookup Module

**New file:** `src/wiktionary.js`

This module replaces the LLM-based lookup entirely. It exports a single async function:

```
lookupWord(word: string) → Promise<AssistData>
```

Where `AssistData` is:
```ts
{
  word: string;
  definitions: { partOfSpeech: string; glosses: string[] }[];
  ipa: string;        // Primary IPA transcription (prefer GenAm or first available)
  audioUrl?: string;  // URL to .ogg/.mp3 pronunciation file if available
  synonyms: string[];
  antonyms: string[];
  etymology?: string; // Brief etymology if available
  source: 'kaikki' | 'freedict' | 'cache';
}
```

#### 2.1 Kaikki Fetch Layer

```
async function fetchFromKaikki(word: string): Promise<RawKaikkiEntry[] | null>
```

- Construct the URL. Kaikki's URL scheme for individual words needs to be verified. If per-word files don't exist, use the search API or the bulk download.
- **Alternative verified endpoint:** `https://en.wiktionary.org/api/rest_v1/page/definition/{word}` — this is Wikimedia's own REST API and returns structured definition data. It's more reliable for CORS and availability. **Test both endpoints and pick the one that works best.**
- Handle 404 (word not found) gracefully.
- Handle network errors gracefully.
- Set a 5-second timeout via `AbortController`.

#### 2.2 Free Dictionary API Fallback

```
async function fetchFromFreeDictionary(word: string): Promise<FreeDictData | null>
```

- Endpoint: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- This free API returns definitions, phonetics (including IPA and audio URLs), synonyms, and antonyms.
- Use as fallback when Kaikki/Wiktionary REST fails.

#### 2.3 Response Normaliser

```
function normalizeKaikkiResponse(entries: RawKaikkiEntry[]): AssistData
function normalizeFreeDictResponse(data: FreeDictData): AssistData
```

Both normalise into the common `AssistData` shape. Key transformations:

- **Definitions:** Extract the first 2-3 senses per part of speech. Prefer glosses tagged as "simple" or "common" if available. Filter out archaic/obsolete senses.
- **IPA:** From Kaikki, entries have a `sounds` array with `ipa` fields and optional `tags` (e.g., "General-American", "Received-Pronunciation"). Pick GenAm first, then RP, then any available. From Free Dictionary, use the `phonetic` field directly.
- **Audio URL:** Kaikki entries often include `ogg_url` or `mp3_url` in the `sounds` array. Free Dictionary includes `audio` URLs in `phonetics[]`. Store whichever is available.
- **Synonyms/Antonyms:** Wiktextract stores these in `synonyms` and `antonyms` arrays on each sense. Deduplicate, cap synonyms at 8, antonyms at 5.
- **Child-friendly filtering:** If a definition contains profanity or is tagged as vulgar/offensive, skip it. Use a small blocklist or check Wiktionary's "vulgar"/"offensive" tags in the data.

#### 2.4 IndexedDB Cache Layer

```
async function getCachedWord(word: string): Promise<AssistData | null>
async function cacheWord(word: string, data: AssistData): Promise<void>
```

- Use IndexedDB (via a thin wrapper — could use `idb-keyval` or write ~30 lines of raw IndexedDB code to avoid a dependency).
- Store: `{ word (primary key), data: AssistData, cachedAt: timestamp }`.
- Cache expiry: 30 days (Wiktionary data changes very rarely).
- On lookup: check cache first → if miss, fetch from network → cache result → return.

#### 2.5 Main Lookup Orchestrator

```js
export async function lookupWord(rawWord) {
  const word = rawWord.trim().toLowerCase();

  // 1. Check cache
  const cached = await getCachedWord(word);
  if (cached) return { ...cached, source: 'cache' };

  // 2. Try Kaikki / Wiktionary REST
  try {
    const kaikkiData = await fetchFromKaikki(word);
    if (kaikkiData) {
      const result = normalizeKaikkiResponse(kaikkiData);
      await cacheWord(word, result);
      return { ...result, source: 'kaikki' };
    }
  } catch (e) { /* fall through */ }

  // 3. Fallback to Free Dictionary API
  try {
    const fdData = await fetchFromFreeDictionary(word);
    if (fdData) {
      const result = normalizeFreeDictResponse(fdData);
      await cacheWord(word, result);
      return { ...result, source: 'freedict' };
    }
  } catch (e) { /* fall through */ }

  // 4. Word not found
  return null;
}
```

### Phase 3: Rewire script.js to Use the New Module

**File:** `script.js`

1. **Remove** `buildAssistLookupPrompt()`, `extractJsonObjectText()`, `normalizeAssistList()`, `parseAssistLookupResponse()`, and the Gemini API call inside `lookupAssistDataForWord()`.

2. **Replace** `lookupAssistDataForWord()` with:
   ```js
   async function lookupAssistDataForWord(selectedWord, normalizedWord) {
     const requestToken = ++assistLookupRequestToken;

     try {
       const result = await lookupWord(selectedWord);

       // Guard against stale responses
       if (requestToken !== assistLookupRequestToken ||
           normalizedWord !== selectedAssistWordNormalized) return;

       if (!result) {
         setAssistLoadingState(false);
         setAssistErrorState(`No dictionary entry found for "${selectedWord}".`);
         return;
       }

       renderAssistResult(result);
     } catch (error) {
       if (requestToken !== assistLookupRequestToken ||
           normalizedWord !== selectedAssistWordNormalized) return;
       setAssistLoadingState(false);
       setAssistErrorState("Couldn't load help for this word. Try another.");
     }
   }
   ```

3. **Update** `renderAssistResult()` to handle the richer data shape:
   - Show **multiple definitions** grouped by part of speech (not just one string).
   - Show the **IPA** in the dedicated `#assistIpa` element.
   - If `audioUrl` is available, add a second pronunciation button that plays the actual Wiktionary audio file (higher quality than TTS).
   - Show **etymology** if present (new section, see Phase 4).
   - Show **data source** as a subtle footnote ("Source: Wiktionary" / "Source: Free Dictionary").

4. **Keep** the `requestToken` race-condition guard — it works well.

5. **Keep** the existing TTS functionality as a fallback — if no `audioUrl` is available from the dictionary data, the "Hear pronunciation" button still uses `SpeechSynthesis`. If `audioUrl` *is* available, prefer it.

### Phase 4: Enhance the Assist Panel UI

**Files:** `index.html`, `style.css`, `script.js`

#### 4.1 Updated Panel Layout

```html
<div id="assistWordState" class="hidden">
  <h3 id="assistWordHeading" class="assist-word-heading"></h3>

  <!-- Pronunciation row -->
  <div class="assist-pronunciation-row">
    <span id="assistIpa" class="assist-ipa"></span>
    <button id="assistSpeakButton" class="btn btn-icon" type="button" title="Hear pronunciation">
      🔊
    </button>
  </div>

  <div id="assistLoadingState" class="assist-status hidden">Looking this up...</div>
  <div id="assistErrorState" class="assist-status assist-status-error hidden"></div>

  <!-- Definitions (multiple, grouped by POS) -->
  <section class="assist-section">
    <h4>Definitions</h4>
    <div id="assistDefinitions"></div>
    <!-- Rendered dynamically: <p><strong>noun</strong> — a thing that...</p> etc. -->
  </section>

  <!-- Thesaurus -->
  <section class="assist-section">
    <h4>Thesaurus</h4>
    <div id="assistSynonyms" class="assist-word-list"></div>
    <div id="assistAntonyms" class="assist-word-list"></div>
  </section>

  <!-- Etymology (collapsible, optional) -->
  <details class="assist-section assist-etymology">
    <summary><h4>Etymology</h4></summary>
    <p id="assistEtymology"></p>
  </details>

  <!-- Source attribution -->
  <p id="assistSource" class="assist-source"></p>
</div>
```

#### 4.2 Make Synonyms/Antonyms Clickable

Each synonym or antonym should be rendered as a clickable chip/tag. Clicking one triggers a lookup for *that* word (reusing `lookupAssistDataForWord`). This lets users explore vocabulary in a natural, curiosity-driven way.

```html
<span class="assist-word-chip" data-word="brave">brave</span>
```

Add a click handler on the chips that calls the same lookup flow as clicking a story word, but without needing to highlight a word in the story text.

#### 4.3 Style Updates (style.css)

- `.assist-pronunciation-row` — Flexbox row: IPA text on left, speak button on right, vertically centred.
- `.assist-definitions-pos` — Bold label for part of speech.
- `.assist-word-chip` — Inline pill/tag style with hover effect, cursor pointer. Colour-coded: synonyms in blue-ish, antonyms in red-ish (using CSS custom properties for theme compatibility).
- `.assist-etymology` — Collapsed by default via `<details>`, subtle styling.
- `.assist-source` — Tiny, muted footnote text.

#### 4.4 Audio Playback Enhancement

If `audioUrl` is available from the dictionary data:
- Create a hidden `<audio>` element or use `new Audio(url)`.
- The "Hear pronunciation" button plays the real audio file first.
- If audio playback fails (e.g., 404, codec issue), fall back to `SpeechSynthesis`.
- Show a subtle visual indicator of which method is being used (e.g., the button text changes to "🔊 Hear pronunciation (recorded)" vs "🔊 Hear pronunciation (TTS)").

### Phase 5: Implement the Toast System

**Files:** `ui.js`, `style.css`, `index.html`

The current `showTemporaryToast()` only logs to console. Implement a real toast:

1. Add a toast container to `index.html`:
   ```html
   <div id="toastContainer" class="toast-container" aria-live="polite"></div>
   ```

2. In `ui.js`, replace the stub:
   ```js
   export function showTemporaryToast(message, type = 'info', duration = 3000) {
     const container = document.getElementById('toastContainer');
     if (!container) { console.log(`[Toast] ${message}`); return; }

     const toast = document.createElement('div');
     toast.className = `toast toast-${type}`;
     toast.textContent = message;
     container.appendChild(toast);

     // Trigger entrance animation
     requestAnimationFrame(() => toast.classList.add('toast-visible'));

     setTimeout(() => {
       toast.classList.remove('toast-visible');
       toast.addEventListener('transitionend', () => toast.remove());
     }, duration);
   }
   ```

3. Style in `style.css`:
   - Fixed position bottom-centre.
   - Slide-up + fade-in animation.
   - Colour variants: `toast-success` (green), `toast-error` (red), `toast-info` (blue).

This makes the "Story generated!" feedback visible, which indirectly tells users the Assist tab is now available.

### Phase 6: Remove the API Key Dependency for Assist

**File:** `script.js`

Currently, if no API key is set, clicking a word shows "Add an API key in Settings to use Assist." With the Wiktionary-based lookup, this check is no longer needed.

1. **Remove** the `if (!apiKey)` guard from `lookupAssistDataForWord()`.
2. The Assist tab should work **completely independently** of the Gemini API key. The API key is only needed for story generation.
3. Update any UI text that mentions needing an API key for Assist.

### Phase 7: Quality-of-Life Improvements

These are secondary but worth implementing for a polished experience.

#### 7.1 Loading Skeleton

Replace the "Looking this up..." text with a CSS skeleton animation (pulsing grey bars) in the definition, thesaurus, and IPA sections. This looks more professional and gives a sense of progress.

#### 7.2 Keyboard Navigation

- After a story is generated, allow users to press `Tab` to move focus into the story area, then use arrow keys to navigate between words.
- `Enter` on a focused word triggers the assist lookup.
- `Escape` closes the assist panel and returns focus to the story.

#### 7.3 Word Frequency Badge

The existing `trackVocabularyLookup()` data includes `lookupCount`. Show a small badge in the Assist panel: "You've looked this up 3 times" — useful for parents/educators tracking a child's vocabulary gaps.

#### 7.4 "Not Found" Graceful Degradation

If both Kaikki and Free Dictionary return nothing (e.g., for invented/fantasy words common in children's stories), show:
> "This word isn't in the dictionary — it might be a name or a made-up word from the story!"

This is much better than a raw error message.

---

## File Change Summary

| File | Changes |
|------|---------|
| **`src/wiktionary.js`** | **New file.** Kaikki fetch, Free Dictionary fallback, IndexedDB cache, normaliser, `lookupWord()` export. |
| **`src/script.js`** | Remove LLM prompt/parse functions. Replace `lookupAssistDataForWord` internals. Update `renderAssistResult` for richer data. Remove API key check for Assist. Wire up synonym/antonym chip clicks. Audio playback logic. |
| **`src/ui.js`** | Implement real `showTemporaryToast()`. |
| **`index.html`** | Update Assist panel HTML (multi-definition, etymology, source attribution, pronunciation row, toast container). |
| **`src/style.css`** | Toast styles. Skeleton loading animation. Word chips. Pronunciation row layout. Etymology collapsible. Source footnote. |
| **`src/localStorage.js`** | No changes needed (vocabulary tracking is fine as-is). |
| **`src/api.js`** | No changes needed (Assist no longer calls it). |

## Implementation Order

```
Phase 1  →  Fix assist-tab-not-enabling bug (30 min)
Phase 2  →  Build wiktionary.js module (2-3 hours)
Phase 3  →  Rewire script.js (1 hour)
Phase 4  →  Enhance assist panel UI (1-2 hours)
Phase 5  →  Toast system (30 min)
Phase 6  →  Remove API key dependency (15 min)
Phase 7  →  QoL polish (1-2 hours, can be deferred)
```

## Testing Checklist

- [ ] Generate a story → Assist tab becomes clickable
- [ ] Click a common word (e.g., "the", "brave", "happy") → definition, IPA, synonyms load
- [ ] Click a rare word (e.g., "ephemeral") → definition loads
- [ ] Click a proper noun / fantasy name → graceful "not found" message
- [ ] Click "Hear pronunciation" → audio plays (recorded if available, TTS otherwise)
- [ ] Click a synonym chip → that word's definition loads
- [ ] Click the same word twice → second lookup is instant (cached)
- [ ] Disconnect network → cached words still load, uncached words show helpful error
- [ ] No API key configured → Assist still works (only story generation is blocked)
- [ ] Rapid-click 5 different words → only the last one's result displays (no race conditions)
- [ ] Generate a new story → Assist panel resets, old word highlights clear
- [ ] Toast appears when story completes
- [ ] Dark mode → all Assist UI elements are properly themed

## API Endpoints to Verify Before Implementation

Before writing code, manually test these endpoints in a browser to confirm availability and response format:

1. **Kaikki individual word:**
   `https://kaikki.org/dictionary/English/meaning/b/br/brave.json`
   — Check if this URL pattern works, returns JSON, and has CORS headers.

2. **Wikimedia REST API:**
   `https://en.wiktionary.org/api/rest_v1/page/definition/brave`
   — Known to have CORS support. Returns structured definition data. May not include IPA/audio.

3. **Free Dictionary API:**
   `https://api.dictionaryapi.dev/api/v2/entries/en/brave`
   — Known to work, includes IPA and audio URLs.

Pick the primary source based on data richness (IPA + audio + synonyms) and CORS reliability. The Free Dictionary API is the safest bet for CORS; Kaikki has the richest data but CORS support is uncertain.
