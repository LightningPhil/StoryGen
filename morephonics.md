Got it. Here’s a **single, complete “build once with Node, run forever as a static site” system** that supports **British-first** and also **American English**, with the same UI pipeline:

clicked word → **dialect pronunciation** → **grapheme↔phoneme aligner** → render chips → play per-sound MP3 while highlighting.

The key change vs “RiTa-only” is: **RiTa’s phonemes are ARPAbet / CMUdict-style (General American)** ([rednoise.org][1]), so it’s not a great “source of truth” for UK pronunciations. For dialect support you want a *dialect-capable pronouncer at build time*.

**eSpeak NG** is perfect for this because:

* it supports both **British** and **General American** voice tags (including RP) ([GitHub][2])
* it can output phoneme strings (`-x`) and/or IPA (`--ipa`) ([GitHub][3])
* you can generate WAV files (`-w`) for your MP3 pack ([GitHub][3])

(And you avoid “scraping” copyrighted phonics audio.)

---

## Dialects you’ll support

Use eSpeak’s BCP47 voice tags:

* **British (recommended):** `en-GB-x-rp` (Received Pronunciation) ([GitHub][2])
* **British (broader):** `en` (British English) ([GitHub][2])
* **American:** `en-US` (General American) ([GitHub][2])

I’d start with **`en-GB-x-rp`** for consistency, then optionally add a toggle later for `en` (more “modern British” sounding).

---

## What you will ship (static assets)

For each dialect (UK, US):

1. `public/phonics/<dialect>/lexicon.json`
   `word -> phonemeTokens[]` (generated at build time)

2. `public/phonics/<dialect>/align_model.json`
   learned mapping `grapheme -> phonemeSeq` with log-probs (learned from the lexicon)

3. `public/phonics/<dialect>/audio/<tokenKey>.mp3`
   short sound files, one per phoneme token (generated at build time)

Runtime is then fully static: fetch JSON + play MP3.

---

## Runtime pipeline (browser)

### The object you return to your Assist tab

```js
{
  word: "night",
  dialect: "en-GB-x-rp",
  phones: ["n","aI","t"],
  segments: [
    { grapheme: "n",   phones: ["n"] },
    { grapheme: "igh", phones: ["aI"] },
    { grapheme: "t",   phones: ["t"] },
  ],
  chips: [
    { grapheme:"n",   phone:"n",  audioKey:"n"  },
    { grapheme:"igh", phone:"aI", audioKey:"aI" },
    { grapheme:"t",   phone:"t",  audioKey:"t"  },
  ],
}
```

Your UI renders `chips` as stacked buttons:

* top: grapheme (`igh`)
* bottom: sound label (`/aI/` or a kid hint like “eye”)
* click: highlight + play `audioKey.mp3`
* “Play all”: iterate chips with highlighting

---

## Build step overview (Node)

You’ll run these scripts locally:

1. **Get a word list**
   Easiest is to use the CMUdict word list as your base vocabulary (open/unrestricted use; acknowledgement requested) ([GitHub][4])
   Even though CMUdict is US-centric, the *word list itself* is great coverage.

2. **Generate dialect lexicon with eSpeak**
   Run eSpeak once per dialect to phonemize every word (batch via `--stdin`) using `-x` (phoneme mnemonics) and `-q` (no audio) ([GitHub][3])

3. **Train the grapheme↔phoneme alignment model**
   Train `P(phonemeSeq | grapheme)` via a simple EM loop (so you don’t hand-write “all letter combos”)

4. **Generate MP3 audio pack**
   For each unique phoneme token in that dialect, generate a WAV (`-w`) ([GitHub][3]), convert to MP3, store under `/audio/`

---

# Complete example implementation

## A) File layout

```text
/public/phonics/
  en-GB-x-rp/
    lexicon.json
    align_model.json
    audio/*.mp3
  en-US/
    lexicon.json
    align_model.json
    audio/*.mp3

/scripts/
  extract_wordlist_from_cmudict.mjs
  build_lexicon_espeak.mjs
  train_align_model.mjs
  generate_audio_pack.mjs

/src/phonics/
  engine.js
  viterbi_align.js
  audio_bank.js
```

---

## B) Build scripts (Node)

### 1) Extract word list from CMUdict

