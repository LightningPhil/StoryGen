/**
 * Copies tracked hooks from .githooks/ into .git/hooks/.
 * Runs automatically via `npm install` (prepare script).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gitPath = path.join(root, '.git');
const sourceDir = path.join(root, '.githooks');

if (!fs.existsSync(gitPath) || !fs.existsSync(sourceDir)) {
  process.exit(0);
}

let hooksDir;
if (fs.statSync(gitPath).isFile()) {
  const text = fs.readFileSync(gitPath, 'utf8');
  const match = text.match(/^gitdir:\s*(.+)$/m);
  if (!match) process.exit(0);
  hooksDir = path.join(path.resolve(root, match[1].trim()), 'hooks');
} else {
  hooksDir = path.join(gitPath, 'hooks');
}

fs.mkdirSync(hooksDir, { recursive: true });

for (const name of fs.readdirSync(sourceDir)) {
  const source = path.join(sourceDir, name);
  if (!fs.statSync(source).isFile()) continue;
  const dest = path.join(hooksDir, name);
  fs.copyFileSync(source, dest);
  try {
    fs.chmodSync(dest, 0o755);
  } catch {
    // Windows may ignore chmod; Git Bash still runs the hook.
  }
}
