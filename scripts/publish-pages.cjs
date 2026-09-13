/**
 * After Vite writes dist/, prepare the files GitHub Pages actually serves.
 * Pages publishes the repo root on `main`, so the homepage must be the compiled
 * app (not a redirect). A <base> tag points relative assets at dist/.
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

const distHtml = fs.readFileSync(distIndex, 'utf8');
const withoutBase = distHtml.replace(/<base\b[^>]*>\s*/i, '');
const rootHtml = withoutBase.replace(
  /<head>/i,
  '<head>\n    <base href="/StoryGenerator/dist/">',
);

fs.writeFileSync(path.join(root, 'index.html'), rootHtml);
console.log('GitHub Pages homepage written from dist/index.html (.nojekyll, index.html).');