CMUdict is “completely unrestricted” to use/redistribute, with an acknowledgement request ([GitHub][4]).

```js
// scripts/extract_wordlist_from_cmudict.mjs
import fs from "node:fs/promises";

const cmuPath = process.argv[2]; // e.g. cmudict.dict
const outPath = process.argv[3] || "wordlist.txt";
if (!cmuPath) {
  console.error("Usage: node scripts/extract_wordlist_from_cmudict.mjs <cmudict.dict> [wordlist.txt]");
  process.exit(1);
}

const txt = await fs.readFile(cmuPath, "utf8");
const words = [];

for (const line of txt.split(/\r?\n/)) {
  if (!line || line.startsWith(";;;")) continue;
  const w = line.split(/\s+/)[0]?.toLowerCase()?.replace(/\(\d+\)$/, "");
  if (w && /^[a-z']+$/.test(w)) words.push(w);
}

// unique + sorted
const uniq = [...new Set(words)].sort();
await fs.writeFile(outPath, uniq.join("\n") + "\n", "utf8");
console.log(`Wrote ${uniq.length} words -> ${outPath}`);
```

---

### 2) Build lexicon for a dialect using eSpeak (batch)

We use:

* `--stdin` to read many lines ([GitHub][3])
* `-x` to output phoneme mnemonics ([GitHub][3])
* `-q` so it doesn’t speak ([GitHub][3])
* `-v <dialect>` to choose UK/US ([GitHub][3])
* `--sep` to force a separator char between phonemes ([GitHub][3])

```js
// scripts/build_lexicon_espeak.mjs
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const wordlistPath = process.argv[2];       // wordlist.txt
const dialect = process.argv[3];            // en-GB-x-rp OR en-US
const outPath = process.argv[4];            // public/phonics/<dialect>/lexicon.json

if (!wordlistPath || !dialect || !outPath) {
  console.error("Usage: node scripts/build_lexicon_espeak.mjs <wordlist.txt> <dialect> <out.json>");
  process.exit(1);
}

const words = (await fs.readFile(wordlistPath, "utf8"))
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

const args = [
  "-q",
  "--stdin",
  "-v", dialect,
  "-x",
  "--sep= ",      // space-separated tokens
];

const child = spawn("espeak-ng", args, { stdio: ["pipe", "pipe", "inherit"] });

let out = "";
child.stdout.on("data", d => (out += d.toString("utf8")));

child.stdin.write(words.join("\n") + "\n");
child.stdin.end();

const exitCode = await new Promise(resolve => child.on("close", resolve));
if (exitCode !== 0) throw new Error(`espeak-ng exited with code ${exitCode}`);

const lines = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

if (lines.length !== words.length) {
  console.warn(`Warning: words=${words.length} but espeak lines=${lines.length}. Proceeding with min length.`);
}

const n = Math.min(words.length, lines.length);
const lex = {};

for (let i = 0; i < n; i++) {
  const w = words[i];
  const phones = normalizePhones(lines[i]);
  if (phones.length) lex[w] = phones;
}

await fs.mkdir(outPath.split("/").slice(0, -1).join("/"), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(lex), "utf8");
console.log(`Wrote lexicon ${Object.keys(lex).length} -> ${outPath}`);

function normalizePhones(line) {
  // Example outputs can contain stress markers etc. Keep only “tokens”
  // and strip common stress/punct markers.
  return line
    .split(/\s+/)
    .map(t => t.replace(/[',]/g, ""))     // stress markers
    .filter(Boolean);
}
```

---

### 3) Train the aligner model per dialect

This learns the “all letter combos → all sound combos” *from the lexicon*, rather than you hand-writing it.

