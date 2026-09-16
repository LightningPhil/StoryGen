# StoryGen prose-improvement pilot

This file is the full handoff prompt. Attach it in a new Cursor chat on **whatever model you want to try**, and tell the agent to follow it exactly. The same 10-story pilot can be run more than once with different models; each run must keep its own output folder so later trials do not overwrite earlier ones.

You are a coding agent in the StoryGen repo (`F:\WebDev\StoryGen`, GitHub `LightningPhil/StoryGen`). You are the editor. Use the app’s own craft prompts as your rubric and rewrite each story yourself in this chat.

Do **not** call the Gemini API. Do **not** run `npm run batch`. Do **not** spawn a subagent per story. Do not switch models mid-run.

Record the model this chat is actually using (the Cursor model name, as you know it) in the progress file, preview JSON `improvedBy` field, and comparison doc. If you are unsure of the exact product name, use a short slug such as `cursor-chat` rather than guessing “Grok”.

## Hard stop: exactly 10 stories

This run is a **closed set of the 10 stories listed below**. After those 10 are previewed and the comparison file is written, **stop**. That is the whole job.

- Do not start an 11th story.
- Do not continue through the rest of the 3,545-story library.
- Do not treat a clean finish as permission to keep going.
- Do not ask yourself “while I’m here…” and do more.
- The “If the user later asks to process the rest” section applies only to a **later, explicit** user message after they have read the comparison. Silence after you stop is not that message.

## Goal

Improve **prose quality** of existing library stories while keeping each story recognisably the same tale: same plot, characters, names, facts, audience, framework, and style. Also fill in **proper names** on the JSON `characters` string using the format in “Characters field” so the library can search and reload them without breaking comma-splitting. If **Barnaby** or **Salis** appears in a story you are editing, replace it (see “Banned stock names”). Do not survey the library for how often those names occur. The original drafts were batch-generated with `gemini-2.5-flash-lite`. Typical problems to fix: padded or generic sentences, repeated emotional labels (“This is…”), voice drift, cliché stacks, weak verbs, muddy rhythm, leftover generator artefacts, and moments that do not earn their feeling.

This is **not** a rewrite-from-scratch, **not** a new plot, and **not** a different book.

## Hard repo rules

- Stay on branch `dev`. Do not use or delete `Phonics`.
- Do not create a pull request.
- Do not commit unless the user explicitly asks.
- Do not run `npm run ingest`, `npm run batch`, or a full `npm run build` for this pilot.
- Do **not** overwrite `public/stories/`, `public/stories-index.json`, `dist/stories/`, or `dist/stories-index.json` during the pilot.
- Do not add GitHub Actions or CI.
- Do not invent a second story library.

## Library facts you must use

There are **3,545** stories. Canonical files:

- Full story JSON: `public/stories/{id}.json`
- Catalog (date descending, newest first): `public/stories-index.json`

Each JSON has the story body plus generation metadata. Fields always present on this corpus:

- `title`, `markdown`, `characters`, `audience`, `ageGroup`
- `framework`, `style`
- `tone`, `pacing`, `humor`, `emotion`
- `model` (`gemini-2.5-flash-lite`), `readingAge`, `consolidator`, `wordCount`, `date`, `author`
- `id`, `file`

Fields **missing on every current file** (do not invent them): `plotPoints` / `user_suggestions`, `narrator`, `sensitivity`, `stem_concept`. Treat narrator as none, sensitivity as standard, and plot requirements as empty unless they are already in the story text.

`stories/batch.tsv` is only a header. The original planning spreadsheet was consumed during generation. Reconstruct craft context from the JSON metadata + prompt files below.

## Prompt files (read these; they are the rules)

Read in this order before touching any story:

1. `src/prompts/system_policy.ts` — `STORY_SYSTEM_INSTRUCTION` (priority order, safety, name preservation).
2. `src/prompts/agent_prompts.ts` — especially:
   - `PROMPT_AGENT_2_ELABORATOR_TEMPLATE` (enrich without lengthening for its own sake)
   - `PROMPT_AGENT_3_REVIEWER_TEMPLATE` (checklist)
   - `PROMPT_AGENT_4_POLISHER_TEMPLATE` (apply review)
   - `PROMPT_AGENT_5_CLEANER_TEMPLATE` (publication cleanup)
   - `PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE` (only if that story’s `consolidator` is `true`)
   - `READING_AGE_ADJUSTMENT_TEXT_TEMPLATE`
