/**
 * Story Ingestion Script
 * 
 * Processes JSON story files from stories/inbox/, extracts metadata into a
 * lightweight index (public/stories-index.json), and moves the full story
 * files into public/stories/ for on-demand serving.
 *
 * Usage:  node scripts/ingest-stories.js
 *
 * Each incoming JSON file should have at minimum: title, markdown, characters.
 * The script generates a unique slug-based filename and adds an "id" + "file"
 * field so the browser can fetch individual stories by reference.
 */
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const INBOX_DIR   = path.resolve(__dirname, '..', 'stories', 'inbox');
const STORIES_DIR = path.resolve(__dirname, '..', 'public', 'stories');
const INDEX_FILE  = path.resolve(__dirname, '..', 'public', 'stories-index.json');

// ─── Helpers ────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function shortHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Load existing index ────────────────────────────────────────────────

function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Warning: Could not parse existing index, starting fresh.');
      return [];
    }
  }
  return [];
}

function saveIndex(index) {
  // Sort by date descending so newest stories appear first
  index.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

// ─── Process a single story file ────────────────────────────────────────

function processFile(filePath, existingIndex) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let story;
  try {
    story = JSON.parse(raw);
  } catch (e) {
    console.error(`  SKIP (invalid JSON): ${path.basename(filePath)}`);
    return null;
  }

  if (!story.title || !story.markdown) {
    console.error(`  SKIP (missing title or markdown): ${path.basename(filePath)}`);
    return null;
  }

  // Generate a unique ID from the title + a hash of the content
  const slug = slugify(story.title);
  const hash = shortHash(story.markdown);
  const id = `${slug}-${hash}`;
  const filename = `${id}.json`;

  // Check for duplicates (same content hash)
  const duplicate = existingIndex.find(e => e.id === id);
  if (duplicate) {
    console.log(`  SKIP (duplicate): "${story.title}" already in index`);
    return null;
  }

  // Ensure wordCount is present
  if (!story.wordCount) {
    story.wordCount = countWords(story.markdown);
  }

  // Ensure date is present
  if (!story.date) {
    story.date = new Date().toISOString();
  }

  // Ensure author is present
  if (!story.author) {
    story.author = 'StoryGen Community';
  }

  // Write the full story file to public/stories/
  const storyFile = { ...story, id, file: filename };
  fs.writeFileSync(
    path.join(STORIES_DIR, filename),
    JSON.stringify(storyFile, null, 2),
    'utf-8'
  );

  // Build the lightweight index entry (no markdown)
  const indexEntry = {
    id,
    file: filename,
    title: story.title,
    author: story.author,
    characters: story.characters || '',
    audience: story.audience || '',
    ageGroup: story.ageGroup || undefined,
    framework: story.framework || undefined,
    style: story.style || undefined,
    tone: story.tone || undefined,
    pacing: story.pacing || undefined,
    humor: story.humor || undefined,
    emotion: story.emotion || undefined,
    wordCount: story.wordCount,
    date: story.date,
    tags: story.tags || [],
  };

  // Clean out undefined values
  Object.keys(indexEntry).forEach(k => {
    if (indexEntry[k] === undefined) delete indexEntry[k];
  });

  return { indexEntry, sourceFile: filePath };
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  console.log('Story Ingestion');
  console.log('===============\n');

  // Ensure directories exist
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  fs.mkdirSync(STORIES_DIR, { recursive: true });

  // Find JSON files in inbox
  const files = fs.readdirSync(INBOX_DIR)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => path.join(INBOX_DIR, f));

  if (files.length === 0) {
    console.log(`No JSON files found in ${INBOX_DIR}`);
    console.log('Drop your story JSON files there and run this script again.');
    return;
  }

  console.log(`Found ${files.length} file(s) in inbox\n`);

  const index = loadIndex();
  let added = 0;
  let skipped = 0;
  const processed = [];

  for (const file of files) {
    console.log(`Processing: ${path.basename(file)}`);
    const result = processFile(file, index);
    if (result) {
      index.push(result.indexEntry);
      processed.push(result.sourceFile);
      added++;
      console.log(`  -> Added as: ${result.indexEntry.id}`);
    } else {
      skipped++;
    }
  }

  // Save updated index
  if (added > 0) {
    saveIndex(index);
    console.log(`\nIndex updated: ${INDEX_FILE}`);
  }

  // Move processed files out of inbox (delete them since they're now in public/stories/)
  for (const file of processed) {
    fs.unlinkSync(file);
    console.log(`  Removed from inbox: ${path.basename(file)}`);
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped, ${index.length} total in index`);
}

main();
