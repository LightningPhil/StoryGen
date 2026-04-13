# Phonics Assist Feature — Implementation Plan (Single Source of Truth)

> **Status:** Investigation complete — no code changes made yet.
> **Date:** 25 Feb 2026

---

## 1. Goal

Add a "Phonics Assist" feature to the existing **Assist panel** so that when a child clicks a word in the story, they see:

- The word broken into **phonics chunks** (grapheme–phoneme pairs), e.g. `n | igh | t`
- The **phoneme sequence**, e.g. `n · ay · t`
- The ability to **tap a chunk** to hear its individual sound
- A **"Sound it out"** button that highlights each chunk sequentially while playing its sound (karaoke-style)

This sits alongside the existing dictionary definitions, IPA, synonyms/antonyms, and "Hear pronunciation" button.

---

## 2. How the Existing Codebase Works (Integration Points)

### 2.1 Word-click flow

1. Every word in the story is rendered as a `<span class="story-word">` by `formatParagraphForAssist()` in **src/ui.js** (line ~493).
2. Clicking a word fires `handleStoryWordClick()` in **src/script.js** (line ~850), which:
   - Stores `selectedAssistWord` / `selectedAssistWordNormalized`
   - Switches to the **Assist tab**
   - Calls `prepareAssistPanelForWord(word)` (clears old data, shows loading)
   - Calls `lookupAssistDataForWord(word, normalizedWord)` which awaits `lookupWord()` from **src/wiktionary.js**, then calls `renderAssistResult(assistData)`.

### 2.2 Assist panel HTML (index.html, lines ~242–298)

The Assist tab lives inside `<div id="tab-assist">`. The word-specific content is inside `<div id="assistWordState">` and contains:
- `assistWordHeading` — the clicked word
- `assistIpa` + `assistSpeakButton` — IPA + pronunciation button
- `assistDefinitions`, `assistSynonyms`, `assistAntonyms`
- `assistLookupCount`, `assistSource`

**The new Phonics section will be injected into this panel**, between the pronunciation row and the definitions section (or as a new collapsible section).

### 2.3 Existing TTS system (src/script.js, lines ~580–800)

- `speakWithTTS(word)` — speaks a word using `SpeechSynthesisUtterance` with the user's chosen voice.
- `getSelectedTTSVoice()` — respects the user's voice/gender preference from settings.
- `cancelAssistSpeech()` — cancels any in-progress audio (both `<audio>` element and `speechSynthesis`).
- `primeTTSAudio()` — fires a near-silent utterance to warm up the TTS engine.
- `speakSelectedAssistWord()` — orchestrates dictionary-audio vs browser-TTS depending on user's `ttsSource` setting.

The phonics "sound out" feature will reuse `getSelectedTTSVoice()` and the same `SpeechSynthesisUtterance` approach, but speak short TTS hint strings per chunk rather than the full word.

### 2.4 Dictionary data flow (src/wiktionary.js)

`lookupWord()` returns an `AssistData` object shaped:
```js
{
  word, definitions, ipa, audioUrl, synonyms, antonyms, etymology, source
}
```
Phonics data is **not** a dictionary concern — it will be generated client-side via RiTa. The phonics data will be computed in parallel with (or after) the dictionary lookup, then merged into the Assist panel rendering.

---

## 3. New Data Model — `phonicsAssist`

When a word is clicked, compute and attach this object:

```js
{
  word: "night",
  phones: ["N", "AY1", "T"],        // raw ARPAbet from RiTa
  phonemes: ["n", "ay", "t"],        // normalized (stress digits removed, lowercased)
  chunks: [
    { grapheme: "n",   phoneme: "n",  ipa: "n",  ttsHint: "n" },
    { grapheme: "igh", phoneme: "ay", ipa: "aɪ", ttsHint: "eye" },
    { grapheme: "t",   phoneme: "t",  ipa: "t",  ttsHint: "t" },
  ],
  confidence: 0.85,                  // heuristic quality score
  fallback: false                    // true if alignment failed
}
```