3. `src/prompts/story_crafting_guides.ts` — `STORY_CRAFTING_GUIDES` and `STORY_FRAMEWORK_SUMMARIES`. Look up by the story’s `framework` string. Use `src/lookupKeys.ts` (`lookupByNormalizedKey`) because some keys use curly quotes (`Freytag’s Pyramid`, `Fichtean Curve (“Crisis Ladder”)`, etc.).
4. `src/prompts/author_styles.ts` — `STORY_STYLE_GUIDES` and `STORY_STYLE_SUMMARIES`. Look up by `style`.
5. `src/prompts/adjustment_modules.ts` — `ADJUSTMENT_MODULES` for `tone`, `pacing`, `humor`, `emotion`. Keys `none` and `default` mean apply no extra directive for that axis.
6. `src/pipeline.ts` — `getElaborationPipelineConfig` is the intended improve path: Elaborator → Reviewer → Polisher → optional Consolidator → Cleaner. Do that mentally (or as private notes), then output only the finished story body.

Priority when rules conflict (from system policy): safety → sensitivity → audience/reading age → supplied facts → framework structure/length/ending → tone/pacing/humor/emotion/style → universal craft defaults.

## Pilot set (this is the entire run)

Take **only** the **first 10 entries** of `public/stories-index.json` (newest). Confirm the files exist before editing. They are all age **13–15**; that is expected for this slice, not a bug. When this table is done, the run is done.

| # | id | file | title |
|---|---|---|---|
| 1 | `alistair-finch-and-the-stones-secret-5dac6014` | `alistair-finch-and-the-stones-secret-5dac6014.json` | Alistair Finch and the Stone's Secret |
| 2 | `elara-and-the-catastrophe-clock-283d2564` | `elara-and-the-catastrophe-clock-283d2564.json` | Elara and the Catastrophe Clock |
| 3 | `the-wailing-weaver-and-the-loose-stone-fc1a22b5` | `the-wailing-weaver-and-the-loose-stone-fc1a22b5.json` | The Wailing Weaver and the Loose Stone |
| 4 | `the-lane-where-time-gets-tangled-b6617ca7` | `the-lane-where-time-gets-tangled-b6617ca7.json` | The Lane Where Time Gets Tangled |
| 5 | `the-museum-of-whispered-lies-27ef0369` | `the-museum-of-whispered-lies-27ef0369.json` | The Museum of Whispered Lies |
| 6 | `elara-and-the-time-locket-7ad51316` | `elara-and-the-time-locket-7ad51316.json` | Elara and the Time Locket |
| 7 | `the-secret-of-the-clocktower-club-2546e6a0` | `the-secret-of-the-clocktower-club-2546e6a0.json` | The Secret of the Clocktower Club |
| 8 | `kaelen-and-the-whispering-caves-da1758bf` | `kaelen-and-the-whispering-caves-da1758bf.json` | Kaelen and the Whispering Caves |
| 9 | `the-night-the-museum-woke-up-7ee56255` | `the-night-the-museum-woke-up-7ee56255.json` | The Night the Museum Woke Up |
| 10 | `barnaby-and-the-missing-teacup-8844e03e` | `barnaby-and-the-missing-teacup-8844e03e.json` | Barnaby and the Missing Teacup |

If an id is missing, stop and report it. Do not silently substitute another story.

## Per-story method

For each of the 10, in order:

1. Read `public/stories/{file}`.
2. Rebuild the craft packet from metadata + the prompt files above (full framework guide, full style guide, active adjustment modules, reading-age note, audience, characters). Do not skip the framework lookup.
3. Internally run the elaboration pipeline (you are the editor, whatever model this chat is):
   - Review the current `markdown` against the reviewer checklist.
   - Polish prose: stronger verbs, cleaner rhythm, earned emotion, consistent narrator, read-aloud quality for the stated reading age.
   - Enrich only thin moments (Elaborator rules). Do not add a new subplot or an extra scene unless the framework is clearly missing a required beat *and* you can restore it without changing the story’s identity.
   - If `consolidator` is true, tighten genuine redundancy only; keep purposeful repetition, names, and required beats.
   - Clean: no title in the body, no markdown/XML/review notes, no generator artefacts.
4. Preserve exactly: supplied character names **except the banned stock names below**, plot outcome, setting facts, educational claims (do not “fix” STEM into something false), framework ending convention, and age-appropriateness.
5. You may retitle only if the current title is generic, mismatched, contains artefacts, **or contains a banned stock name**. Prefer keeping the title otherwise.
6. Recompute `wordCount` as whitespace-separated words of the new body. Stay in a similar length band unless the framework has an explicit range you would otherwise violate. Do not balloon a 1,200-word story into 3,000, and do not crush a 2,500-word story into a sketch.
7. **Name the characters string** using the rules in “Characters field” below. This is required for every pilot story, even if the prose needed little work.
8. Write the improved JSON to `stories/improve-runs/{model-slug}/preview/{file}` with the same `id` and `file` (do not rename the filename even if the title changes), updated `markdown`, updated `characters`, updated `title` if required, `wordCount`, and these extra fields:
   - `"improvedBy": "cursor-pilot:<model-slug>"`
   - `"improvedAt": "<ISO timestamp>"`
   - `"improvementStatus": "preview"`
   Leave other metadata intact (`framework`, `style`, `tone`, etc.). `{model-slug}` is a lowercase hyphenated label for this chat’s model (example: `grok-4-6`, `composer-2-5`, `gpt-5-6`). If that folder already exists from a previous run of the **same** slug, resume from its progress file rather than wiping it.
