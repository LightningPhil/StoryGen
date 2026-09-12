/**
 * After Vite writes dist/, prepare the files GitHub Pages actually serves.
 * Pages publishes the repo root on `main` with Jekyll unless .nojekyll is present.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const distIndex = path.join(distDir, 'index.html');

if (!fs.existsSync(distIndex)) {
  console.error('publish-pages: dist/index.html is missing. Vite build must run first.');
  process.exit(1);
}

fs.writeFileSync(path.join(root, '.nojekyll'), '');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

const entry = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=./dist/index.html">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>Story Generator</title>
    <script>
      location.replace('./dist/index.html' + location.search + location.hash);
    </script>
</head>
<body>
    <p><a href="./dist/index.html">Open Story Generator</a></p>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), entry);
console.log('GitHub Pages entry files written (.nojekyll, index.html).');