**Why this structure:**
- `phones` / `phonemes` allow displaying the pure sound sequence even if grapheme alignment fails.
- `chunks` power the highlight-and-play UI.
- `confidence` determines whether to show grapheme chips (high confidence) or fall back to phoneme-only chips.
- `ttsHint` is a short English word/syllable the browser TTS can pronounce to approximate each phoneme sound.

---

## 4. RiTa Integration

### 4.1 Loading RiTa (CDN — no bundler)

StoryGen is a static site with no build step. Use CDN:

```html
<script src="https://unpkg.com/rita"></script>
```

This adds a global `RiTa` object. The `<script>` tag should go in **index.html** before the app's `<script type="module">` tag.

### 4.2 Accessing RiTa from ES modules

Because RiTa is loaded via a classic `<script>` tag, it attaches to `window.RiTa`. Inside ES modules (src/script.js etc.) access it as `window.RiTa` or:

```js
const RiTa = window.RiTa;
```

### 4.3 Getting phonemes

```js
function getPhones(word) {
  const raw = RiTa.phones(word);   // returns "n-ay1-t" or "ch-iy1-z"
  if (!raw) return null;
  return raw.split(/[-\s]+/g).filter(Boolean).map(t => t.toUpperCase());
}

function normalizePhone(p) {
  return p.replace(/[0-2]$/, "").toLowerCase();  // AY1 → ay
}
```

### 4.4 RiTa bundle size concern

RiTa (full) is ~2–3 MB including its lexicon. This is a **significant** addition for a static site. Mitigation options:
- Load it lazily: only fetch the script when the user first clicks a word (dynamic `<script>` injection).
- Use `rita.min.js` from the CDN.
- Accept the cost for v1; consider lighter alternatives later (see §8).

**Recommendation:** Lazy-load RiTa on first word click. Insert `<script>` dynamically, await `onload`, then proceed with phonics computation. Cache the load so subsequent clicks are instant.

---

## 5. Grapheme–Phoneme Alignment (the Hard Part)

### 5.1 Strategy: greedy longest-match with backtracking

1. Maintain a static `GRAPHEME_MAP` — an array of `{ g: "igh", p: ["ay"] }` entries sorted longest-first.
2. Use a depth-first search (DFS) that:
   - Tries the longest grapheme that matches the current position in the spelling.
   - Checks whether the associated phoneme(s) match the next phoneme(s) in the stream.
   - If yes, recurse on the remainder; if the recursion succeeds, return the result.
   - If no match or recursion fails, try the next candidate grapheme.
   - Fallback: consume one letter + one phoneme (keeps alignment moving).

### 5.2 Starter `GRAPHEME_MAP`

```js
const GRAPHEME_MAP = [
  // quadgraphs
  { g: "eigh", p: ["ey"] },
  { g: "tion", p: ["sh", "ah", "n"] },
  { g: "sion", p: ["zh", "ah", "n"] },
  { g: "ough", p: ["ow"] },

  // trigraphs
  { g: "igh", p: ["ay"] },
  { g: "tch", p: ["ch"] },
  { g: "dge", p: ["jh"] },

  // digraphs
  { g: "sh",  p: ["sh"] },
  { g: "ch",  p: ["ch"] },
  { g: "th",  p: ["th"] },
  { g: "ng",  p: ["ng"] },
  { g: "ph",  p: ["f"] },
  { g: "ee",  p: ["iy"] },
  { g: "oo",  p: ["uw"] },
  { g: "oa",  p: ["ow"] },
  { g: "ai",  p: ["ey"] },
  { g: "ay",  p: ["ey"] },

  // single letters (fallback)
  { g: "a", p: ["ae"] }, { g: "b", p: ["b"] }, { g: "c", p: ["k"] },
  { g: "d", p: ["d"] },  { g: "e", p: ["eh"] },{ g: "f", p: ["f"] },
  { g: "g", p: ["g"] },  { g: "h", p: ["hh"] },{ g: "i", p: ["ih"] },
  { g: "j", p: ["jh"] }, { g: "k", p: ["k"] }, { g: "l", p: ["l"] },
  { g: "m", p: ["m"] },  { g: "n", p: ["n"] }, { g: "o", p: ["aa"] },
  { g: "p", p: ["p"] },  { g: "r", p: ["r"] }, { g: "s", p: ["s"] },
  { g: "t", p: ["t"] },  { g: "u", p: ["ah"] },{ g: "v", p: ["v"] },
  { g: "w", p: ["w"] },  { g: "x", p: ["k","s"] },
  { g: "y", p: ["y"] },  { g: "z", p: ["z"] },
];
```