```js
// scripts/train_align_model.mjs
import fs from "node:fs/promises";

const lexPath = process.argv[2];       // public/phonics/<dialect>/lexicon.json
const outPath = process.argv[3];       // public/phonics/<dialect>/align_model.json

const MAX_G = 5; // max grapheme length
const MAX_P = 3; // max phoneme sequence length
const ITERS = 6;

if (!lexPath || !outPath) {
  console.error("Usage: node scripts/train_align_model.mjs <lexicon.json> <align_model.json>");
  process.exit(1);
}

const lex = JSON.parse(await fs.readFile(lexPath, "utf8"));
const data = Object.entries(lex).map(([letters, phones]) => ({ letters, phones }));

let table = new Map(); // key "g|||pseq" -> logProb

// tiny uniform seed
for (const { letters, phones } of data.slice(0, 5000)) {
  for (let i = 0; i < letters.length; i++) {
    for (let gLen = 1; gLen <= MAX_G && i + gLen <= letters.length; gLen++) {
      const g = letters.slice(i, i + gLen);
      for (let pLen = 1; pLen <= MAX_P && pLen <= phones.length; pLen++) {
        const pseq = phones.slice(0, pLen).join(" ");
        table.set(`${g}|||${pseq}`, Math.log(1e-6));
      }
    }
  }
}

for (let it = 0; it < ITERS; it++) {
  const counts = new Map();
  const totals = new Map();

  for (const { letters, phones } of data) {
    const exp = expectedCounts(letters, phones, table);
    if (!exp) continue;

    for (const [key, c] of exp) {
      counts.set(key, (counts.get(key) || 0) + c);
      const g = key.split("|||")[0];
      totals.set(g, (totals.get(g) || 0) + c);
    }
  }

  const next = new Map();
  for (const [key, c] of counts) {
    const [g] = key.split("|||");
    const tot = totals.get(g) || 1;
    next.set(key, Math.log(c / tot));
  }
  table = next;

  console.log(`EM ${it + 1}/${ITERS}: entries=${table.size}`);
}

// export nested JSON for fast runtime
const model = { maxG: MAX_G, maxP: MAX_P, table: {} };
for (const [key, logp] of table) {
  const [g, pseq] = key.split("|||");
  model.table[g] ||= {};
  model.table[g][pseq] = logp;
}

await fs.writeFile(outPath, JSON.stringify(model), "utf8");
console.log(`Wrote model -> ${outPath}`);

function expectedCounts(letters, phones, table) {
  const L = letters.length, P = phones.length;
  const F = make2D(L + 1, P + 1, -Infinity);
  const B = make2D(L + 1, P + 1, -Infinity);
  F[0][0] = 0;

  for (let i = 0; i <= L; i++) for (let j = 0; j <= P; j++) {
    const cur = F[i][j]; if (!isFinite(cur)) continue;
    for (let gLen = 1; gLen <= MAX_G && i + gLen <= L; gLen++) {
      const g = letters.slice(i, i + gLen);
      for (let pLen = 1; pLen <= MAX_P && j + pLen <= P; pLen++) {
        const pseq = phones.slice(j, j + pLen).join(" ");
        const key = `${g}|||${pseq}`;
        const logp = table.get(key) ?? Math.log(1e-12);
        F[i + gLen][j + pLen] = logAdd(F[i + gLen][j + pLen], cur + logp);
      }
    }
  }

  const Z = F[L][P];
  if (!isFinite(Z)) return null;

  B[L][P] = 0;
  for (let i = L; i >= 0; i--) for (let j = P; j >= 0; j--) {
    const cur = B[i][j]; if (!isFinite(cur)) continue;
    for (let gLen = 1; gLen <= MAX_G && i - gLen >= 0; gLen++) {
      const g = letters.slice(i - gLen, i);
      for (let pLen = 1; pLen <= MAX_P && j - pLen >= 0; pLen++) {
        const pseq = phones.slice(j - pLen, j).join(" ");
        const key = `${g}|||${pseq}`;
        const logp = table.get(key) ?? Math.log(1e-12);
        B[i - gLen][j - pLen] = logAdd(B[i - gLen][j - pLen], cur + logp);
      }
    }
  }

  const counts = new Map();
  for (let i = 0; i <= L; i++) for (let j = 0; j <= P; j++) {
    if (!isFinite(F[i][j])) continue;
    for (let gLen = 1; gLen <= MAX_G && i + gLen <= L; gLen++) {
      const g = letters.slice(i, i + gLen);
      for (let pLen = 1; pLen <= MAX_P && j + pLen <= P; pLen++) {
        const pseq = phones.slice(j, j + pLen).join(" ");
        const key = `${g}|||${pseq}`;
        const logp = table.get(key) ?? Math.log(1e-12);
        const logc = F[i][j] + logp + B[i + gLen][j + pLen] - Z;
        const c = Math.exp(logc);
        if (c > 0) counts.set(key, (counts.get(key) || 0) + c);
      }
    }
  }
  return counts;
}

function make2D(a, b, fill) { return Array.from({ length: a }, () => Array.from({ length: b }, () => fill)); }
function logAdd(x, y) {
  if (!isFinite(x)) return y;
  if (!isFinite(y)) return x;
  if (x < y) [x, y] = [y, x];
  return x + Math.log1p(Math.exp(y - x));
}
```

