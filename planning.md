# Implementation Plan: eSpeak-NG Dialect Phonics System

## Overview

Replace the current RiTa-based phonics system with an eSpeak-NG powered pipeline that:

- Supports **British English** (`en-GB-x-rp`) as primary, **American English** (`en-US`) as secondary
- Generates all assets at **build time** (lexicon JSON, alignment model JSON, phoneme MP3s)
- Runs entirely **statically at runtime** — no CDN dependency, no RiTa, just fetch JSON + play MP3
- Adds a **dialect toggle** in Settings so users can choose UK or US pronunciations

---

## Current State (what exists today)

### Files involved

| File | Role |
|------|------|
| `src/phonics.js` | RiTa lazy-loading, GRAPHEME_MAP (~80 hand-written entries), DFS alignment, TTS hint map |
| `src/script.js` | ~400 lines of phonics UI code (lines 560–950): `loadPhonicsForWord`, `renderPhonicsSection`, `speakPhonicsSound`, `startSoundOut`, `stopSoundOut`, chunk/phoneme click handlers, local MP3 cache |
| `index.html` | `#assistPhonicsSection` with chunk chips, sound-out button, phoneme fallback row (lines 268–285) |
| `src/style.css` | ~130 lines of `.phonics-*` CSS (lines 1861–2004) |
| `sounds/` | Empty directory with README.md documenting 39 single phonemes + 8 multi-phoneme clusters |
| `test-rita-phonemes.js` | Test script using RiTa in Node to list all phonemes |

### Key current behaviour

1. User clicks a word → `loadPhonicsForWord()` called in parallel with dictionary lookup
2. RiTa loaded lazily from CDN (`unpkg.com/rita/dist/rita.min.js`)
3. `buildPhonicsAssist(word)` uses RiTa's `.phones()` (ARPAbet/US only), then DFS aligner
4. Renders chunk chips (grapheme on top, phoneme below)
5. Click chip → `speakPhonicsSound()` tries local MP3 (`sounds/{phoneme}.mp3`), falls back to browser TTS
6. "Sound it out" button → sequential karaoke playback

### Problems being solved

- RiTa is **GPL-licensed** — licensing risk
- RiTa only provides **US/CMUdict pronunciations** — no British support
- RiTa loaded from **CDN at runtime** — slow first load, offline fragility
- Hand-written GRAPHEME_MAP has limited coverage
- No actual audio files exist yet — everything falls back to browser TTS

---

## New Architecture

```
BUILD TIME (local dev machine)                    RUNTIME (static site)
─────────────────────────────                     ──────────────────────
                                                     
CMUdict word list ─┐                              Browser fetches:
                   ├─ eSpeak-NG ─→ lexicon.json    ├─ phonics/{dialect}/lexicon.json
wordlist.txt ──────┘                               ├─ phonics/{dialect}/align_model.json
                                                   └─ phonics/{dialect}/audio/{token}.mp3
lexicon.json ─→ EM aligner ─→ align_model.json
                                                  Runtime JS:
lexicon.json ─→ eSpeak WAV ─→ ffmpeg ─→ MP3s      ├─ src/phonics/engine.js
                                                   ├─ src/phonics/viterbi_align.js
                                                   └─ src/phonics/audio_bank.js
```

---

## Prerequisites (install once)