This map **will** need to grow over time. Many English words have irregular spellings that require additional entries (e.g. silent letters, schwa vowels, r-controlled vowels). The backtracking fallback handles gaps gracefully.

### 5.3 Alignment function (DFS)

```js
function alignGraphemesToPhones(word, phonesUpper) {
  const w = word.toLowerCase();
  const phones = phonesUpper.map(normalizePhone);
  const graphemes = [...GRAPHEME_MAP].sort((a, b) => b.g.length - a.g.length);

  function dfs(iChar, iPh) {
    if (iChar === w.length && iPh === phones.length) return [];
    if (iChar >= w.length || iPh > phones.length) return null;

    for (const entry of graphemes) {
      const { g, p } = entry;
      if (!w.startsWith(g, iChar)) continue;

      let ok = true;
      for (let k = 0; k < p.length; k++) {
        if (phones[iPh + k] !== p[k]) { ok = false; break; }
      }
      if (!ok) continue;

      const rest = dfs(iChar + g.length, iPh + p.length);
      if (rest) return [{ grapheme: g, phoneme: p.join(" ") }, ...rest];
    }

    // Fallback: consume one letter + one phoneme
    const rest = dfs(iChar + 1, iPh + 1);
    if (rest) return [{ grapheme: w[iChar], phoneme: phones[iPh] }, ...rest];

    return null;
  }

  return dfs(0, 0);
}
```

### 5.4 Building the full `phonicsAssist` object

```js
function buildPhonicsAssist(word) {
  const phonesUpper = getPhones(word);
  if (!phonesUpper) return { word, fallback: true };

  const chunksRaw = alignGraphemesToPhones(word, phonesUpper);
  if (!chunksRaw) {
    return {
      word, phones: phonesUpper,
      phonemes: phonesUpper.map(normalizePhone),
      chunks: [], confidence: 0, fallback: true
    };
  }

  const chunks = chunksRaw.map(ch => ({
    grapheme: ch.grapheme,
    phoneme: ch.phoneme,
    ttsHint: ttsHintForPhoneme(ch.phoneme),
  }));

  const fallbackCount = chunks.filter(c => c.grapheme.length === 1).length;
  const confidence = Math.max(0.1, 1 - fallbackCount / Math.max(3, chunks.length));

  return {
    word, phones: phonesUpper,
    phonemes: phonesUpper.map(normalizePhone),
    chunks, confidence, fallback: false
  };
}
```

---

## 6. TTS Hints for Phoneme Sounds

Browser TTS cannot reliably pronounce raw ARPAbet tokens. Instead, map each phoneme to a short English word/syllable that approximates the sound:

```js
function ttsHintForPhoneme(p) {
  switch (p) {
    case "ay": return "eye";
    case "iy": return "ee";
    case "uw": return "oo";
    case "ow": return "oh";
    case "sh": return "shh";
    case "ch": return "ch";
    case "th": return "th";
    case "dh": return "th";
    case "ng": return "ng";
    case "sh ah n": return "shun";
    case "zh ah n": return "zhun";
    default: return p;
  }
}
```

This is imperfect but workable for v1. The architecture is designed so `ttsHintForPhoneme()` can later be swapped for `playPhonemeAudio(phoneme)` without touching the UI.

---

## 7. "Sound It Out" Playback (Karaoke Highlight)

### 7.1 Core playback functions

