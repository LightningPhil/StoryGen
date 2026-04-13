# Batch Story Generation

Generate dozens of stories from a TSV spreadsheet without clicking a single button.

## Quick Start

1. **Set your API key** (one of):
   ```
   set GEMINI_API_KEY=your-key-here          # Windows CMD
   $env:GEMINI_API_KEY="your-key-here"       # PowerShell
   export GEMINI_API_KEY=your-key-here        # Mac/Linux
   ```

2. **Copy the template TSV** and fill in your stories:
   ```
   stories/batch-template.tsv  →  stories/batch.tsv
   ```

3. **Run the batch generator:**
   ```
   npm run batch
   ```
   Or with a custom TSV path:
   ```
   npm run batch -- stories/my-stories.tsv
   ```
   Or pass the API key inline:
   ```
   npm run batch -- stories/batch.tsv --api-key=YOUR_KEY
   ```

4. **Ingest the stories** into the public library:
   ```
   npm run ingest
   ```

## How It Works

- Reads one TSV row at a time
- Runs the full 6–8 agent pipeline (Crafter → Elaborator → [Consolidator] → Reviewer → Polisher → [Consolidator] → Cleaner → Titler)
- Waits **20 seconds** between stories to avoid API rate limits
- Retries failed API calls up to 4 times with exponential backoff
- Saves successful stories as JSON to `stories/inbox/`
- Skips failures and keeps going — only completed stories are saved

## TSV Columns

| Column | Required | Description |
|--------|----------|-------------|
| `characters` | Yes | Character names/descriptions — commas are fine, tabs are the delimiter |
| `audience` | No | Free text, e.g. "bedtime story", "school assembly" |
| `age_group` | No | `3-4`, `5-6`, `7-8`, `9-10`, `11-12`, `13-15`, `16-18`, `18+` (default: `5-6`) |
| `framework` | No | Story engine short name (see below). Default: `story_circle` |
| `style` | No | Author style short name (see below). Default: `default` |
| `narrator` | No | Narrator persona short name (see below). Default: `default` |
| `tone` | No | Tone adjustment (see below). Default: `none` |
| `pacing` | No | Pacing adjustment (see below). Default: `default` |
| `humor` | No | Humor type (see below). Default: `none` |
| `emotion` | No | Emotional tone (see below). Default: `default` |
| `sensitivity` | No | Sensitivity preset (see below). Default: `standard` |
| `reading_age` | No | Target reading age (number, 2–18). Leave blank for auto |
| `consolidator` | No | `true` / `false` — adds a compression pass for tighter stories |
| `user_suggestions` | No | Free text instructions for the story crafter — your elaboration field |
| `stem_concept` | No | For `stem_fable` framework only — the science concept to teach |

---

## Short Name Cheat Sheet

### Story Frameworks (`framework` column)

| Short Name | Full Framework |
|------------|---------------|
| `story_circle` | Dan Harmon's Story Circle |
| `three_act` | Three-Act Structure |
| `kishotenketsu` | Kishōtenketsu |
| `freytag` | Freytag's Pyramid |
| `hero_journey` | Hero's Journey (Condensed) |
| `but_therefore` | "But, Therefore" Chain |
| `pixar_spine` | Pixar Story Spine |
| `chekhov` | Chekhov's Sketch |
| `save_the_cat` | Save the Cat! Beat Sheet |
| `seven_point` | Seven-Point Story Structure |
| `snowflake` | Snowflake Method (Iterative Expansion) |
| `fichtean` | Fichtean Curve ("Crisis Ladder") |
| `grimm_forest` | Grimms' Fairy-Tale Pattern ("Forest Path") |
| `grimm_mirror` | Grimms' Wish-Mirror Pattern ("Rippled Lake") |
| `grimm_beast` | Grimms' Hidden-Beast Pattern ("Animal Bridegroom") |
| `grimm_sibling` | Grimms' Sibling-Quest Pattern ("Swans & Stars") |
| `grimm_trickster` | Grimms' Trickster-Triumph Pattern ("Clever Tailor") |
| `fable` | Fable (Aesop Style) |
| `stem_fable` | Learning Fable (STEM) — use with `stem_concept` column |

### Author Styles (`style` column)

| Short Name | Full Style |
|------------|-----------|
| `default` | Default (No Specific Style) |
| `dahl` | Imaginative & Bold (Dahl/Walliams) |
| `donaldson` | Musical & Warm (Donaldson) |
| `gentle` | Gentle & Reassuring (Kerr/Bond) |
| `classic` | Classic Adventure & Morals (Grimm/Lewis/Blyton) |
| `ghibli` | Atmospheric & Empathetic (Ghibli) |

### Narrator Personas (`narrator` column)

| Short Name | Full Persona |
|------------|-------------|
| `default` | No narrator persona |
| `grandfather` | Wise Grandfather |
| `adventurer` | Adventurer |
| `silly` | Silly Friend |
| `owl` | Wise Owl |
| `bard` | Epic Bard |

### Tone Adjustments (`tone` column)

| Value | Effect |
|-------|--------|
| `none` | No tone adjustment (default) |
| `energetic_morning` | High-energy, wake-up excitement |
| `calm_bedtime` | Soothing, wind-down for sleep |
| `whimsical_playful` | Light, playful, and fun |
| `epic_grand` | Grand, sweeping, dramatic |

### Pacing (`pacing` column)

| Value | Effect |
|-------|--------|
| `default` | Natural pacing |
| `slow_soothing` | Gentle, unhurried pace |
| `fast_exciting` | Quick-moving, high energy |
| `moderate_balanced` | Even, steady rhythm |
| `fast_dynamic` | Rapid, action-packed |

### Humor (`humor` column)

| Value | Effect |
|-------|--------|
| `none` | No humor emphasis (default) |
| `light_silly` | Gentle, silly humor |
| `wacky_slapstick` | Over-the-top physical comedy |
| `witty_dry` | Clever, understated humor |

### Emotion (`emotion` column)

| Value | Effect |
|-------|--------|
| `default` | Natural emotional range |
| `heartwarming` | Focus on warmth and connection |
| `empowering` | Focus on courage and confidence |
| `wonder_curiosity` | Focus on awe and discovery |
| `laughs_and_fun` | Focus on joy and laughter |
| `bittersweet_reflective` | Deeper, more thoughtful tone |

### Sensitivity Presets (`sensitivity` column)

| Value | Ages | Description |
|-------|------|-------------|
| `extra_gentle` | 2–4 | No conflict, no scary elements, only positive emotions |
| `gentle` | 4–6 | Mild, quickly-resolved challenges |
| `standard` | 6–9 | Age-appropriate adventure with manageable stakes |
| `adventurous` | 9+ | More sophisticated, deeper themes |

---

## Tips

- **TSV uses tabs as delimiters** — commas, quotes, and special characters are all fine in any field
- **Edit in Excel/Sheets** then Save As → Tab-delimited (.tsv / .txt) — or just use the template
- **Leave columns blank** to use defaults — you don't need to fill everything
- The `user_suggestions` column is your free-text elaboration — use it for specific story directions, themes, or requirements
- The `consolidator` column adds extra compression passes. Use `true` for tighter stories, `false` (default) for more natural length
- Model used: `gemini-2.5-flash-lite` (fast & reliable for batch work)
- Stories output to `stories/inbox/` — run `npm run ingest` to index them into the public library
- Each story takes ~1–3 minutes depending on pipeline length and API speed