---

### 4) Generate the MP3 pack per dialect

Use:

* `-w` to write WAV ([GitHub][3])
* `-v <dialect>` to get UK vs US voice ([GitHub][3])

This script:

* scans the lexicon for all unique tokens
* generates one MP3 per token using a “cue text” strategy (good enough for phonics; you can refine later)

```js
// scripts/generate_audio_pack.mjs
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const lexPath  = process.argv[2]; // public/phonics/<dialect>/lexicon.json
const dialect  = process.argv[3]; // en-GB-x-rp / en-US
const outDir   = process.argv[4]; // public/phonics/<dialect>/audio

if (!lexPath || !dialect || !outDir) {
  console.error("Usage: node scripts/generate_audio_pack.mjs <lexicon.json> <dialect> <outDir>");
  process.exit(1);
}

await fs.mkdir(outDir, { recursive: true });

const lex = JSON.parse(await fs.readFile(lexPath, "utf8"));
const tokens = collectTokens(lex);

for (const t of tokens) {
  const key = tokenKey(t);
  const mp3 = `${outDir}/${key}.mp3`;
  const wav = `${outDir}/${key}.wav`;

  // skip if exists
  try { await fs.access(mp3); continue; } catch {}

  const cue = cueText(t);
  await exec("espeak-ng", ["-v", dialect, "-s", "140", "-w", wav, cue]); // -w writes WAV :contentReference[oaicite:18]{index=18}
  await exec("ffmpeg", ["-y", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "4", mp3]);
  await fs.rm(wav);

  console.log(`ok  ${t} -> ${key}.mp3`);
}

function collectTokens(lex) {
  const set = new Set();
  for (const phones of Object.values(lex)) {
    for (const p of phones) set.add(p);
  }
  return [...set].sort();
}

// Make filenames Windows-safe and URL-safe
export function tokenKey(t) {
  return t
    .replace(/[',]/g, "")  // stress markers
    .replace(/:/g, "LONG") // ':' invalid on Windows filenames
    .replace(/@/g, "SCHWA")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "UNK";
}

// “Good enough” cues: you’ll refine this list over time based on your actual token inventory.
// The goal is NOT perfect phonetics — it’s consistent kid-friendly “sound it out”.
function cueText(t) {
  const k = t.replace(/[',]/g, "");
  const map = {
    // vowels / diphthongs (common in eSpeak English docs)
    "aI": "eye",
    "eI": "ay",
    "oU": "oh",
    "aU": "ow",
    "OI": "oy",
    "@": "uh",
    "i:": "eee",
    "u:": "ooo",
    "A:": "ahh",
    "O:": "or",
    "3:": "err",

    // consonant-ish
    "S": "shh",
    "tS": "ch",
    "dZ": "j",
    "N": "ng",
    "T": "th",
    "D": "th",
    "h": "h",
    "s": "sss",
    "z": "zzz",
    "f": "fff",
    "v": "vvv",
    "m": "mmm",
    "n": "nnn",
    "l": "lll",
    "r": "rrr",
    "w": "w",
    "j": "y",
  };
  return map[k] || k;
}
```

> Note: eSpeak’s exact token inventory can vary slightly by version/voice, so you’ll likely add a few entries to the cue map after your first run.

---

## C) Runtime code (browser)

### 1) Viterbi aligner (word letters + phones → segments)