```js
function speak(text, { lang = "en-GB", rate = 0.9 } = {}) {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend = resolve;
    speechSynthesis.speak(u);
  });
}

async function soundOutChunks(chunks, onHighlight) {
  for (let i = 0; i < chunks.length; i++) {
    onHighlight?.(i);                     // highlight chunk i
    await speak(chunks[i].ttsHint);       // play its sound
    await new Promise(r => setTimeout(r, 80));  // brief pause
  }
  onHighlight?.(-1);                      // clear highlight
}
```

### 7.2 Integration with existing TTS

- Reuse `getSelectedTTSVoice()` so the phonics voice matches the user's chosen reading voice.
- Call `cancelAssistSpeech()` before starting sound-out to avoid overlapping audio.
- The `speak()` helper above should use the selected voice, not hardcoded `en-GB`. Adjust at implementation time.

---

## 8. UI Design for the Assist Panel

### 8.1 New HTML section (inside `#assistWordState`, after pronunciation row)

```html
<section id="assistPhonicsSection" class="assist-section hidden">
    <h4>Sound it out</h4>
    <div id="phonicsChunks" class="phonics-chunks-row">
        <!-- dynamically populated with clickable chunk chips -->
    </div>
    <div class="phonics-controls">
        <button id="phonicsSoundOutButton" class="btn btn-secondary" type="button">
            ▶ Sound it out
        </button>
    </div>
    <div id="phonicsPhonemesRow" class="phonics-phonemes-row">
        <!-- e.g. "n · ay · t" -->
    </div>
</section>
```

### 8.2 Chunk chip rendering

Each chunk becomes a clickable chip:
```html
<span class="phonics-chunk" data-index="0">
    <span class="phonics-grapheme">n</span>
    <span class="phonics-phoneme">n</span>
</span>
<span class="phonics-chunk" data-index="1">
    <span class="phonics-grapheme">igh</span>
    <span class="phonics-phoneme">ay</span>
</span>
```

### 8.3 Behaviour

| Action | Result |
|---|---|
| Click a chunk chip | Highlight it + play its `ttsHint` via TTS |
| Click "Sound it out" | Sequential highlight + play all chunks (karaoke) |
| Low confidence / fallback | Show phoneme-only chips instead of grapheme chunks |

### 8.4 CSS (new classes needed)

- `.phonics-chunks-row` — flex wrap container for chunk chips
- `.phonics-chunk` — individual chip (border, padding, cursor pointer)
- `.phonics-chunk.is-highlighted` — active highlight during karaoke
- `.phonics-grapheme` — top line of chip (the letters)
- `.phonics-phoneme` — bottom line (the sound label, smaller/muted)
- `.phonics-controls` — button row
- `.phonics-phonemes-row` — fallback phoneme-only display

---

## 9. Where New Code Goes (File Placement)

| Concern | File | Notes |
|---|---|---|
| RiTa `<script>` tag | **index.html** | Before `<script type="module" src="./src/script.js">`. Lazy-load preferred. |
| `GRAPHEME_MAP`, `getPhones`, `normalizePhone`, `alignGraphemesToPhones`, `buildPhonicsAssist`, `ttsHintForPhoneme` | **New file: src/phonics.js** | Pure logic module, no DOM access. Exported functions. |
| Phonics section HTML | **index.html** | Inside `#assistWordState`, after `.assist-pronunciation-row` |
| Rendering phonics chips, highlight logic, sound-out playback | **src/script.js** | Alongside existing `renderAssistResult()`. New functions: `renderPhonicsSection()`, `handlePhonicsChipClick()`, `handleSoundOutClick()`. |
| CSS for phonics chips | **src/style.css** | New section at end of file. |

---

## 10. Integration Flow (Step-by-Step)

1. User clicks a word → `handleStoryWordClick()` fires.
2. `lookupAssistDataForWord()` starts the dictionary lookup (unchanged).
3. **In parallel**, call `buildPhonicsAssist(word)` (from src/phonics.js).
   - If RiTa isn't loaded yet, lazy-load it first (one-time cost).
