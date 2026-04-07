#!/usr/bin/env node
/**
 * Merge all .tsv files in the stories/ directory into batch.tsv.
 *
 * - Takes the header from the first source file found
 * - Appends all data rows (skipping headers) from every .tsv except batch.tsv
 * - Writes the combined result to stories/batch.tsv
 * - Removes the source files after merging
 *
 * Usage:  node scripts/merge-tsv.cjs
 *         npm run merge-tsv
 */

const fs = require('fs');
const path = require('path');

const STORIES_DIR = path.resolve(__dirname, '..', 'stories');
const OUTPUT_FILE = path.join(STORIES_DIR, 'batch.tsv');

const files = fs.readdirSync(STORIES_DIR)
  .filter(f => f.endsWith('.tsv') && f !== 'batch.tsv' && f !== 'batch-template.tsv')
  .sort();

if (files.length === 0) {
  console.log('No TSV files to merge (only batch.tsv / batch-template.tsv found).');
  process.exit(0);
}

// Read existing batch.tsv rows (if any) so we don't lose them
let header = '';
const allDataLines = [];

if (fs.existsSync(OUTPUT_FILE)) {
  const existing = fs.readFileSync(OUTPUT_FILE, 'utf-8').split(/\r?\n/).filter(l => l.trim());
  if (existing.length > 0) {
    header = existing[0];
    for (let i = 1; i < existing.length; i++) {
      allDataLines.push(existing[i]);
    }
  }
}

let mergedCount = 0;

for (const file of files) {
  const filePath = path.join(STORIES_DIR, file);
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(l => l.trim());

  if (lines.length === 0) continue;

  // Use the first file's header if we don't have one yet
  if (!header) {
    header = lines[0];
  }

  // Add all data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    allDataLines.push(lines[i]);
    mergedCount++;
  }

  // Remove the source file
  fs.unlinkSync(filePath);
  console.log(`  Merged ${lines.length - 1} rows from ${file}`);
}

// Write combined output
const output = [header, ...allDataLines].join('\n') + '\n';
fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

console.log(`\nDone! ${mergedCount} rows merged from ${files.length} file(s) into batch.tsv`);
console.log(`Total rows in batch.tsv: ${allDataLines.length}`);
