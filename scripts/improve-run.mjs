#!/usr/bin/env node
/**
 * Library prose-improve runner.
 *
 * Originals stay in public/stories/. This script never writes there or to dist/.
 * Improved copies go to stories/improve-runs/{editor}/preview/{same-filename}.
 *
 * Usage:
 *   node scripts/improve-run.mjs status --editor grok-4-6
 *   node scripts/improve-run.mjs next --editor grok-4-6 --limit 10
 *   node scripts/improve-run.mjs ingest --editor grok-4-6 --payload path/to/batch.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = path.join(ROOT, 'public/stories');
const INDEX_PATH = path.join(ROOT, 'public/stories-index.json');
const DIST_STORIES = path.join(ROOT, 'dist/stories');

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
  const forbidden = [path.resolve(ORIGINALS), path.resolve(DIST_STORIES)];
  for (const dir of forbidden) {
    if (resolved === dir || resolved.startsWith(dir + path.sep)) {
      throw new Error(`Refusing to write inside originals/dist: ${resolved}`);
    }
  }
}

function loadIndex() {
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function emptyProgress(editor, index) {
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

function loadProgress(editor, index) {
  const { progressPath } = runPaths(editor);
  if (!fs.existsSync(progressPath)) return emptyProgress(editor, index);
  const existing = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  existing.phase = 'library';
  existing.librarySize = index.length;
  existing.originalsDir = 'public/stories';
  existing.previewDir = `stories/improve-runs/${editor}/preview`;
  existing.stories = existing.stories || {};
  return existing;
}

function saveProgress(editor, progress) {
  const { runDir, progressPath } = runPaths(editor);
  fs.mkdirSync(runDir, { recursive: true });
  assertSafeWrite(progressPath);
  progress.updatedAt = new Date().toISOString();
  progress.editor = editor;
  const tmp = `${progressPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(progress, null, 2) + '\n');
  fs.renameSync(tmp, progressPath);
}

function counts(progress, index) {
  let previewed = 0;
  let failed = 0;
  let pending = 0;
  for (const row of index) {
    const status = progress.stories[row.id]?.status;
    if (status === 'previewed' || status === 'applied') previewed += 1;
    else if (status === 'failed' || status === 'skipped') failed += 1;
    else pending += 1;
  }
  return { total: index.length, previewed, failed, pending };
}

function nextPending(progress, index, limit, mode = 'pending') {
  const out = [];
  for (const row of index) {
    const rec = progress.stories[row.id];
    const status = rec?.status;
    if (mode === 'auto') {
      if (status === 'previewed' && rec?.auto === true && !isFreshEditorialClaim(rec)) out.push(row);
    } else if (mode === 'pending') {
      if (status === 'previewed' || status === 'applied' || status === 'in_progress') continue;
      out.push(row);
    }
    if (out.length >= limit) break;
  }
  return out;
}

function isFreshEditorialClaim(rec) {
  const claimed = Date.parse(rec.editorialClaimedAt || '');
  return Number.isFinite(claimed) && Date.now() - claimed < 6 * 60 * 60 * 1000;
}

function bannedHits(title, markdown, characters) {
  const blob = `${title}\n${markdown}\n${characters}`;
  const hits = [];
  if (/\bbarnaby\b/i.test(blob)) hits.push('Barnaby');
  if (/\bsalis\b/i.test(blob)) hits.push('Salis');
  return hits;
}

function validatePayload(original, payload) {
  const errors = [];
  const markdown = String(payload.markdown || '').trim();
  const characters = String(payload.characters || '').trim();
  const title = String(payload.title || original.title);
  if (!markdown) errors.push('missing markdown');
  if (typeof payload.characters !== 'string' || !characters) errors.push('characters must be a non-empty string');
  const slots = parseCharacters(characters);
  if (slots.length < 1) errors.push('characters string split to zero slots');
  if (slots.some((s) => !s)) errors.push('empty character slot');
  const wc = wordCount(markdown);
  const origWc = original.wordCount || wordCount(original.markdown);
  if (origWc >= 1200 && wc < origWc * 0.45) errors.push(`word count crushed (${origWc} -> ${wc})`);
  const banned = bannedHits(title, markdown, characters);
  if (banned.length) errors.push(`banned names still present: ${banned.join(', ')}`);
  return { errors, markdown, characters, title, wc, origWc };
}

function ingestOne(editor, payload, progress, indexById) {
  const id = payload.id;
  const row = indexById.get(id);
  if (!row) throw new Error(`Unknown id: ${id}`);
  const originalPath = path.join(ORIGINALS, row.file);
  if (!fs.existsSync(originalPath)) throw new Error(`Original missing: ${row.file}`);
  const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
  const { errors, markdown, characters, title, wc, origWc } = validatePayload(original, payload);
  if (errors.length) {
    throw new Error(`${id}: ${errors.join('; ')}`);
  }

  const { previewDir, logsDir } = runPaths(editor);
  fs.mkdirSync(previewDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  const previewPath = path.join(previewDir, row.file);
  assertSafeWrite(previewPath);

  const improvedAt = new Date().toISOString();
  const preview = {
    ...original,
    title,
    markdown: markdown.endsWith('\n') ? markdown : markdown + '\n',
    characters,
    wordCount: wc,
    improvedBy: payload.improvedBy || `cursor-pilot:${editor}`,
    improvedAt,
    improvementStatus: 'preview',
  };
  fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2) + '\n');

  const logPath = path.join(logsDir, `${id}.json`);
  assertSafeWrite(logPath);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        id,
        title,
        originalWordCount: origWc,
        improvedWordCount: wc,
        notes: payload.notes || '',
        bannedNameReplacements: payload.bannedNameReplacements || {},
        improvedAt,
      },
      null,
      2
    ) + '\n'
  );

  progress.stories[id] = {
    status: 'previewed',
    title,
    originalPath: `public/stories/${row.file}`,
    previewPath: `stories/improve-runs/${editor}/preview/${row.file}`,
    originalWordCount: origWc,
    improvedWordCount: wc,
    titleChanged: title !== original.title,
    bannedNameReplacements: payload.bannedNameReplacements || {},
    originalCharacters: original.characters,
    improvedCharacters: characters,
    notes: payload.notes || '',
    auto: false,
  };
  return progress.stories[id];
}

function cmdStatus(editor) {
  const index = loadIndex();
  const progress = loadProgress(editor, index);
  const c = counts(progress, index);
  console.log(
    JSON.stringify(
      {
        editor,
        originals: 'public/stories',
        preview: `stories/improve-runs/${editor}/preview`,
        ...c,
      },
      null,
      2
    )
  );
}

function cmdNext(editor, limit, mode = 'pending') {
  const index = loadIndex();
  const progress = loadProgress(editor, index);
  const pending = nextPending(progress, index, limit, mode).map((row) => {
    const original = JSON.parse(fs.readFileSync(path.join(ORIGINALS, row.file), 'utf8'));
    return {
      id: row.id,
      file: row.file,
      title: original.title,
      characters: original.characters,
      audience: original.audience,
      ageGroup: original.ageGroup,
      readingAge: original.readingAge,
      framework: original.framework,
      style: original.style,
      tone: original.tone,
      pacing: original.pacing,
      humor: original.humor,
      emotion: original.emotion,
      consolidator: original.consolidator,
      wordCount: original.wordCount,
      originalPath: `public/stories/${row.file}`,
    };
  });
  console.log(JSON.stringify({ editor, mode, count: pending.length, stories: pending }, null, 2));
}

function cmdClaim(editor, limit) {
  const index = loadIndex();
  const progress = loadProgress(editor, index);
  const pending = nextPending(progress, index, limit, 'pending');
  const claimedAt = new Date().toISOString();
  const claimed = [];
  for (const row of pending) {
    progress.stories[row.id] = {
      ...(progress.stories[row.id] || {}),
      status: 'in_progress',
      title: row.title,
      originalPath: `public/stories/${row.file}`,
      claimedAt,
    };
    claimed.push({ id: row.id, file: row.file, title: row.title });
  }
  saveProgress(editor, progress);
  console.log(JSON.stringify({ editor, claimed: claimed.length, stories: claimed }, null, 2));
}

function cmdClaimAuto(editor, limit) {
  const index = loadIndex();
  const progress = loadProgress(editor, index);
  const pending = nextPending(progress, index, limit, 'auto');
  const claimedAt = new Date().toISOString();
  const claimed = [];
  for (const row of pending) {
    progress.stories[row.id] = {
      ...progress.stories[row.id],
      editorialClaimedAt: claimedAt,
    };
    claimed.push({ id: row.id, file: row.file, title: row.title || progress.stories[row.id]?.title });
  }
  saveProgress(editor, progress);
  console.log(JSON.stringify({ editor, claimed: claimed.length, mode: 'auto', stories: claimed }, null, 2));
}

function cmdIngest(editor, payloadPath) {
  const index = loadIndex();
  const progress = loadProgress(editor, index);
  const indexById = new Map(index.map((r) => [r.id, r]));
  const raw = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.stories || [raw];
  const results = [];
  for (const payload of items) {
    results.push(ingestOne(editor, payload, progress, indexById));
  }
  saveProgress(editor, progress);
  console.log(JSON.stringify({ ingested: results.length, results }, null, 2));
}

function cmdIngestDir(editor, dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items = manifest.map((entry) => {
    const mdPath = path.join(dir, `${entry.id}.md`);
    if (!fs.existsSync(mdPath)) throw new Error(`Missing draft: ${mdPath}`);
    return {
      ...entry,
      markdown: fs.readFileSync(mdPath, 'utf8'),
    };
  });
  const tmp = path.join(dir, `_payload-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2) + '\n');
  try {
    cmdIngest(editor, tmp);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const cmd = process.argv[2] || 'status';
const editor = arg('editor', 'grok-4-6');
if (!/^[a-z0-9-]+$/.test(editor)) {
  console.error('Invalid --editor slug');
  process.exit(1);
}

if (cmd === 'status') cmdStatus(editor);
else if (cmd === 'next') cmdNext(editor, Number(arg('limit', '10')) || 10, arg('mode', 'pending') || 'pending');
else if (cmd === 'claim') cmdClaim(editor, Number(arg('limit', '10')) || 10);
else if (cmd === 'claim-auto') cmdClaimAuto(editor, Number(arg('limit', '10')) || 10);
else if (cmd === 'ingest') {
  const payloadPath = arg('payload');
  if (!payloadPath) {
    console.error('Need --payload path');
    process.exit(1);
  }
  cmdIngest(editor, payloadPath);
} else if (cmd === 'ingest-dir') {
  const dir = arg('dir');
  if (!dir) {
    console.error('Need --dir path');
    process.exit(1);
  }
  cmdIngestDir(editor, dir);
} else {
  console.error('Commands: status | next | claim | claim-auto | ingest | ingest-dir');
  process.exit(1);
}