```js
// src/phonics/viterbi_align.js
const join = (arr) => arr.join(" ");

export function viterbiAlign(word, phones, model) {
  const w = word.toLowerCase();
  const P = phones;
  const { maxG, maxP, table } = model;

  const dp = Array.from({ length: w.length + 1 }, () =>
    Array.from({ length: P.length + 1 }, () => -Infinity)
  );
  const bp = Array.from({ length: w.length + 1 }, () =>
    Array.from({ length: P.length + 1 }, () => null)
  );

  dp[0][0] = 0;

  for (let i = 0; i <= w.length; i++) for (let j = 0; j <= P.length; j++) {
    if (!isFinite(dp[i][j])) continue;

    for (let gLen = 1; gLen <= maxG && i + gLen <= w.length; gLen++) {
      const g = w.slice(i, i + gLen);
      const cand = table[g];
      if (!cand) continue;

      for (let pLen = 1; pLen <= maxP && j + pLen <= P.length; pLen++) {
        const pSeqArr = P.slice(j, j + pLen);
        const pSeq = join(pSeqArr);
        const logp = cand[pSeq];
        if (logp === undefined) continue;

        const score = dp[i][j] + logp + 0.15 * gLen; // bias toward longer graphemes
        const ni = i + gLen, nj = j + pLen;
        if (score > dp[ni][nj]) {
          dp[ni][nj] = score;
          bp[ni][nj] = { i, j, g, pSeqArr };
        }
      }
    }

    // fallback: 1 letter + 1 phone, heavily penalized
    if (i < w.length && j < P.length) {
      const score = dp[i][j] - 6.0;
      if (score > dp[i + 1][j + 1]) {
        dp[i + 1][j + 1] = score;
        bp[i + 1][j + 1] = { i, j, g: w[i], pSeqArr: [P[j]] };
      }
    }
  }

  if (!isFinite(dp[w.length][P.length])) return null;

  const segs = [];
  let i = w.length, j = P.length;
  while (i !== 0 || j !== 0) {
    const b = bp[i][j];
    if (!b) break;
    segs.push({ grapheme: b.g, phones: b.pSeqArr });
    i = b.i; j = b.j;
  }
  segs.reverse();
  return segs;
}
```

### 2) Audio bank

```js
// src/phonics/audio_bank.js
export class AudioBank {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.cache = new Map();
    this.cancel = 0;
  }
  url(key) { return `${this.baseUrl}/${key}.mp3`; }

  get(key) {
    if (!this.cache.has(key)) {
      const a = new Audio(this.url(key));
      a.preload = "auto";
      this.cache.set(key, a);
    }
    return this.cache.get(key);
  }

  async play(key) {
    const a = this.get(key);
    a.pause(); a.currentTime = 0;
    await a.play();
    await new Promise(r => { a.onended = r; a.onerror = r; });
  }

  async playSequence(keys, onHighlight) {
    const token = ++this.cancel;
    for (let i = 0; i < keys.length; i++) {
      if (token !== this.cancel) return;
      onHighlight?.(i);
      await this.play(keys[i]);
      await new Promise(r => setTimeout(r, 60));
    }
    onHighlight?.(-1);
  }

  stop() { this.cancel++; for (const a of this.cache.values()) { a.pause(); a.currentTime = 0; } }
}
```

### 3) Engine (dialect switch)

```js
// src/phonics/engine.js
import { viterbiAlign } from "./viterbi_align.js";
import { AudioBank } from "./audio_bank.js";

export class PhonicsEngine {
  constructor() {
    this.cache = new Map(); // dialect -> { lex, model, audioBank }
  }

  async loadDialect(dialect) {
    if (this.cache.has(dialect)) return this.cache.get(dialect);

    const base = `/phonics/${dialect}`;
    const [lex, model] = await Promise.all([
      fetch(`${base}/lexicon.json`).then(r => r.json()),
      fetch(`${base}/align_model.json`).then(r => r.json()),
    ]);

    const audio = new AudioBank(`${base}/audio`);
    const bundle = { lex, model, audio, dialect };
    this.cache.set(dialect, bundle);
    return bundle;
  }

  async assistForWord(wordRaw, dialect) {
    const word = normalizeWord(wordRaw);
    if (!word) return null;

    const { lex, model, dialect: d } = await this.loadDialect(dialect);
    const phones = lex[word];
    if (!phones) {
      // fallback: no lexicon entry — you can still speak the whole word via WebSpeech
      return { word, dialect: d, phones: [], segments: [], chips: [], missing: true };
    }

    const segments = viterbiAlign(word, phones, model) || [];
    const chips = [];
    for (const seg of segments) {
      seg.phones.forEach((p, idx) => {
        chips.push({ grapheme: idx === 0 ? seg.grapheme : "", phone: p, audioKey: tokenKey(p) });
      });
    }

    return { word, dialect: d, phones, segments, chips };
  }
}

function normalizeWord(w) {
  return (w || "").toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");
}

// MUST match the build script’s tokenKey()
function tokenKey(t) {
  return t
    .replace(/[',]/g, "")
    .replace(/:/g, "LONG")
    .replace(/@/g, "SCHWA")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "UNK";
}
```

