# Script Reference

## npm Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite development server with hot reload |
| `npm run build` | Build the app for production into `dist/` |
| `npm run preview` | Serve the production build locally for testing |

---

### Story Pipeline
    
#### `npm run batch`
Batch-generate stories from a TSV file through the full multi-agent pipeline.

```
npm run batch
npm run batch -- stories/my-stories.tsv
```

> **Note:** npm consumes `--key=value` style flags before passing them to the script, so `--api-key` does **not** work via `npm run`. Use the env var instead (see below), or invoke the script directly:
> ```
> npx tsx scripts/batch-generate.ts stories/batch.tsv --api-key=YOUR_KEY
> ```

- **Input:** `stories/batch.tsv` (default) or any `.tsv` path passed as argument
- **Output:** JSON story files saved to `stories/inbox/`
- **Requires:** `GEMINI_API_KEY` environment variable (or `--api-key` flag)
- **Model:** `gemini-2.5-flash-lite`
- Waits 20 seconds between stories to avoid rate limits
- Retries failed API calls up to 4 times with exponential backoff
- Skips failures and continues — only completed stories are saved

Set your API key before running:
```
$env:GEMINI_API_KEY="your-key-here"   # PowerShell
set GEMINI_API_KEY=your-key-here       # CMD
export GEMINI_API_KEY=your-key-here    # Mac/Linux
```

See [BATCH.md](BATCH.md) for full TSV column reference and short-name cheat sheets.

---

#### `npm run ingest`
Index completed stories from `stories/inbox/` into the public library.

```
npm run ingest
```

- **Input:** JSON files in `stories/inbox/`
- **Output:**
  - Moves story files into `public/stories/`
  - Updates `public/stories-index.json` with extracted metadata
- Run this after `npm run batch` (or after manually adding story JSON files to `stories/inbox/`)

---

#### `npm run merge-tsv`
Merge all `.tsv` files in the `stories/` directory into `stories/batch.tsv`.

```
npm run merge-tsv
```

- Takes the header row from the first source file found
- Appends all data rows (skipping headers) from every `.tsv` except `batch.tsv` and `batch-template.tsv`
- Preserves any existing rows already in `batch.tsv`
- Deletes the source files after merging
- Useful for combining multiple batch files before running `npm run batch`

---

## Internal Scripts (not npm shortcuts)

### `scripts/copy-assets.js`
Copies static assets into `dist/` after a production build.

```
node scripts/copy-assets.js
```

Called automatically by `npm run build` via Vite. Copies `index.html`, `src/style.css`, `favicon.ico`, `web.config`, and all files from `sounds/` into `dist/`. Rarely needs to be run manually.

---

## Typical Workflows

### Generate and publish a batch of stories
```
# 1. Fill in stories/batch.tsv (copy from batch-template.tsv)
# 2. Set API key
$env:GEMINI_API_KEY="your-key-here"
# 3. Generate stories
npm run batch
# 4. Publish to library
npm run ingest
```

### Combine multiple TSV files then generate
```
# Place extra .tsv files in stories/
npm run merge-tsv     # merges into stories/batch.tsv
npm run batch         # generates from the combined file
npm run ingest
```
