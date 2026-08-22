   # StoryGen

   An AI-powered children's story generator that creates personalised, age-appropriate stories through a team of specialised AI agents. The app is a React + Vite client that calls Google's Gemini API from the browser.

   ## About

   **StoryGen** was created by **Phil Leichauer** on **21 February 2026**.

   The app was built to help my daughter with reading — specifically to aid understanding and pronunciation of new words she encounters in stories. When a child taps any word in a generated story, they can hear it spoken aloud, see its definition, and explore example sentences, all without leaving the page.

   StoryGen also began life as an experiment in doing something genuinely useful with AI agents. Rather than asking a single AI to write an entire story in one go, StoryGen uses a team of specialist agents that each handle one part of the writing process — much like a real publishing team:

   1. A **Story Crafter** writes the first draft from your characters and ideas
   2. An **Elaborator** enriches the draft where the selected framework benefits from expansion (concise fables skip this step)
   3. A **Reviewer** reads the story critically and provides feedback
   4. A **Polisher** rewrites the story incorporating the reviewer's suggestions
   5. A **Cleaner** tidies up any leftover formatting or notes
   6. A **Titler** gives the finished story a fitting title

   An optional **Consolidator** can make one careful tightening pass after polishing. The result is a story that feels considered and crafted rather than generated — one that children actually enjoy hearing at bedtime.

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

   - **Multi-agent story pipeline** — 5–7 specialised AI agents collaborate to draft, enrich where appropriate, review, polish, clean, and title each story
   - **Experimental Fast Mode** — generate the same title-and-story deliverable with one structured Gemini request while retaining every creative and parental option
   - **19 narrative frameworks** — Dan Harmon's Story Circle, Three-Act Structure, Kishōtenketsu, Hero's Journey, Pixar Story Spine, Grimm fairy-tale patterns, STEM Learning Fables, and more
   - **6 authorial styles** — Imaginative & Bold (Dahl/Walliams), Musical & Warm (Donaldson), Gentle & Reassuring (Kerr/Bond), Classic Adventure (Grimm/Lewis), Atmospheric & Empathetic (Studio Ghibli), or a neutral default
   - **Content sensitivity controls** — Adjustable conflict, scariness, sadness, and complexity levels with age-appropriate presets
   - **Vocabulary Assist** — Tap any word in a story to see its definition, part of speech, phonetics, and example sentences via the Free Dictionary API and Wiktionary
   - **Pronunciation** — Hear words spoken aloud using dictionary recordings (real human audio from Wikimedia) or your browser's text-to-speech engine
   - **Reading difficulty adjustment** — A slider scales vocabulary complexity for younger or older readers
   - **Narrator personas** — Optional voices such as Wise Grandfather, Adventurer, Silly Friend, Wise Owl, or Epic Bard
   - **Tone, pacing, humour, and emotion controls** — Fine-tune the feel of each story
   - **Save & load** — Download stories as markdown or JSON; keep a local IndexedDB library; browse a pre-generated story database
   - **Light and dark themes** — Automatic or manual switching
   - **Built-in Help Wiki** — Searchable guides on every feature

   ---

   ## Getting Started

   1. **Install and run the app**
      ```bash
      npm install
      npm run dev
      ```
      Then open the local URL Vite prints (usually `http://localhost:5173`).
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
   | **Narrator Persona** | Optional narrative voice for the agents |
   | **Include Plot Points** | Toggle for optional scene ideas or directions |

   ### Options Tab

   | Control | Purpose |
   |---------|---------|
   | **Content Sensitivity** | Preset or custom conflict/scary/sadness/complexity levels |
   | **STEM Concept** | Science/maths concept to weave in (Learning Fable framework only) |
   | **Adjust Vocabulary for Difficulty** | Slider to scale language complexity |
   | **Consolidate** | Enable one careful post-polish tightening pass |
   | **Tone / Pacing / Humour / Emotion** | Fine-tuning dials via the style modal |

   ### Assist Tab

   Tap any word in a generated story to:
   - See its **definition**, **part of speech**, **phonetics**, and **example sentences**
   - **Hear it spoken aloud** — via dictionary recordings or browser text-to-speech
   - Track words you've looked up over time

   ### Changing the Gemini Model

   Models are discovered dynamically from the Gemini ListModels API when you save an API key. The fallback default lives in `src/modelDiscovery.ts`. Any model compatible with `generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent` can appear in Settings.

   ### Settings Modal

   | Control | Purpose |
   |---------|---------|
   | **API Key** | Google Gemini API key |
   | **Model** | Gemini model selection |
   | **Min API Interval** | Rate limiting between agent calls |
   | **Reading Age Bounds** | Min/max for the vocabulary difficulty slider |
   | **Pronunciation** | Choose dictionary recordings or browser voice; pick a specific voice |
   | **Agent Thinking** | Per-agent toggle for extended reasoning mode |
   | **Experimental Fast Mode** | Replace the generation pipeline with one structured Gemini request; faster, but potentially less consistent |

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
   │                     Browser Client (React + Vite)            │
   ├─────────────────────────────────────────────────────────────┤
   │  src/App.tsx         │  Settings, generation, persistence   │
   │  src/pipeline.ts     │  Agent engine (sequencing, checks)   │
   │  src/api.ts          │  Gemini fetch, rate limit, retry     │
   │  src/formatStory.ts  │  Markdown → HTML + word spans        │
   │  src/wiktionary.ts   │  Dictionary lookups (2 APIs)         │
   │  src/storyLibrary.ts │  IndexedDB local library             │
   │  src/prompts/*.ts    │  Prompt templates & content library  │
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
   Standard:       Crafter → Elaborator → Reviewer → Polisher → [Consolidator] → Cleaner → Titler
   Concise fables: Crafter → Reviewer → Polisher → [Consolidator] → Cleaner → Titler
   Fast Mode:      Agent F performs all stages internally → structured title + story
   ```

   Every agent receives the same system-level safety policy and instruction hierarchy. Crafter and Reviewer receive the full selected guides; editing stages receive concise summaries to reduce token use and instruction conflicts. Dynamic story data is clearly delimited. After pipeline completion, a voice-consistency validator runs heuristic checks for formality drift, vocabulary shifts, preachy endings, and energy inconsistency.

   Experimental Fast Mode uses the same system policy and full option set, but performs silent planning, drafting, review, revision, optional consolidation, cleanup, and titling in a single request. Gemini's JSON response schema keeps the title and story body reliably separated. The separate Elaborate action still uses the editor pipeline.

   Prompt assembly and framework compatibility can be checked locally with:

   ```bash
   npm run test:prompts
   ```

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

   - **The app is original application code** — React and Vite are used to build the UI; story generation still happens through the user's own Gemini API key.
   - **External services are consumed at runtime**, not bundled. The Google Gemini API, Free Dictionary API, Wiktionary REST API, and Web Speech API are all accessed via HTTP requests or browser built-ins — their terms apply to their own services, not to this codebase.
   - **Wiktionary content** displayed to users is CC-BY-SA, but that licence covers the *data* (definitions, audio), not our application code.
   - **MIT is maximally permissive** — anyone can use, modify, or distribute StoryGen for any purpose with minimal friction.

   ---

   ## Known Issues

   | Issue | Notes |
   |-------|-------|
   | API key in URL | Key is sent as a query parameter (visible in DevTools and some logs); there is no server proxy |
   | API key in localStorage | A XSS bug in the page could expose the key. Treat this as a personal BYOK tool |
   | RiTa via CDN | Phonics loads RiTa from unpkg without Subresource Integrity |

   ---

   *Built with curiosity, caffeine, and a lot of bedtime stories.*