| Tool | Purpose | Install |
|------|---------|---------|
| **eSpeak-NG** | Phonemise words + generate WAV audio | `winget install eSpeak-NG.eSpeak-NG` or download from [github.com/espeak-ng/espeak-ng](https://github.com/espeak-ng/espeak-ng/releases) |
| **ffmpeg** | Convert WAV → MP3 | `winget install Gyan.FFmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html) |
| **Node.js** | Already installed (used for build scripts) | ✅ Present |

> Both `espeak-ng` and `ffmpeg` must be on PATH before running build scripts.

---

## Task Breakdown

### Phase 1: Build tooling & prerequisites

#### Task 1.1 — Install eSpeak-NG and ffmpeg
- Install both tools
- Verify: `espeak-ng --version` and `ffmpeg -version`
- Add a note to README or a CONTRIBUTING.md about these prerequisites

#### Task 1.2 — Download CMUdict word list
- Download `cmudict.dict` from [github.com/cmusphinx/cmudict](https://github.com/cmusphinx/cmudict)
- Place in project root (or a `data/` folder)
- Add to `.gitignore` (it's ~4MB, we only need it at build time)

#### Task 1.3 — Create `scripts/extract_wordlist_from_cmudict.mjs`
- Parse cmudict.dict, extract unique lowercase alpha words
- Output `wordlist.txt` (one word per line, sorted)
- Expected: ~130k words

#### Task 1.4 — Create `scripts/build_lexicon_espeak.mjs`
- Read `wordlist.txt`, pipe words to `espeak-ng --stdin -q -x --sep=" " -v {dialect}`
- Parse output: one line of space-separated phoneme tokens per word
- Output: `public/phonics/{dialect}/lexicon.json` — `{ "word": ["ph", "on", "eme", ...], ... }`
- Run for both `en-GB-x-rp` and `en-US`

#### Task 1.5 — Create `scripts/train_align_model.mjs`
- EM algorithm: learn `P(phonemeSequence | grapheme)` from the lexicon
- Parameters: `MAX_G=5` (max grapheme length), `MAX_P=3` (max phoneme seq), `ITERS=6`
- Output: `public/phonics/{dialect}/align_model.json` — `{ maxG, maxP, table: { grapheme: { "ph seq": logprob } } }`
- Run for both dialects

#### Task 1.6 — Create `scripts/generate_audio_pack.mjs`
- Scan lexicon for all unique phoneme tokens
- For each token: generate WAV via `espeak-ng -v {dialect} -s 140 -w {out}.wav "{cue}"`
- Convert WAV → MP3 via `ffmpeg -y -i {in}.wav -codec:a libmp3lame -q:a 4 {out}.mp3`
- Delete WAV, keep MP3
- Output: `public/phonics/{dialect}/audio/{tokenKey}.mp3`
- `tokenKey()` normalisation: strip stress markers, replace `:` with `LONG`, `@` with `SCHWA`, non-alphanum with `_`
- Includes a `cueText()` map for common phonemes to get cleaner audio from eSpeak
- Run for both dialects

#### Task 1.7 — Add npm scripts for convenience
- Update `package.json`:
  ```json
  "scripts": {
    "phonics:wordlist": "node scripts/extract_wordlist_from_cmudict.mjs data/cmudict.dict wordlist.txt",
    "phonics:lex:uk": "node scripts/build_lexicon_espeak.mjs wordlist.txt en-GB-x-rp public/phonics/en-GB-x-rp/lexicon.json",
    "phonics:lex:us": "node scripts/build_lexicon_espeak.mjs wordlist.txt en-US public/phonics/en-US/lexicon.json",
    "phonics:model:uk": "node scripts/train_align_model.mjs public/phonics/en-GB-x-rp/lexicon.json public/phonics/en-GB-x-rp/align_model.json",
    "phonics:model:us": "node scripts/train_align_model.mjs public/phonics/en-US/lexicon.json public/phonics/en-US/align_model.json",
    "phonics:audio:uk": "node scripts/generate_audio_pack.mjs public/phonics/en-GB-x-rp/lexicon.json en-GB-x-rp public/phonics/en-GB-x-rp/audio",
    "phonics:audio:us": "node scripts/generate_audio_pack.mjs public/phonics/en-US/lexicon.json en-US public/phonics/en-US/audio",
    "phonics:build:uk": "npm run phonics:wordlist && npm run phonics:lex:uk && npm run phonics:model:uk && npm run phonics:audio:uk",
    "phonics:build:us": "npm run phonics:wordlist && npm run phonics:lex:us && npm run phonics:model:us && npm run phonics:audio:us",
    "phonics:build": "npm run phonics:build:uk && npm run phonics:build:us"
  }
  ```

#### Task 1.8 — Run the full build, verify outputs
- Run `npm run phonics:build` (UK first, then US)
- Verify directory structure:
  ```
  public/phonics/en-GB-x-rp/lexicon.json
  public/phonics/en-GB-x-rp/align_model.json
  public/phonics/en-GB-x-rp/audio/*.mp3
  public/phonics/en-US/lexicon.json
  public/phonics/en-US/align_model.json
  public/phonics/en-US/audio/*.mp3
  ```
- Spot-check a few words in each lexicon
- Spot-check alignment model has reasonable entries
- Play a few MP3s to verify audio quality

#### Task 1.9 — Update .gitignore
- Add `data/` (CMUdict), `wordlist.txt` to `.gitignore`
- The `public/phonics/` output should be **committed** (static assets needed at runtime)
- Keep `node_modules/` ignored (already done)

---

### Phase 2: Runtime engine (new browser modules)

#### Task 2.1 — Create `src/phonics/viterbi_align.js`
- Viterbi dynamic programming aligner using the learned `align_model.json`
- Input: `(word, phones[], model)` → Output: `[{ grapheme, phones[] }, ...]`
- Includes a length-bias toward longer graphemes (`+0.15 * gLen`)
- Fallback: 1 letter + 1 phone with heavy penalty (`-6.0`)
- Pure function, no side effects

#### Task 2.2 — Create `src/phonics/audio_bank.js`
- `AudioBank` class:
  - Constructor takes `baseUrl` (e.g. `/phonics/en-GB-x-rp/audio`)
  - `get(key)` — lazy-create and cache `Audio` element per key
  - `play(key)` — play single phoneme, returns Promise
  - `playSequence(keys, onHighlight)` — sequential karaoke, calls `onHighlight(index)` per step
  - `stop()` — cancel current sequence, pause all audio
  - Cancellation token pattern (`this.cancel` counter) for safe sequence abort

#### Task 2.3 — Create `src/phonics/engine.js`
- `PhonicsEngine` class:
  - `loadDialect(dialect)` — fetch lexicon.json + align_model.json, create `AudioBank`, cache per dialect
  - `assistForWord(wordRaw, dialect)` — look up word in lexicon, run Viterbi, return structured assist object
  - `tokenKey(t)` — must match the build script's file-naming convention
  - Returns: `{ word, dialect, phones, segments, chips, missing }` where chips have `{ grapheme, phone, audioKey }`
  - Falls back gracefully when word not in lexicon (`missing: true`)

---

### Phase 3: Integrate into existing UI

#### Task 3.1 — Add dialect setting to Settings modal + localStorage
- New local storage key: `LS_PHONICS_DIALECT` (default: `en-GB-x-rp`)
- Add to `src/localStorage.js`
- Add dropdown in Settings modal (index.html) near the existing TTS voice settings:
  ```html
  <label for="phonicsDialectSelect">Phonics Accent</label>
  <select id="phonicsDialectSelect">
      <option value="en-GB-x-rp" selected>British (RP)</option>
      <option value="en-US">American</option>
  </select>
  <div class="field-hint">Choose the accent used for sounding out words.</div>
  ```
- Wire up in script.js: save on change, load on init

#### Task 3.2 — Replace `loadPhonicsForWord()` in script.js
- Remove import of `ensureRitaLoaded`, `buildPhonicsAssist`, `ttsHintForPhoneme` from `phonics.js`
- Import `PhonicsEngine` from `./phonics/engine.js`
- Create singleton: `const phonicsEngine = new PhonicsEngine()`
- New `loadPhonicsForWord()`:
  1. Get current dialect from settings
  2. Call `phonicsEngine.assistForWord(word, dialect)`
  3. Store result in `currentPhonicsAssist`
  4. Call `renderPhonicsSection(assist)` — mostly unchanged
- No more lazy CDN loading — just a JSON fetch on first use (cached after that)

#### Task 3.3 — Update `renderPhonicsSection()` and `renderPhonemeOnlyChips()`
- Adapt to new assist object shape:
  - Old: `assist.chunks[].grapheme`, `.phoneme`, `.ttsHint`
  - New: `assist.chips[].grapheme`, `.phone`, `.audioKey`
- Chunk chip rendering:
  - Top: grapheme (same)
  - Bottom: phone label (was `.phoneme`, now `.phone`)
- Fallback display when `assist.missing === true`: show "Pronunciation not available for this word" or fall back to browser TTS for the whole word

#### Task 3.4 — Replace audio playback functions
- **Remove**: `phonemeAudioCache`, `SOUNDS_DIR`, `phonemeAudioPath()`, `tryPlayPhonemeAudio()`, `speakPhonicsSound()`, `speakPhonicsHintTTS()`
- **Replace with**: use `PhonicsEngine`'s `AudioBank` for chip clicks and sound-out:
  - `handlePhonicsChunkClick(index)` → `phonicsEngine.cache.get(dialect).audio.play(chip.audioKey)`
  - `startSoundOut()` → `phonicsEngine.cache.get(dialect).audio.playSequence(keys, highlightCallback)`
  - `stopSoundOut()` → `phonicsEngine.cache.get(dialect).audio.stop()`
- **Keep**: `speakPhonicsHintTTS()` as last-resort fallback when word not in lexicon (`assist.missing`)
- **Remove**: `window.__phonicsHelpers` (no longer needed)

#### Task 3.5 — Update `startSoundOut()` / `stopSoundOut()`
- Simplify dramatically using `AudioBank.playSequence()`:
  ```js
  async function startSoundOut() {
      const assist = currentPhonicsAssist;
      if (!assist || assist.missing) return;
      const dialect = getPhonicsDialect();
      const bundle = phonicsEngine.cache.get(dialect);
      if (!bundle) return;
      const keys = assist.chips.map(c => c.audioKey).filter(Boolean);
      isSoundingOut = true;
      // update button...
      await bundle.audio.playSequence(keys, (idx) => {
          if (idx >= 0) highlightPhonicsChunk(idx);
          else clearPhonicsHighlight();
      });
      isSoundingOut = false;
      // reset button...
  }
  ```
- `stopSoundOut()` → `bundle.audio.stop()` + UI reset

#### Task 3.6 — Remove old phonics.js module
- Delete `src/phonics.js` (RiTa-based module)
- Remove RiTa CDN script loading code
- Optionally remove `rita` from devDependencies in package.json (keep if test script still needs it)

---

### Phase 4: Cleanup & polish

#### Task 4.1 — Update the HTML phonics section
- The HTML structure (`#assistPhonicsSection`) stays largely the same
- May add a small dialect indicator label (e.g. "🇬🇧 RP" or "🇺🇸 US") next to "Sound it out" header
- Consider preloading phoneme audio for the current word's chips on render

#### Task 4.2 — Handle large lexicon file size
- A 130k-word lexicon JSON could be 5–15MB
- **Strategy 1 (recommended to start)**: Ship a "top N" lexicon (e.g. top 20k–30k most common English words) plus fallback to browser TTS for rare words
  - Use a word frequency list to filter
  - Results in ~1–3MB JSON, acceptable for a web app
- **Strategy 2 (later optimisation)**: Load lexicon into IndexedDB on first visit, then query from there
- **Strategy 3 (later optimisation)**: Split lexicon by first letter (`a.json`, `b.json`, ...) and fetch on demand

#### Task 4.3 — Remove old sounds/ directory and README
- The `sounds/` directory with its per-phoneme naming convention is superseded by `public/phonics/{dialect}/audio/`
- Remove `sounds/` and `sounds/README.md`
- Update any references

#### Task 4.4 — Update test-rita-phonemes.js or replace
- Either update to test the new eSpeak lexicon, or remove if no longer relevant
- Could create a new `test-phonics-coverage.mjs` that tests alignment quality against known words

#### Task 4.5 — CSS updates
- CSS classes (`.phonics-chunk`, `.phonics-grapheme`, `.phonics-phoneme`, etc.) stay the same
- The phone label displayed under graphemes changes format (eSpeak tokens vs ARPAbet) — may want to add a "friendly label" mapping for common symbols:
  - e.g. eSpeak `aI` → display "eye", `i:` → display "ee"
  - This is cosmetic, similar to the old `TTS_HINT_MAP`
- No structural CSS changes needed

#### Task 4.6 — Error handling & loading states
- Lexicon fetch failure → hide phonics section gracefully (same as current RiTa-fail behaviour)
- Model fetch failure → same
- Audio file 404 → `AudioBank.play()` should resolve without crashing (silent fail)
- Word not in lexicon → show "Pronunciation not available" + optionally fall back to browser TTS for whole word

---

## File Change Summary

### New files to create

| File | Phase | Description |
|------|-------|-------------|
| `scripts/extract_wordlist_from_cmudict.mjs` | 1.3 | Extract word list from CMUdict |
| `scripts/build_lexicon_espeak.mjs` | 1.4 | Generate dialect lexicon via eSpeak |
| `scripts/train_align_model.mjs` | 1.5 | EM-trained grapheme↔phoneme alignment model |
| `scripts/generate_audio_pack.mjs` | 1.6 | Generate MP3 audio pack per dialect |
| `src/phonics/viterbi_align.js` | 2.1 | Viterbi aligner (browser runtime) |
| `src/phonics/audio_bank.js` | 2.2 | AudioBank class (browser runtime) |
| `src/phonics/engine.js` | 2.3 | PhonicsEngine class (browser runtime) |
| `public/phonics/en-GB-x-rp/lexicon.json` | 1.8 | Generated — British lexicon |
| `public/phonics/en-GB-x-rp/align_model.json` | 1.8 | Generated — British alignment model |
| `public/phonics/en-GB-x-rp/audio/*.mp3` | 1.8 | Generated — British phoneme audio |
| `public/phonics/en-US/lexicon.json` | 1.8 | Generated — American lexicon |
| `public/phonics/en-US/align_model.json` | 1.8 | Generated — American alignment model |
| `public/phonics/en-US/audio/*.mp3` | 1.8 | Generated — American phoneme audio |

### Files to modify

| File | Phase | Changes |
|------|-------|---------|
| `package.json` | 1.7 | Add `scripts` for build commands |
| `.gitignore` | 1.9 | Add `data/`, `wordlist.txt` |
| `src/script.js` | 3.2–3.5 | Replace phonics imports, rewrite `loadPhonicsForWord()`, simplify playback functions, add dialect setting wiring |
| `index.html` | 3.1, 4.1 | Add dialect dropdown in Settings, optional dialect indicator in Assist panel |
| `src/localStorage.js` | 3.1 | Add `LS_PHONICS_DIALECT` constant |

### Files to delete

| File | Phase | Reason |
|------|-------|--------|
| `src/phonics.js` | 3.6 | Replaced by `src/phonics/engine.js` + build-time assets |
| `sounds/` directory | 4.3 | Superseded by `public/phonics/{dialect}/audio/` |

### Files unaffected

| File | Reason |
|------|--------|
| `src/style.css` | CSS class names unchanged; only displayed label text differs |
| `src/api.js`, `src/appState.js`, `src/ui.js`, `src/utils.js`, `src/wiktionary.js` | No phonics involvement |
| `src/pipeline.js`, `src/localStorage.js` (mostly) | No phonics involvement (localStorage gets one new key) |
| `src/prompts/*` | No phonics involvement |

---

## Execution Order

```
Phase 1: Build tooling
  1.1  Install eSpeak-NG + ffmpeg
  1.2  Download CMUdict
  1.3  Create extract_wordlist script
  1.4  Create build_lexicon script
  1.5  Create train_align_model script
  1.6  Create generate_audio_pack script
  1.7  Add npm scripts to package.json
  1.8  Run full build, verify outputs
  1.9  Update .gitignore

Phase 2: Runtime engine (can start in parallel with 1.3–1.6)
  2.1  Create viterbi_align.js
  2.2  Create audio_bank.js
  2.3  Create engine.js

Phase 3: Integration (requires Phase 1.8 + Phase 2 completed)
  3.1  Add dialect setting (localStorage + Settings UI)
  3.2  Replace loadPhonicsForWord()
  3.3  Update render functions
  3.4  Replace audio playback
  3.5  Simplify startSoundOut / stopSoundOut
  3.6  Remove old phonics.js

Phase 4: Cleanup
  4.1  Polish HTML
  4.2  Handle lexicon size (top-N filter)
  4.3  Remove old sounds/ directory
  4.4  Update/replace test script
  4.5  CSS label polish
  4.6  Error handling review
```

---

## Risks & Decisions

| Risk / Decision | Mitigation |
|-----------------|------------|
| **eSpeak-NG Windows install** may need manual PATH setup | Document in README; verify before proceeding |
| **Lexicon size** (130k words → ~10MB JSON) | Start with top-20k frequency-filtered list; optimise later |
| **eSpeak phoneme token inventory** varies by voice/version | After first build, audit unique tokens and update `cueText()` map |
| **Alignment model training time** on 130k words | May take minutes; can use smaller subset (top 30k) for faster iteration |
| **RiTa GPL licence** — existing code currently imports it | Fully removed in Phase 3.6; no RiTa code will remain at runtime |
| **Audio file count** per dialect might be 40–80 small MP3s | Acceptable; total size ~2MB per dialect |
| **Generated MP3 quality** from eSpeak | "Good enough" to start; can hand-record replacements later |
| **Offline support** | Lexicon + model + audio all local; works fully offline once loaded |

---

## Open Questions (to resolve during implementation)

1. **Frequency-filtered word list**: What top-N cutoff? 20k? 30k? Need a frequency source (can use Google Ngrams or a wordfreq library).
2. **eSpeak token → human-friendly label**: Full mapping TBD after first build reveals the actual token inventory for each dialect.
3. **Should we keep browser TTS as fallback** for words not in lexicon? (Recommended: yes, using the existing `speakPhonicsHintTTS` function.)
4. **Should `public/phonics/` be committed to git?** The generated audio + JSON could be 10-20MB per dialect. Alternative: generate in CI or document "run build before deploying". (Recommended: commit the filtered/small version, ~3-5MB per dialect.)
