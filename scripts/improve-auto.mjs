#!/usr/bin/env node
/**
 * Unattended library polish for StoryGen improve-runs.
 * Never writes to public/stories or dist/.
 *
 * This is a checklist editor (artefacts, banned names, characters string),
 * not a Gemini call. Full chat-quality rewrites can overwrite these later.
 *
 *   node scripts/improve-auto.mjs --editor grok-4-6
 *   node scripts/improve-auto.mjs --editor grok-4-6 --limit 20
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = path.join(ROOT, 'public/stories');
const INDEX_PATH = path.join(ROOT, 'public/stories-index.json');
const DIST_STORIES = path.join(ROOT, 'dist/stories');
const EDITOR_DEFAULT = 'grok-4-6';

const GIVEN_NAMES = [
  'Ada','Alistair','Amos','Anwen','Arlo','Arthur','Ash','Auden','Bea','Becca',
  'Bram','Bren','Briar','Cal','Cara','Cedric','Celia','Clio','Cora','Cosmo',
  'Dara','Delia','Dex','Dora','Edie','Edmund','Elowen','Emrys','Enid','Esme',
  'Ettie','Fern','Fionn','Flora','Frances','Freya','Gareth','Gideon','Greta','Gwen',
  'Hadley','Harriet','Hazel','Hector','Hugh','Idris','Imogen','Ines','Iona','Iris',
  'Isla','Ivan','Ivo','Jem','Jenna','Jess','Joel','Jonah','Josephine','Jules',
  'Juniper','Kate','Keir','Kieran','Lila','Linnea','Lottie','Luca','Mae','Maisie',
  'Marnie','Matilda','Mina','Mira','Morgan','Nell','Nessa','Nia','Nico','Nina',
  'Nora','Odette','Olive','Omar','Opal','Oscar','Otto','Owen','Paz','Pearl',
  'Percy','Petra','Phoebe','Posy','Priya','Quinn','Rafi','Raven','Reuben','Rhys',
  'Romy','Rosa','Rose','Rufus','Rupert','Sasha','Sian','Sid','Soren','Stella',
  'Tamsin','Tessa','Thea','Tobias','Tomos','Una','Uri','Vera','Willa','Willow',
  'Wren','Yasmin','Yves','Zara','Zeke','Zora','Ned','Kit','Len','Pia',
  'Rory','Sable','Tess','Uma','Vita','Wade','York','Zinnia','Bryn','Clem',
];

const NAME_STOP = new Set([
  'The','A','An','And','But','Or','So','Then','When','After','Before','Once','Upon',
  'Today','Tonight','Tomorrow','Later','Suddenly','Meanwhile','Finally','Now','Here',
  'There','This','That','These','Those','Monday','Tuesday','Wednesday','Thursday',
  'Friday','Saturday','Sunday','January','February','March','April','June','July',
  'August','September','October','November','December','Chapter','Section','Professor',
  'Elder','Constable','Doctor','Mister','Missus','Miss','Master','Mayor','Father',
  'Mother','Uncle','Aunt','Grandad','Granny','Someone','Something','Nothing','Everything',
  'Everyone','Anyone','Dear','Hark','Gather','Mark','Well','Right','Good','Grand',
  'Great','Old','New','Little','Small','Tiny','Secret','Stone','Clock','Time','Lane',
  'Museum','Cave','Tower','Village','Academy','School','Park','Garden','Orchard',
  'Winter','Summer','Spring','Autumn','North','South','East','West','Hall','Way',
]);

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? String(process.argv[i + 1] || '') : fallback;
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseCharacters(characterString) {
  if (!characterString) return [];
  return characterString
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function runPaths(editor) {
  const runDir = path.join(ROOT, 'stories/improve-runs', editor);
  return {
    runDir,
    previewDir: path.join(runDir, 'preview'),
    logsDir: path.join(runDir, 'logs'),
    progressPath: path.join(runDir, 'progress.json'),
  };
}

function assertSafeWrite(filePath) {
  const resolved = path.resolve(filePath);
  for (const dir of [ORIGINALS, DIST_STORIES].map((d) => path.resolve(d))) {
    if (resolved === dir || resolved.startsWith(dir + path.sep)) {
      throw new Error(`Refusing to write inside originals/dist: ${resolved}`);
    }
  }
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin briefly for lock retry */
  }
}

function withLock(lockPath, fn) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        return fn();
      } finally {
        fs.closeSync(fd);
        try {
          fs.unlinkSync(lockPath);
        } catch {
          /* ignore */
        }
      }
    } catch {
      sleep(50);
    }
  }
  throw new Error('Could not lock progress.json');
}

