/**
 * Copies static assets into dist/ after tsc compiles the TypeScript source.
 * Run via: node scripts/copy-assets.js  (or automatically via `npm run build`)
 */
const fs   = require('fs');
const path = require('path');

function copy(src, dst) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
}

copy('index.html',    'dist/index.html');
copy('src/style.css', 'dist/style.css');
copy('favicon.ico',   'dist/favicon.ico');
copy('web.config',    'dist/web.config');

// Mirror sounds/ so phoneme .mp3 files are reachable at dist/sounds/{phoneme}.mp3
const soundsSrc = 'sounds';
const soundsDst = 'dist/sounds';
if (fs.existsSync(soundsSrc)) {
    fs.mkdirSync(soundsDst, { recursive: true });
    for (const file of fs.readdirSync(soundsSrc)) {
        if (!fs.statSync(path.join(soundsSrc, file)).isDirectory()) {
            copy(path.join(soundsSrc, file), path.join(soundsDst, file));
        }
    }
}

console.log('Static assets copied to dist/');
console.log('Woot, build successful 🎉');
