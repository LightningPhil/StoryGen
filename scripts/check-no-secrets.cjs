/**
 * Fail if a live Google API key is present in git-tracked or staged files.
 * Used by pre-commit and pre-push so keys cannot be shared on GitHub.
 */
'use strict';

const { execFileSync } = require('child_process');

const GOOGLE_API_KEY = /AIza[0-9A-Za-z_-]{20,}/;
const REDACT = /AIza[0-9A-Za-z_-]+/g;

function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error) {
    if (error.status === 1) return '';
    const stderr = error.stderr ? String(error.stderr).trim() : error.message;
    console.error(stderr);
    process.exit(1);
  }
}

function redact(text) {
  return text.replace(REDACT, 'AIza[REDACTED]');
}

function fail(label, output) {
  console.error(`Aborted: a Google API key was found in ${label}.`);
  console.error('Remove it. Keep keys in Settings (browser localStorage) or GEMINI_API_KEY, never in git.');
  if (output) console.error(redact(output).trim());
  process.exit(1);
}

function scanGitGrep(args, label) {
  const output = git(['grep', '-I', '-n', '-E', '-e', GOOGLE_API_KEY.source, ...args]);
  if (output && GOOGLE_API_KEY.test(output)) fail(label, output);
}

function scanDiff(args, label) {
  const output = git(['diff', ...args]);
  if (output && GOOGLE_API_KEY.test(output)) fail(label, output);
}

const mode = process.argv[2] || 'tree';

if (mode === 'staged') {
  scanDiff(['--cached'], 'staged changes');
} else if (mode === 'tree') {
  scanGitGrep(['HEAD'], 'HEAD');
  scanGitGrep([], 'the working tree');
} else {
  console.error(`Unknown check-no-secrets mode: ${mode}`);
  process.exit(1);
}