function collectUsedGivenNames(progress) {
  const used = new Set();
  for (const rec of Object.values(progress.stories || {})) {
    const reps = rec.bannedNameReplacements || {};
    for (const v of Object.values(reps)) {
      if (v) used.add(String(v).split(/\s+/)[0]);
    }
  }
  return used;
}

function nextReplacementName(storyText, used) {
  const lowerStory = String(storyText).toLowerCase();
  for (const name of GIVEN_NAMES) {
    if (used.has(name)) continue;
    if (new RegExp(`\\b${name}\\b`, 'i').test(lowerStory)) continue;
    if (/^barnaby$|^salis$/i.test(name)) continue;
    used.add(name);
    return name;
  }
  let n = 1;
  while (used.has(`Wynn${n}`)) n += 1;
  const fallback = `Wynn${n}`;
  used.add(fallback);
  return fallback;
}

function replaceBannedToken(text, token, replacement) {
  const re = new RegExp(`\\b${token}('\\w+)?\\b`, 'gi');
  return String(text).replace(re, (match, possessive) => {
    const isAllCaps = match === match.toUpperCase() && match.length > 1;
    const isTitle = match[0] === match[0].toUpperCase();
    let out = replacement;
    if (isAllCaps) out = replacement.toUpperCase();
    else if (!isTitle) out = replacement.toLowerCase();
    if (possessive) out += possessive.replace(/^\w/, (ch) => (isAllCaps ? ch.toUpperCase() : ch));
    return out;
  });
}

function applyBannedReplacements(title, markdown, characters, used, existing = {}) {
  const replacements = {};
  let t = title;
  let m = markdown;
  let c = characters;
  for (const token of ['Barnaby', 'Salis']) {
    const blob = `${t}\n${m}\n${c}`;
    if (!new RegExp(`\\b${token}\\b`, 'i').test(blob)) continue;
    const next = existing[token] || nextReplacementName(`${t} ${m} ${c}`, used);
    replacements[token] = next;
    t = replaceBannedToken(t, token, next);
    m = replaceBannedToken(m, token, next);
    c = replaceBannedToken(c, token, next);
  }
  return { title: t, markdown: m, characters: c, replacements };
}

