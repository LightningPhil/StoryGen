# StoryGen

A sophisticated multi-agent story generation system for children's literature, designed with deep understanding of narrative craft and child development. Built as a browser-based application using Google's Gemini API.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [The Multi-Agent Pipeline](#the-multi-agent-pipeline)
- [Prompt Engineering Philosophy](#prompt-engineering-philosophy)
- [User Guide](#user-guide)
- [Technical Reference](#technical-reference)
- [Known Issues & Roadmap](#known-issues--roadmap)

---

## Overview

StoryGen transforms character descriptions and story preferences into complete, polished children's stories through a carefully orchestrated sequence of specialized AI agents. Unlike single-prompt story generators, StoryGen mirrors a professional editorial workflow:

1. **Drafting** – A specialist story crafter builds the initial narrative
2. **Elaboration** – Details are enriched while preserving voice
3. **Review** – A critical eye evaluates craft quality
4. **Polish** – Feedback is incorporated into refined prose
5. **Cleanup** – Technical artifacts are removed
6. **Titling** – A fitting title crowns the work

### Design Philosophy

The system embodies several principles from professional children's literature:

- **Voice Consistency** – Automated checks detect tone drift between story opening and ending
- **Scaffolded Creativity** – Story frameworks provide structure without constraining imagination
- **Age-Appropriate Calibration** – Vocabulary, conflict intensity, and emotional depth scale to reader maturity

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
├─────────────────────────────────────────────────────────────┤
│  index.html          │  UI Layer                            │
│  ├── Tab Panels      │   • Story configuration              │
│  ├── Modals          │   • Framework/Style selection        │
│  └── Output Area     │   • Progress display & story render  │
├──────────────────────┼──────────────────────────────────────┤
│  src/script.js       │  Application Orchestrator            │
│  ├── DOM bindings    │   • Event handling                   │
│  ├── Input gathering │   • Prompt composition               │
│  └── Pipeline calls  │   • Flow coordination                │
├──────────────────────┼──────────────────────────────────────┤
│  src/pipeline.js     │  Agent Execution Engine              │
│  ├── Agent configs   │   • Template + dataKey definitions   │
│  ├── runPipeline()   │   • Sequential agent invocation      │
│  └── Voice Validator │   • Post-generation quality checks   │
├──────────────────────┼──────────────────────────────────────┤
│  src/api.js          │  API Communication Layer             │
│  ├── Rate limiter    │   • Configurable inter-call delay    │
│  ├── Retry logic     │   • Exponential backoff (6 retries)  │
│  └── Thinking toggle │   • Per-agent reasoning mode         │
├──────────────────────┼──────────────────────────────────────┤
│  src/prompts/        │  Prompt Library                      │
│  ├── agent_prompts   │   • Role-specific templates          │
│  ├── story_crafting  │   • 19 narrative frameworks          │
│  ├── author_styles   │   • 6 stylistic voices               │
│  └── adjustment_mods │   • Tone/pacing/humor/emotion tweaks │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │   Google Gemini API             │
            │   (generateContent endpoint)    │
            └─────────────────────────────────┘
```

### File Map

| File | Purpose |
|------|---------|
| `index.html` | Application shell, tabs, modals |
| `src/script.js` | DOM management, event handlers, prompt assembly |
| `src/pipeline.js` | Agent definitions, execution sequencing, voice validation |
| `src/api.js` | HTTP requests, rate limiting, retry with backoff |
| `src/ui.js` | Status updates, story rendering, toast notifications |
| `src/utils.js` | Prompt construction, narrative voice analysis |
| `src/localStorage.js` | Persistence key constants, get/set helpers |
| `src/appState.js` | Runtime state container |
| `src/prompts/*.js` | Prompt templates and content libraries |

---

## The Multi-Agent Pipeline

### Why Multiple Agents?

Children's stories require a delicate balance:
- **Wonder** without confusion
- **Tension** without trauma  
- **Lessons** without lectures
- **Sophistication** for co-reading adults without alienating young listeners

A single prompt cannot reliably achieve this. Instead, specialized agents each excel at one task, and their handoffs create natural checkpoints for quality.

### Agent Roster

| Agent | Role | Craft Rationale |
|-------|------|-----------------|
| **Agent 1: Story Crafter** | Generates initial draft from characters, audience, and framework | Focuses purely on structure and voice establishment |
| **Agent 2: Elaborator** | Expands scenes with sensory detail and dialogue | Enrichment without losing narrative momentum |
| **Agent C: Consolidator** | (Optional) Tightens prose, improves pacing | Counterbalances elaboration to prevent bloat |
| **Agent 3: Reviewer** | Critically evaluates against style/structure guides | Provides actionable feedback, not just approval |
| **Agent 4: Polisher** | Rewrites incorporating review feedback | Integrates critique into seamless narrative |
| **Agent 5: Cleaner** | Removes markup, stray notes, formatting issues | Technical cleanup preserving intentional language |
| **Agent 6: Titler** | Creates age-appropriate, evocative title | Final creative touch matching vocabulary level |

### Pipeline Variants

**Standard Generation (6-8 steps)**
```
Crafter → Elaborator → [Consolidator] → Reviewer → Polisher → [Consolidator] → Cleaner → Titler
```

**Elaboration Mode (4-5 steps)**
```
Elaborator → Reviewer → Polisher → [Consolidator] → Cleaner
```

The Consolidator appears twice in full generation when enabled—once after initial elaboration (managing first-draft sprawl) and once after polish (final tightening).

### Voice Consistency Validation

After pipeline completion, `checkNarrativeVoiceConsistency()` runs heuristic checks:

1. **Formality drift** – Detects contraction usage dropping between story thirds
2. **Vocabulary complexity shift** – Flags significant word-length increases toward ending
3. **Preachy endings** – Catches "moral lecture" patterns in final paragraphs
4. **Energy inconsistency** – Notes exclamation mark patterns that create tonal whiplash

Warnings appear in the session log, alerting users to potential issues.

---

## Prompt Engineering Philosophy

### Layered Instruction Architecture

Each agent prompt is assembled from composable layers:

```
┌───────────────────────────────────────┐
│ 1. ROLE IDENTITY                      │  "You are an award-winning children's author..."
├───────────────────────────────────────┤
│ 2. CONTEXT INJECTION                  │  Characters, audience, story-in-progress
├───────────────────────────────────────┤
│ 3. ADJUSTMENT MODULES                 │  Tone (calm bedtime), Pacing (slow), etc.
├───────────────────────────────────────┤
│ 4. SENSITIVITY GUIDANCE               │  Conflict level 0-3, scary elements 0-3...
├───────────────────────────────────────┤
│ 5. AUTHORIAL STYLE GUIDE              │  "Emulate Julia Donaldson's musical cadence..."
├───────────────────────────────────────┤
│ 6. STORY FRAMEWORK GUIDE              │  "Follow Dan Harmon's 8-step Story Circle..."
└───────────────────────────────────────┘
```

This order is intentional: role establishes baseline behavior, context provides material, adjustments fine-tune mood, sensitivity constrains content, and the major guides provide detailed craft instructions last (where they have maximum attention weight).

### Universal Craft Standards

All framework prompts share a preamble of non-negotiable craft rules:

1. **Show, *then* name** emotions – physical/sensory cues precede explicit naming
2. **Sensory trios** – peak moments layer 3+ senses
3. **Exclamation budget** – ≤8 per story (prevents breathless tone)
4. **Concrete vocabulary** – ban generic adjectives like "magical" or "glowing"
5. **Simple dialogue tags** – prefer "said/asked/whispered" over purple alternatives
6. **Word count guidance** – 800-1,200 words for ages 5-8

### Narrative Voice Consistency Guidance

Every framework includes explicit voice-locking instructions:

> **Before writing:** Decide your narrator's persona—warm and grandfatherly? Playful and silly? This should align with the chosen authorial style.
>
> **Throughout:** Maintain vocabulary level, sentence structure, direct address patterns, formality register, and humor consistency.
>
> **Red Flags:** Starting whimsical but ending preachy; mixing slang with archaic language; narrator becoming a moral lecturer in final paragraph.

---

## User Guide

### Quick Start

1. **Serve the app** via HTTP (not `file://`)—CORS restrictions require it
2. **Open Settings** → Enter Gemini API key → Save
3. **Configure your story** in the Story tab
4. **Click Generate** and watch progress updates

### Story Tab

| Control | Purpose |
|---------|---------|
| **Characters** | Comma-separated character descriptions (required) |
| **Target Audience** | Age range, e.g., "children aged 5-7" |
| **Story Framework** | Structural blueprint (modal selection) |
| **Authorial Style** | Voice/tone template (modal selection) |
| **Include Plot Points** | Toggle visibility of plot guidance textarea |
| **Plot Points** | Optional scene ideas, directions, or themes |

### Options Tab

| Control | Purpose |
|---------|---------|
| **Content Sensitivity** | Preset or custom conflict/scary/sadness/complexity levels |
| **STEM Concept** | (Learning Fable only) Science/math concept to teach |
| **Reading Age Adjustment** | Vocabulary simplification target |
| **Consolidate** | Enable conciseness passes in pipeline |
| **Tone / Pacing / Humor / Emotion** | Fine-tuning via style modal |

### Series Tab

Create multi-episode story arcs with:
- **3-Part Mini-Series** – Quick arc for impatient young listeners
- **5-Part Adventure** – Classic hero's journey structure  
- **7-Night Epic Journey** – Extended world-building series

Each episode auto-generates continuity metadata (summary, key events, cliffhanger) for injection into subsequent chapters.

### Settings Modal

| Control | Purpose |
|---------|---------|
| **API Key** | Google Gemini API authentication |
| **Model** | `gemini-3-flash-preview` or `gemini-2.5-flash` |
| **Min API Interval** | Rate limiting between calls (seconds) |
| **Reading Age Bounds** | Slider min/max configuration |
| **Agent Thinking** | Per-agent toggle for extended reasoning |

---

## Technical Reference

### Story Framework Library (19 options)

| Framework | Origin | Best For |
|-----------|--------|----------|
| **Dan Harmon's Story Circle** | TV writing | Character transformation arcs |
| **Three-Act Structure** | Classical drama | Clear beginning/middle/end |
| **Kishōtenketsu** | East Asian tradition | Contrast-based tension (no villain) |
| **Freytag's Pyramid** | 19th century drama | Visual rising/falling action |
| **Hero's Journey (Condensed)** | Joseph Campbell | Adventure and transformation |
| **"But, Therefore" Chain** | South Park method | Tight cause-and-effect pacing |
| **Pixar Story Spine** | Animation studio | "Once upon a time..." sentence scaffold |
| **Chekhov's Sketch** | Literary modernism | Mood pieces, subtle internal shifts |
| **Save the Cat! Beat Sheet** | Screenwriting | Detailed 15-beat mapping |
| **Seven-Point Structure** | Novel plotting | Midpoint-focused architecture |
| **Snowflake Method** | Draft development | Iterative expansion from sentence to story |
| **Fichtean Curve** | In medias res | Action-first, crisis ladder |
| **5 Grimm Patterns** | Fairy tale analysis | Classic tale archetypes (Forest Path, Wish-Mirror, Hidden-Beast, Sibling-Quest, Trickster-Triumph) |
| **Fable (Aesop Style)** | Ancient tradition | Explicit moral, animal characters |
| **Learning Fable (STEM)** | Educational fiction | Science/math concept as "moral" |

### Authorial Style Library (6 options)

| Style | Inspiration | Characteristics |
|-------|-------------|-----------------|
| **Default** | — | Neutral, craft-focused |
| **Imaginative & Bold** | Dahl, Walliams | Zany humor, child empowerment, satisfying villain comeuppance |
| **Musical & Warm** | Donaldson | Lyrical cadence, repetition, gentle lessons |
| **Gentle & Reassuring** | Kerr, Bond | Cozy domestic fantasy, soothing conflicts, safety |
| **Classic Adventure** | Grimm, Lewis, Blyton | Quest structure, clear morals, archetypal characters |
| **Atmospheric & Empathetic** | Studio Ghibli | Sensory richness, emotional nuance, mundane magic |

### Adjustment Module System

Each category offers ~4-5 options that inject specific craft directives:

**Tone Options:**
- `none`, `energetic_morning`, `calm_bedtime`, `whimsical_playful`, `epic_grand`

**Pacing Options:**
- `default`, `slow_soothing`, `fast_exciting`, `moderate_balanced`, `fast_dynamic`

**Humor Options:**
- `none`, `light_silly`, `wacky_slapstick`, `witty_dry`

**Emotional Journey Options:**
- `default`, `heartwarming`, `empowering`, `wonder_curiosity`, `laughs_and_fun`, `bittersweet_reflective`

### STEM Concept Library (18 options)

Physics: `displacement`, `leverage`, `momentum`, `buoyancy`, `friction`, `aerodynamics`

Math: `counting`, `patterns`, `geometry`, `estimation`

Biology: `metamorphosis`, `camouflage`, `ecosystems`, `lifecycles`, `echolocation`

Engineering: `problem_solving`, `materials`, `structures`

Each concept includes: hint (child-friendly explanation), example (story application), suggested animal characters.

### Data Flow: Placeholder Injection

| Placeholder | Agent 1 | Agent 2 | Agent C | Agent 3 | Agent 4 | Agent 5 | Agent 6 |
|-------------|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|
| `${charactersList}` | ✓ | | | | | | |
| `${audience}` | ✓ | ✓ | | | | | |
| `${USER_SUGGESTIONS_TEXT}` | ✓ | | | | | | |
| `${READING_AGE_NOTE}` | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| `${CRAFT_GUIDE_TEXT}` | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `${AUTHOR_STYLE_GUIDE}` | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `${ADJUSTMENT_MODULES_TEXT}` | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `${NARRATOR_PERSONA_TEXT}` | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `${SENSITIVITY_GUIDANCE_TEXT}` | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `${storyText}` | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `${reviewText}` | | | | | ✓ | | |

**Design Note:** Agent 5 (Cleaner) and Agent 6 (Titler) receive minimal guidance intentionally—Cleaner should preserve existing language choices, and Titler focuses purely on the finished story.

### Persistence

All UI state persists to `localStorage`:

| Category | Keys |
|----------|------|
| **API/Model** | `geminiApiKey_*`, `geminiSelectedModel_*` |
| **Story Inputs** | `storyCharacters_*`, `storyAudience_*`, `storySelectedFramework_*` |
| **Style Options** | `storySelectedAuthorStyle_*`, `storyAdjustment{Tone|Pacing|Humor|Emotion}_*` |
| **Sensitivity** | `storySensitivity{Preset|Conflict|Scary|Sadness|Complexity}_*` |
| **Features** | `adjustReadingAgeEnabled_*`, `enableConsolidator_*`, `storyIncludePlotPoints_*` |
| **Thinking** | `thinkingAgent{1-6,C}_*` |
| **UI** | `storyTheme_*` |

---

## Known Issues & Roadmap

### Critical Bugs

| Issue | Impact | Status |
|-------|--------|--------|
| **Grimm framework key mismatch** | 5 Grimm frameworks use curly quotes in `STORY_CRAFTING_GUIDES` but straight quotes in `STORY_FRAMEWORK_SUMMARIES`, causing selection/guide desync | Open |
| **Plot points leak** | Hiding the plot points textarea doesn't clear its value—existing text still injects into prompts | Open |

### Medium Issues

| Issue | Notes |
|-------|-------|
| **Consolidator labeling** | UI implies "one extra pass" but enables two consolidation runs in full pipeline |
| **Agent 1 output structure** | Outputs outline + character descriptions + draft; downstream agents may mishandle mixed content |
| **Narrator persona disabled** | Module exists but `getSelectedPersonaText()` always returns empty string |

### Security Considerations

| Concern | Current State |
|---------|---------------|
| **API key storage** | Browser `localStorage` (accessible to any script) |
| **API key transmission** | Sent as URL query parameter (visible in logs, history) |
| **No server proxy** | Direct browser-to-Gemini calls; no authentication layer |

### Future Enhancement Ideas

- **Server proxy** for API key protection
- **Export/import** for story collections
- **Illustration prompts** – `PROMPT_ILLUSTRATOR_NOTES_TEMPLATE` exists but is not wired up
- **Voice sample playback** – integration with TTS for bedtime reading

---

## Running Locally

```bash
# Any static file server works. Examples:

# Python 3
python -m http.server 8000

# Node.js (with npx)
npx serve .

# Then open http://localhost:8000
```

Visit the app, configure your Gemini API key in Settings, and start generating stories.

---

## Credits & Philosophy

StoryGen is built on the belief that AI-assisted storytelling should *amplify* human creativity rather than replace it. The multi-agent architecture, the rich prompt engineering, and the craft-focused validation all serve one goal: **helping parents and educators create stories their children will treasure.**

The system draws from:
- **Narrative theory** (Campbell, Harmon, Aristotle)
- **Children's literature masters** (Dahl, Donaldson, Kerr, Miyazaki)
- **Prompt engineering research** (chain-of-thought, role-playing, structured output)
- **Child development principles** (age-appropriate language, emotional safety)

---

*This README documents the actual implementation. For aspirational features, see GitHub Issues.*