Usage from your Assist tab:

```js
const engine = new PhonicsEngine();

// British-first
const DIALECT_UK = "en-GB-x-rp";
const DIALECT_US = "en-US";

const assist = await engine.assistForWord(clickedWord, DIALECT_UK);

renderChips(assist.chips);

// Play all with highlighting
const keys = assist.chips.map(c => c.audioKey).filter(Boolean);
engine.cache.get(DIALECT_UK).audio.playSequence(keys, setHighlightedIndex);
```

---

# Where RiTa fits now

RiTa is still useful, but be aware:

* RiTa uses **Arpabet** ([rednoise.org][1])
* RiTa is **GPL** ([GitHub][5])
* Its pronunciations align best with **US CMUdict style**, not British

So, for UK/US phonics **I’d treat RiTa as optional fallback**, and the above eSpeak-built dialect lexicons as your “correct” path.

---

# Build commands (one-liners)

```bash
# 1) word list
node scripts/extract_wordlist_from_cmudict.mjs cmudict.dict wordlist.txt

# 2) lexicons
node scripts/build_lexicon_espeak.mjs wordlist.txt en-GB-x-rp public/phonics/en-GB-x-rp/lexicon.json
node scripts/build_lexicon_espeak.mjs wordlist.txt en-US      public/phonics/en-US/lexicon.json

# 3) models
node scripts/train_align_model.mjs public/phonics/en-GB-x-rp/lexicon.json public/phonics/en-GB-x-rp/align_model.json
node scripts/train_align_model.mjs public/phonics/en-US/lexicon.json      public/phonics/en-US/align_model.json

# 4) audio packs
node scripts/generate_audio_pack.mjs public/phonics/en-GB-x-rp/lexicon.json en-GB-x-rp public/phonics/en-GB-x-rp/audio
node scripts/generate_audio_pack.mjs public/phonics/en-US/lexicon.json      en-US      public/phonics/en-US/audio
```

---

## Notes you’ll care about in practice

* **File sizes:** a 130k-word lexicon in JSON is chunky. If you hit pain:

  * store lexicon as newline-delimited JSON (NDJSON) + build an IndexedDB cache on first load
  * or store a “top N” lexicon plus fallback to word-level TTS when missing
* **Audio quality:** the cue-text approach is good enough to start. If you later want “pure phoneme” audio, you’ll likely end up with:

  * hand-recorded phonics sounds, or
  * a more advanced phoneme synthesizer workflow
* **Why not BEEP?** It’s “research and development use only” (not great for shipping in an app). ([openslr.org][6])

---

If you paste one example of the eSpeak `-x` output you’re getting for a handful of words (`night`, `think`, `church`, `measure`, `book`, `bath`) I can tighten the `normalizePhones()` and the cue map so your UK and US packs come out clean on the first run.

[1]: https://rednoise.org/rita/tutorials/analyzing.html?utm_source=chatgpt.com "Tutorial: Analyzing Text"
[2]: https://raw.githubusercontent.com/espeak-ng/espeak-ng/master/docs/languages/gmw/en.md "raw.githubusercontent.com"
[3]: https://raw.githubusercontent.com/espeak-ng/espeak-ng/master/src/espeak-ng.1.ronn "raw.githubusercontent.com"
[4]: https://github.com/cmusphinx/cmudict?utm_source=chatgpt.com "cmusphinx/cmudict: CMU US English Dictionary"
[5]: https://github.com/activecm/rita/blob/main/LICENSE?utm_source=chatgpt.com "rita/LICENSE at main · activecm/rita"
[6]: https://www.openslr.org/14/?utm_source=chatgpt.com "BEEP Dictionary"