function polishMarkdown(markdown) {
  let t = String(markdown);
  t = t.replace(/^(Hark[^.!?\n]*[.!?]\s*)+/i, '');
  t = t.replace(/^(Hear ye[^.!?\n]*[.!?]\s*)+/i, '');
  t = t.replace(/\bdear listeners,?\s*/gi, '');
  t = t.replace(/\bGather(?:\s+'round|\s+close)[^.!?]*[.!?]\s*/gi, '');
  t = t.replace(/\bFor you see,?\s+(?:dear listeners,? )?/gi, '');
  t = t.replace(/\bThis is (?:fear|anxiety|madness|it|a truth|a full-blown crisis)[^.!?]*[.!?]\s*/gi, '');
  t = t.replace(/\bThis is ([a-z][^.!?]{0,50}), (?:he|she|they) realized[.!?]\s*/gi, '');
  t = t.replace(/\bHere's where it gets interesting[.!?]\s*/gi, '');
  t = t.replace(/\bHere's what they don't tell you[^.!?]*[.!?]\s*/gi, '');
  t = t.replace(/\bAnd so,?\s+our tale comes to its[^.!?]*[.!?]\s*/gi, '');
  t = t.replace(/\bmark well[^.!?]*[.!?]\s*/gi, '');
  t = t.replace(/\bthine\b/gi, 'your');
  t = t.replace(/\bthou\b/gi, 'you');
  t = t.replace(/\s+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function looksNamed(slot) {
  return /^(?:Mr|Mrs|Ms|Miss|Professor|Elder|Dr)\.?\s+[A-Z]/.test(slot) || /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){0,2}\s*\(/.test(slot) || /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+)+$/.test(slot);
}

function extractNameCandidates(markdown) {
  const counts = new Map();
  const bump = (name) => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const first = clean.split(/\s+/)[0];
    if (NAME_STOP.has(first)) return;
    if (clean.length < 3) return;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  };
  const titled = markdown.match(
    /\b(?:Mr|Mrs|Ms|Miss|Professor|Elder|Constable|Doctor|Dr)\.?\s+[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+)?/g
  );
  if (titled) titled.forEach(bump);
  const full = markdown.match(/\b[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+)+/g);
  if (full) full.forEach(bump);
  const singles = markdown.match(/\b[A-Z][a-zA-Z'’-]{2,}\b/g);
  if (singles) {
    for (const s of singles) {
      if (NAME_STOP.has(s)) continue;
      bump(s);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

function nameCharacters(originalCharacters, markdown) {
  const slots = parseCharacters(originalCharacters);
  if (!slots.length) return originalCharacters;
  const candidates = extractNameCandidates(markdown);
  const used = new Set();
  const named = slots.map((slot) => {
    const trimmed = slot.trim();
    const firstWord = trimmed.split(/\s+/)[0];
    if (
      /^[A-Z][a-zA-Z'’-]+$/.test(firstWord) &&
      !NAME_STOP.has(firstWord) &&
      !/^(a|an|the)$/i.test(firstWord)
    ) {
      used.add(firstWord);
      if (trimmed.includes('(')) return trimmed;
      const rest = trimmed.slice(firstWord.length).trim();
      if (rest) return `${firstWord} (${rest.replace(/^the\s+/i, 'the ')})`;
      return trimmed;
    }
    if (looksNamed(trimmed) && !/^\b(a|an|the)\b/i.test(trimmed)) {
      const already = trimmed.split(/\s|\(/)[0];
      used.add(already);
      if (trimmed.includes('(')) return trimmed;
      return trimmed;
    }
    const next = candidates.find((n) => {
      const first = n.split(/\s+/)[0];
      if (used.has(n) || used.has(first)) return false;
      if (/barnaby|salis/i.test(n)) return false;
      return true;
    });
    if (!next) return trimmed;
    used.add(next);
    used.add(next.split(/\s+/)[0]);
    if (/^\(/.test(trimmed)) return `${next} ${trimmed}`;
    return `${next} (${trimmed})`;
  });
  return named.join(', ');
}

function maybeTrimLecture(markdown, originalWordCount) {
  const parts = markdown.trim().split(/\n\n+/);
  if (parts.length < 3) return markdown;
  const last = parts[parts.length - 1];
  if (
    /the real treasure|true confidence|proving, beyond a shadow|And so our tale|destiny far more fortunate|maps worth keeping are often/i.test(
      last
    ) &&
    last.length > 280
  ) {
    const trimmed = parts.slice(0, -1).join('\n\n');
    if (originalWordCount < 1200 || wordCount(trimmed) >= originalWordCount * 0.45) {
      return trimmed;
    }
  }
  return markdown;
}

function improveStory(original, usedNames, existingReplacements = {}) {
  const origWc = original.wordCount || wordCount(original.markdown);
  let title = original.title;
  let markdown = original.markdown;
  let characters = original.characters;
  const banned = applyBannedReplacements(title, markdown, characters, usedNames, existingReplacements);
  title = banned.title;
  markdown = banned.markdown;
  characters = banned.characters;
  markdown = polishMarkdown(markdown);
  markdown = maybeTrimLecture(markdown, origWc);
  if (origWc >= 1200 && wordCount(markdown) < origWc * 0.45) {
    markdown = polishMarkdown(banned.markdown);
  }
  characters = nameCharacters(characters, markdown);
  characters = characters.replace(/\(([^)]*)\)/g, (_, inner) => `(${inner.replace(/,/g, ' and')})`);
  return {
    title,
    markdown,
    characters,
    replacements: banned.replacements,
  };
}

function loadProgress(editor, index) {
  const { progressPath } = runPaths(editor);
  if (!fs.existsSync(progressPath)) {
    return {
      phase: 'library',
      editor,
      updatedAt: new Date().toISOString(),
      indexSource: 'public/stories-index.json',
      librarySize: index.length,
      originalsDir: 'public/stories',
      previewDir: `stories/improve-runs/${editor}/preview`,
      stories: {},
    };
  }
  const existing = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  existing.phase = 'library';
  existing.librarySize = index.length;
  existing.stories = existing.stories || {};
  return existing;
}

function writePreview(editor, original, improved, notes) {
  const { previewDir, logsDir } = runPaths(editor);
  fs.mkdirSync(previewDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  const previewPath = path.join(previewDir, original.file);
  assertSafeWrite(previewPath);
  const markdown = improved.markdown.endsWith('\n') ? improved.markdown : `${improved.markdown}\n`;
  const wc = wordCount(markdown);
  const improvedAt = new Date().toISOString();
  const preview = {
    ...original,
    title: improved.title,
    markdown,
    characters: improved.characters,
    wordCount: wc,
    improvedBy: `cursor-pilot:${editor}-auto`,
    improvedAt,
    improvementStatus: 'preview',
  };
  fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2) + '\n');
  const logPath = path.join(logsDir, `${original.id}.json`);
  assertSafeWrite(logPath);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        id: original.id,
        title: improved.title,
        originalWordCount: original.wordCount,
        improvedWordCount: wc,
        notes,
        bannedNameReplacements: improved.replacements,
        improvedAt,
        auto: true,
      },
      null,
      2
    ) + '\n'
  );
  return { previewPath, wc, improvedAt };
}

function shouldProcess(rec, repolish) {
  if (!rec) return !repolish;
  if (rec.status === 'applied') return false;
  if (rec.status === 'in_progress') {
    const claimed = Date.parse(rec.claimedAt || '');
    const fresh = Number.isFinite(claimed) && Date.now() - claimed < 6 * 60 * 60 * 1000;
    if (fresh) return false;
  }
  if (repolish) return rec.status === 'previewed' && rec.auto === true;
  return rec.status !== 'previewed' && rec.status !== 'applied';
}

function main() {
  const editor = arg('editor', EDITOR_DEFAULT);
  const limit = Number(arg('limit', '0')) || 0;
  const repolish = process.argv.includes('--repolish');
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const { progressPath, runDir } = runPaths(editor);
  fs.mkdirSync(runDir, { recursive: true });
  const lockPath = `${progressPath}.lock`;

  let done = 0;
  let failed = 0;
  const failures = [];
  let progress;
  let usedNames;
  withLock(lockPath, () => {
    progress = loadProgress(editor, index);
    usedNames = collectUsedGivenNames(progress);
  });
  let batch = 0;
  for (const row of index) {
    if (limit && done >= limit) break;
    const rec = progress.stories[row.id];
    if (!shouldProcess(rec, repolish)) continue;
    const originalPath = path.join(ORIGINALS, row.file);
    if (!fs.existsSync(originalPath)) {
      failed += 1;
      failures.push(row.id);
      progress.stories[row.id] = {
        status: 'failed',
        title: row.title,
        originalPath: `public/stories/${row.file}`,
        notes: 'original file missing',
      };
      continue;
    }
    try {
        const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
        const existingReplacements = rec?.bannedNameReplacements || {};
        const improved = improveStory(original, usedNames, existingReplacements);
      if (/\bbarnaby\b|\bsalis\b/i.test(`${improved.title}\n${improved.markdown}\n${improved.characters}`)) {
        throw new Error('banned name remained');
      }
      const notes =
        Object.keys(improved.replacements).length > 0
          ? `Auto polish; replacements ${JSON.stringify(improved.replacements)}`
          : 'Auto polish: artefacts, named characters field, banned-name scan.';
      const written = writePreview(editor, original, improved, notes);
      progress.stories[row.id] = {
        status: 'previewed',
        title: improved.title,
        originalPath: `public/stories/${row.file}`,
        previewPath: `stories/improve-runs/${editor}/preview/${row.file}`,
        originalWordCount: original.wordCount,
        improvedWordCount: written.wc,
        titleChanged: improved.title !== original.title,
        bannedNameReplacements: improved.replacements,
        originalCharacters: original.characters,
        improvedCharacters: improved.characters,
        notes,
        auto: true,
      };
      done += 1;
      batch += 1;
      if (batch % 50 === 0) {
        withLock(lockPath, () => {
          const latest = loadProgress(editor, index);
          for (const [id, rec] of Object.entries(progress.stories)) {
            if (!latest.stories[id] || latest.stories[id].status !== 'previewed' || rec.auto) {
              if (latest.stories[id]?.status === 'previewed' && !rec.auto) continue;
              latest.stories[id] = rec;
            }
          }
          latest.updatedAt = new Date().toISOString();
          latest.editor = editor;
          latest.phase = 'library';
          latest.librarySize = index.length;
          assertSafeWrite(progressPath);
          fs.writeFileSync(progressPath, JSON.stringify(latest, null, 2) + '\n');
          progress = latest;
        });
        process.stderr.write(`auto ${done}\n`);
      }
    } catch (err) {
      failed += 1;
      failures.push(row.id);
      progress.stories[row.id] = {
        status: 'failed',
        title: row.title,
        originalPath: `public/stories/${row.file}`,
        notes: String(err && err.message ? err.message : err),
      };
    }
  }
  withLock(lockPath, () => {
    const latest = loadProgress(editor, index);
    for (const [id, rec] of Object.entries(progress.stories)) {
      if (latest.stories[id]?.status === 'previewed' && latest.stories[id].auto !== true && rec.auto) {
        continue;
      }
      if (latest.stories[id]?.status === 'previewed' && !rec.auto) continue;
      latest.stories[id] = rec;
    }
    latest.updatedAt = new Date().toISOString();
    latest.editor = editor;
    latest.phase = 'library';
    latest.librarySize = index.length;
    assertSafeWrite(progressPath);
    fs.writeFileSync(progressPath, JSON.stringify(latest, null, 2) + '\n');
  });

  console.log(JSON.stringify({ editor, previewedThisRun: done, failed, failures: failures.slice(0, 20) }, null, 2));
}

main();
