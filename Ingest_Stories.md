Workflow:

Export stories from StoryGen using the { } JSON export button, or create JSON files manually
Drop them into inbox

Run npm run ingest (or node scripts/ingest-stories.cjs)

The script:
Reads each JSON file, validates it has title + markdown
Generates a unique ID (slug + content hash) to prevent duplicates
Writes the full story to public/stories/{id}.json
Adds a lightweight entry (no markdown) to stories-index.json
Removes the processed file from the inbox
Build with npm run build — Vite copies everything to dist