4. When phonics data is ready, call `renderPhonicsSection(phonicsAssist)`.
   - If `fallback: true` or `confidence < 0.4`, show phoneme-only chips.
   - Otherwise show grapheme-phoneme chunk chips + "Sound it out" button.
5. Chunk chip click → `speakPhonemeChunk(chunk)` (uses TTS with `ttsHint`).
6. "Sound it out" button → `soundOutChunks(chunks, highlightCallback)`.

---

## 11. Confidence Threshold & Fallback Behaviour

| Confidence | UI shown |
|---|---|
| ≥ 0.6 | Full grapheme chunks with phoneme labels |
| 0.4 – 0.6 | Grapheme chunks + a small "approximation" disclaimer |
| < 0.4 or `fallback: true` | Phoneme-only chips (no grapheme alignment) |

The confidence heuristic counts how many chunks fell through to the single-letter fallback path. More sophisticated heuristics can be added later.

---

## 12. Risks & Limitations

### 12.1 English spelling irregularity
English has notoriously inconsistent grapheme-phoneme relationships. The `GRAPHEME_MAP` will never be complete. The DFS backtracking handles gaps, but some words will produce wrong or confusing chunks. The confidence score + fallback path mitigates this.

### 12.2 RiTa phoneme accuracy
RiTa uses a built-in lexicon (~40k words) plus letter-to-sound rules for unknown words. Common words should be accurate; rare/invented words (including character names from stories) may have wrong phonemes. The `fallback: true` flag covers this case.

### 12.3 Browser TTS inconsistency
Different browsers/OS combinations have very different TTS engines. Short phoneme hints like "eye" or "shh" may sound odd on some systems. This is acceptable for v1.

### 12.4 Bundle size
RiTa adds ~2–3 MB. Lazy-loading mitigates initial page load impact, but first-click latency increases. Pre-loading on idle could help.

### 12.5 Silent letters
Words like "knight" have a silent 'k'. The alignment must handle cases where a grapheme maps to zero phonemes. The current DFS approach doesn't explicitly support this — it would need a `{ g: "kn", p: ["n"] }` entry. This needs to be expanded over time.

---

## 13. Future Upgrade Paths (Post v1)

### 13.1 Bundled phoneme audio clips
Record or source ~44 phoneme audio clips (WAV/MP3). Play exact audio per phoneme instead of TTS hints. Best UX, most consistent. Replace `speak(ttsHint)` with `playPhonemeAudio(phoneme)` — the architecture supports this swap without UI changes.

### 13.2 eSpeak NG in WebAssembly
Deterministic phoneme synthesis in the browser. Heavier (~1 MB Wasm), but perfectly consistent across platforms. Could also replace RiTa for phoneme lookup.

### 13.3 Server-side phoneme lookup
If a backend is ever added, use CMU Pronouncing Dictionary or Phonetisaurus for higher-accuracy phonemes, and send `phonicsAssist` objects from the server.

### 13.4 Cache phonics data
Store computed `phonicsAssist` objects in the existing IndexedDB cache (alongside dictionary data) to avoid recomputing for repeated word clicks.

---

## 14. Implementation Checklist

- [ ] Add RiTa CDN script tag to index.html (or lazy-load mechanism)
- [ ] Create `src/phonics.js` with all pure-logic functions
- [ ] Add phonics HTML section to Assist panel in index.html
- [ ] Add CSS for phonics chips and highlight states to style.css
- [ ] Wire up `buildPhonicsAssist()` call in `handleStoryWordClick()` flow
- [ ] Implement `renderPhonicsSection()` in script.js
- [ ] Implement chunk click → speak ttsHint
- [ ] Implement "Sound it out" sequential karaoke playback
- [ ] Handle fallback/low-confidence display
- [ ] Test with common words: "night", "cheese", "through", "knight", "station"
- [ ] Test with story character names (likely fallback)
- [ ] Lazy-load RiTa to avoid blocking initial page load
