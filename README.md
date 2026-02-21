# StoryGen

An AI-powered children's story generator that creates personalised, age-appropriate stories through a team of specialised AI agents. Built as a zero-dependency browser app using Google's Gemini API.

## About

**StoryGen** was created by **Phil Leichauer** on **21 February 2026**.

The app was built to help my daughter with reading — specifically to aid understanding and pronunciation of new words she encounters in stories. When a child taps any word in a generated story, they can hear it spoken aloud, see its definition, and explore example sentences, all without leaving the page.

StoryGen also began life as an experiment in doing something genuinely useful with AI agents. Rather than asking a single AI to write an entire story in one go, StoryGen uses a team of specialist agents that each handle one part of the writing process — much like a real publishing team:

1. A **Story Crafter** writes the first draft from your characters and ideas
2. An **Elaborator** enriches the draft with sensory details, dialogue, and emotion
3. A **Reviewer** reads the story critically and provides feedback
4. A **Polisher** rewrites the story incorporating the reviewer's suggestions
5. A **Cleaner** tidies up any leftover formatting or notes
6. A **Titler** gives the finished story a fitting title

An optional **Consolidator** can step in to tighten wordy passages. The result is a story that feels considered and crafted rather than generated — one that children actually enjoy hearing at bedtime.

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Getting Started](#getting-started)
- [User Guide](#user-guide)
- [Saving & Loading Stories](#saving--loading-stories)
- [Architecture](#architecture)
- [Technical Reference](#technical-reference)
- [License](#license)
- [Known Issues & Roadmap](#known-issues--roadmap)

---

## Features

- **Multi-agent story pipeline** — 6–8 specialised AI agents collaborate to draft, enrich, review, polish, clean, and title each story
- **19 narrative frameworks** — Dan Harmon's Story Circle, Three-Act Structure, Kishōtenketsu, Hero's Journey, Pixar Story Spine, Grimm fairy-tale patterns, STEM Learning Fables, and more
- **6 authorial styles** — Imaginative & Bold (Dahl/Walliams), Musical & Warm (Donaldson), Gentle & Reassuring (Kerr/Bond), Classic Adventure (Grimm/Lewis), Atmospheric & Empathetic (Studio Ghibli), or a neutral default
- **Content sensitivity controls** — Adjustable conflict, scariness, sadness, and complexity levels with age-appropriate presets
- **Vocabulary Assist** — Tap any word in a story to see its definition, part of speech, phonetics, and example sentences via the Free Dictionary API and Wiktionary
- **Pronunciation** — Hear words spoken aloud using dictionary recordings (real human audio from Wikimedia) or your browser's text-to-speech engine
- **Reading difficulty adjustment** — A slider scales vocabulary complexity for younger or older readers
- **Tone, pacing, humour, and emotion controls** — Fine-tune the feel of each story
- **Story series** — Generate multi-episode arcs (3, 5, or 7 parts) with automatic continuity between chapters
- **Save & load** — Download stories as markdown files with metadata; re-open them later with full markdown rendering
- **Light and dark themes** — Automatic or manual switching
- **Built-in Help Wiki** — Searchable guides on every feature
- **Zero dependencies** — Pure vanilla JavaScript, no build step, no npm packages

---

## Getting Started

1. **Serve the app** via HTTP (not `file://`) — a simple local server is needed for ES module imports
   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js
   npx serve .

   # Then open http://localhost:8000
   ```
2. **Open Settings** (⚙️) → Enter your [Gemini API key](https://aistudio.google.com/app/apikey) → Save
3. **Configure your story** — enter characters, choose an audience age, pick a framework and style
4. **Click Generate Story** and watch the agents work

---

## User Guide

### Story Tab

| Control | Purpose |
|---------|---------|
| **Characters** | Describe who your story is about — names, personalities, relationships |
| **Target Audience** | Age range, e.g. "children aged 5-7" |
| **Story Framework** | Narrative structure blueprint (19 options) |
| **Authorial Style** | Voice and tone template (6 options) |
| **Include Plot Points** | Toggle for optional scene ideas or directions |

### Options Tab

| Control | Purpose |
|---------|---------|
| **Content Sensitivity** | Preset or custom conflict/scary/sadness/complexity levels |
| **STEM Concept** | Science/maths concept to weave in (Learning Fable framework only) |
| **Adjust Vocabulary for Difficulty** | Slider to scale language complexity |
| **Consolidate** | Enable tightening passes in the pipeline |
| **Tone / Pacing / Humour / Emotion** | Fine-tuning dials via the style modal |

### Series Tab

Create multi-episode story arcs:
- **3-Part Mini-Series** — Quick arc for shorter attention spans
- **5-Part Adventure** — Classic hero's journey structure
- **7-Night Epic Journey** — Extended world-building series

Each episode auto-generates continuity metadata for injection into subsequent chapters.

### Assist Tab

Tap any word in a generated story to:
- See its **definition**, **part of speech**, **phonetics**, and **example sentences**
- **Hear it spoken aloud** — via dictionary recordings or browser text-to-speech
- Track words you've looked up over time

### Changing the Gemini Model

The available models and default are defined in a single place at the top of `src/script.js`. To add or change models:

1. Open `src/script.js` and search for **`AVAILABLE_MODELS`**
2. Add a new entry to the object using the model's API ID (the identifier from the [Gemini API docs](https://ai.google.dev/gemini-api/docs/models)), for example:
   ```js
   "gemini-2.0-pro": { name: "Gemini 2.0 Pro", supportsThinking: false }
   ```
3. Set `supportsThinking` to `true` if the model supports extended reasoning, or `false` if it doesn't
4. To change the **default** model, update the `DEFAULT_GEMINI_MODEL_ID` constant just above
5. No other files need changing — the Settings dropdown and API calls are built dynamically from this object

The API URL is constructed as `generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent`, so any model compatible with that endpoint will work.

### Settings Modal

| Control | Purpose |
|---------|---------|
| **API Key** | Google Gemini API key |
| **Model** | Gemini model selection |
| **Min API Interval** | Rate limiting between agent calls |
| **Reading Age Bounds** | Min/max for the vocabulary difficulty slider |
| **Pronunciation** | Choose dictionary recordings or browser voice; pick a specific voice |
| **Agent Thinking** | Per-agent toggle for extended reasoning mode |

---

## Saving & Loading Stories

Stories can be saved as markdown (`.md`) files and re-opened later. The save file includes YAML frontmatter with metadata (title, date, characters, audience, framework, style) followed by the story text.

- **Save** (⬇ icon) — Downloads the current story as a `.md` file
- **Open** (📂 icon) — Loads a `.md` or `.txt` file back into the display

### Markdown Rendering

When loading a file, the following markdown features are rendered:

| Feature | Syntax | Rendered As |
|---------|--------|-------------|
| **Headings** | `# H1` … `###### H6` | `<h2>` – `<h6>` elements |
| **Bold** | `**text**` | `<strong>` |
| **Italic** | `*text*` | `<em>` |
| **Strikethrough** | `~~text~~` | `<del>` |
| **Inline code** | `` `code` `` | `<code>` with monospace styling |
| **Fenced code blocks** | ` ```lang … ``` ` | `<pre><code>` block |
| **Horizontal rules** | `---`, `***`, `___` | `<hr>` line |
| **Scene breaks** | `* * *` | Decorative divider (✦) |
| **Unordered lists** | `- item` or `* item` | `<ul><li>` (nested via indentation) |
| **Ordered lists** | `1. item` | `<ol><li>` (nested via indentation) |
| **Nested lists** | Indent with spaces | Sub-lists with alternate bullet styles |
| **Blockquotes** | `> text` | `<blockquote>` (recursive nesting with `>>`) |
| **Tables** | `\| col \| col \|` | `<table>` with optional alignment row |

> **Not implemented:** Images, links, footnotes, definition lists, task checkboxes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
├─────────────────────────────────────────────────────────────┤
│  index.html          │  UI Layer (tabs, modals, output)     │
│  src/script.js       │  Orchestrator (events, prompt build) │
│  src/pipeline.js     │  Agent engine (sequencing, checks)   │
│  src/api.js          │  API layer (rate limit, retry)       │
│  src/ui.js           │  Rendering (markdown, toasts)        │
│  src/wiktionary.js   │  Dictionary lookups (2 APIs)         │
│  src/utils.js        │  Prompt helpers, voice analysis      │
│  src/localStorage.js │  Persistence key/value helpers       │
│  src/appState.js     │  Runtime state container             │
│  src/prompts/*.js    │  Prompt templates & content library  │
└─────────────────────────────────────────────────────────────┘
              │                            │
              ▼                            ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│   Google Gemini API  │   │  Free Dictionary API         │
│   (story generation) │   │  Wiktionary REST API         │
└──────────────────────┘   │  Wikimedia audio (pronunc.)  │
                           └──────────────────────────────┘
```

### The Multi-Agent Pipeline

```
Crafter → Elaborator → [Consolidator] → Reviewer → Polisher → [Consolidator] → Cleaner → Titler
```

Each agent receives layered prompts built from: role identity → story context → adjustment modules → sensitivity guidance → authorial style guide → story framework guide. After pipeline completion, a voice-consistency validator runs heuristic checks for formality drift, vocabulary shifts, preachy endings, and energy inconsistency.

---

## Technical Reference

### Story Framework Library (19 options)

Dan Harmon's Story Circle, Three-Act Structure, Kishōtenketsu, Freytag's Pyramid, Hero's Journey, "But, Therefore" Chain, Pixar Story Spine, Chekhov's Sketch, Save the Cat! Beat Sheet, Seven-Point Structure, Snowflake Method, Fichtean Curve, 5 Grimm Patterns (Forest Path, Wish-Mirror, Hidden-Beast, Sibling-Quest, Trickster-Triumph), Fable (Aesop Style), Learning Fable (STEM).

### Authorial Style Library (6 options)

Default, Imaginative & Bold (Dahl/Walliams), Musical & Warm (Donaldson), Gentle & Reassuring (Kerr/Bond), Classic Adventure (Grimm/Lewis/Blyton), Atmospheric & Empathetic (Studio Ghibli).

### STEM Concept Library (18 options)

Physics (displacement, leverage, momentum, buoyancy, friction, aerodynamics), Maths (counting, patterns, geometry, estimation), Biology (metamorphosis, camouflage, ecosystems, lifecycles, echolocation), Engineering (problem solving, materials, structures).

### External Services

| Service | Purpose | License / Terms |
|---------|---------|-----------------|
| [Google Gemini API](https://ai.google.dev/) | Story generation (user provides their own API key) | Google API Terms of Service |
| [Free Dictionary API](https://dictionaryapi.dev/) | Word definitions, phonetics, audio | Open source (no key required) |
| [Wiktionary REST API](https://en.wiktionary.org/api/rest_v1/) | Fallback definitions | Wikimedia Terms of Use; content is CC-BY-SA |
| [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Browser text-to-speech | Built-in browser API |

---

## License

StoryGen is released under the **MIT License**. See [LICENSE](LICENSE) for the full text.

### Why MIT?

- **The app is 100% original code** — no npm packages, no bundled libraries, no build step. Every line of JavaScript, HTML, and CSS was written for this project.
- **External services are consumed at runtime**, not bundled. The Google Gemini API, Free Dictionary API, Wiktionary REST API, and Web Speech API are all accessed via HTTP requests or browser built-ins — their terms apply to their own services, not to this codebase.
- **Wiktionary content** displayed to users is CC-BY-SA, but that licence covers the *data* (definitions, audio), not our application code.
- **MIT is maximally permissive** — anyone can use, modify, or distribute StoryGen for any purpose with minimal friction.

---

## Known Issues

| Issue | Notes |
|-------|-------|
| Grimm framework key mismatch | Curly quotes vs straight quotes in framework keys cause selection desync |
| Plot points leak | Hiding the textarea doesn't clear its value — text still injects into prompts |
| Consolidator labelling | UI implies one pass but enables two in full pipeline |
| API key in URL | Key is sent as a query parameter (visible in logs/history); no server proxy |

---

*Built with curiosity, caffeine, and a lot of bedtime stories.*