9. Update that run’s progress file immediately after each story so a crash does not lose the queue.

## Characters field (required, must not break the app)

`characters` is a **plain string**. The UI shows it, the online browser searches it, and if someone loads the story and hits Generate, `parseCharacters()` in `src/utils.ts` splits that string on **commas**. Wrong shape will break regeneration and library display.

**Never:**

- Change `characters` to an array, object, or nested JSON
- Add a parallel `characterNames` / `cast` field the app does not read
- Put commas inside a single character’s descriptor (those become fake extra characters)
- Invent new people, rename anyone in the story body **except banned stock names**, or list unnamed extras (crowds, “a baker”, “the wind”)
- Duplicate a name that is already in the original string
- Leave `Barnaby` or `Salis` in the `characters` string

**Do:**

- Keep one comma-separated entry per *actual* character (the original slots, plus a named character from the story only if they are clearly a lead/supporting role and were missing from the prompt)
- Put the **proper name first**, then the existing role/trait in parentheses
- Strip commas from inside parentheses (use “and” or an em dash)
- Pull names from the improved story body; they must match the story exactly (spelling, order)
- If a slot already starts with a name, keep it and only tidy the descriptor, unless that name is banned (`Barnaby`, `Salis`)
- If a creature/person in the original prompt has no name in the story, leave that slot unnamed rather than minting a new name (the improve pass must not rename, except to replace banned stock names)

**Format (this survives comma-split and still reads well in the Characters textarea):**

```
Alistair Finch (a careful boy cartographer who thinks rules are useful until they get inconvenient), Pipkin (a hamster who escapes during delicate moments)
```

Each comma-separated piece is one character. `parseCharacters` will then yield:

- `Alistair Finch (a careful boy cartographer who thinks rules are useful until they get inconvenient)`
- `Pipkin (a hamster who escapes during delicate moments)`

That is safe to load, search, display, and regenerate.

**Example of the actual first-story original** going in:

- From: `careful boy cartographer who thinks rules are useful until they get inconvenient, a hamster who escapes during delicate moments`
- To: `Alistair Finch (careful boy cartographer who thinks rules are useful until they get inconvenient), <hamster's real name from the story> (a hamster who escapes during delicate moments)`

Use the names that already appear in that story’s markdown. Do not copy this hamster name across stories.

Record the before/after `characters` strings in the progress file and in each comparison section.

## Banned stock names (required)

If you find **Barnaby** or **Salis** in the story you are currently editing, replace it. If you do not find them, do nothing. Do not search or count how often they appear in the rest of the library.

When found, replace every occurrence in that story, case-insensitive, including possessives and compounds (`Barnaby`, `barnaby`, `Barnaby's`, `Barnaby Button`, `Salis`, `Salis's`). Do this in:

- the story body (`markdown`)
- the `title`
- the `characters` string

**Replacement rules:**

- Pick one fresh, pronounceable given name per banned name **in that story**, suited to the audience and already-established character. Use it consistently for the whole file.
- Do not reuse the same replacement across several stories in this run (don’t mint a new default like “Milo” everywhere).
- Do not replace with another banned name, or with a name already used by a different character in that story.
- Keep surnames/epithets if they are not the banned token: `Barnaby Button` → `Ned Button`, not a totally unrelated identity.
- Do not rewrite the plot to justify the new name. This is a find-and-replace of a stock given name, then a grammar pass for articles/possessives.
- Do not change `id` or `file`, even if the title had to change.
- Before writing the preview file, confirm that story’s `title`, `markdown`, and `characters` no longer contain `Barnaby` or `Salis`. Hits inside `id` / `file` are allowed.

If a replacement happened, record it in the progress file (`bannedNameReplacements`: `{"Barnaby": "Ned"}`). If neither name appeared, leave that object empty.

Do the 10 yourself in this chat. Do not launch 10 Cursor Task subagents.

## Tracking (required)

Create/update `stories/improve-runs/{model-slug}/progress.json` as the source of truth for this model run. Schema:

```json
{
  "phase": "pilot",
  "editor": "<model-slug>",
  "updatedAt": "<ISO timestamp>",
  "indexSource": "public/stories-index.json",
  "pilotLimit": 10,
  "pilotIds": ["alistair-finch-and-the-stones-secret-5dac6014", "...9 more..."],
  "stories": {
    "alistair-finch-and-the-stones-secret-5dac6014": {
      "status": "previewed",
      "title": "Alistair Finch and the Stone's Secret",
      "originalPath": "public/stories/alistair-finch-and-the-stones-secret-5dac6014.json",
      "previewPath": "stories/improve-runs/<model-slug>/preview/alistair-finch-and-the-stones-secret-5dac6014.json",
      "originalWordCount": 1562,
      "improvedWordCount": 0,
      "titleChanged": false,
      "bannedNameReplacements": {},
      "originalCharacters": "careful boy cartographer who thinks rules are useful until they get inconvenient, a hamster who escapes during delicate moments",
      "improvedCharacters": "Alistair Finch (careful boy cartographer who thinks rules are useful until they get inconvenient), Pipkin (a hamster who escapes during delicate moments)",
      "notes": "one or two sentences on what you actually changed"
    }
  }
}
```

Status values: `pending` | `previewed` | `applied` | `skipped` | `failed`.

For this pilot, completed stories must be `previewed` (not `applied`). `applied` is reserved for a later pass that writes into `public/stories/` after the user approves.

If the user later asks this same model to process more stories, keep using this same progress file. Never restart by wiping it. A different model must use a different `{model-slug}` folder.

## Comparison document (required)

Write **one** markdown file for this run:

`stories/improve-runs/{model-slug}/comparison.md`

It must be readable by a human in Cursor. Structure:

1. **Title and summary** — what this pilot is, which Cursor model edited it, that Gemini was not called, that library files were not overwritten, and that the run **stopped after 10 stories**.
2. **Method** — short description of the pipeline you followed and which prompt files you used.
3. **How to read A/B** — A = original `markdown` from `public/stories/`; B = improved `markdown` from this run’s `preview/` folder.
4. **Index table** of all 10: title, id, original word count, new word count, one-line verdict.
5. **Then, for each story, a section** `## 1. <Title>` containing:
   - Metadata bullet list: audience, ageGroup, readingAge, framework, style, tone, pacing, humor, emotion, consolidator, original date.
   - **Characters A → B** — original `characters` string, then the named string. Call out any slot you could not name.
   - **Banned-name replacements** — if `Barnaby` or `Salis` was in this story, list old → new. If neither was found, say none. Do not comment on how common the names are in the library.
   - **What I changed** — concrete, story-specific notes (not generic “improved flow”). Mention craft issues you found and how B addresses them. If you left something on purpose, say so.
   - **Version A (original)** — full original story body in a fenced code block or as markdown paragraphs clearly labelled. Include the complete text, not a summary.
   - **Version B (improved)** — full improved story body, complete text.

The file will be long. That is intended. Do not truncate stories.

## Stop condition (mandatory)

When story **10 of 10** is written, the progress file has 10 `previewed` (or `failed`/`skipped`) entries, and `comparison.md` is complete:

1. **Stop. End the turn. Do not start another story.**
2. In your final chat message, **point the user to** `stories/improve-runs/{model-slug}/comparison.md` as the primary review file, and mention that run’s `progress.json` and `preview/` folder.
3. Briefly say whether any story failed and why.
4. Do not commit.
5. Do not process the remaining library in this run, even if work is going well.

Ten stories is the test. The user will try more than one model this way. Another model’s chat must not write into this run’s folder.

## If the user later asks to process the rest

Only after a new, explicit instruction such as “process the rest” or “apply these”:

1. Keep that model’s `progress.json`; skip any id already `previewed` or `applied`.
2. Continue through `public/stories-index.json` in order (or a user-specified slice: age group / framework).
3. Still do not overwrite `public/stories/` until the user says **apply**. Applying means: copy preview JSON over the matching `public/stories/{file}`, drop `improvementStatus` to `"applied"` (or set it), copy `title`, `wordCount`, and the updated **string** `characters` into that row of `public/stories-index.json` (keep `characters` a string there too), and only rebuild `dist/` if the user asks to publish.
4. Still do not call the Gemini API. Still do not create a PR.

## Done looks like

- [ ] `stories/improve-runs/{model-slug}/progress.json` exists with exactly 10 entries, none left `pending`
- [ ] `stories/improve-runs/{model-slug}/preview/` has up to 10 JSON files
- [ ] `stories/improve-runs/{model-slug}/comparison.md` has method notes plus full A and B for all 10
- [ ] `public/stories/` and `dist/stories/` unchanged
- [ ] This chat stopped after those 10 and pointed at the comparison file
- [ ] No 11th story was started
