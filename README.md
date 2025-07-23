# Story Circle Story Generator

This project is a web application designed to help users generate creative children's stories. It leverages the Google Gemini API through a sophisticated multi-agent pipeline to craft, elaborate, review, and polish stories. Users provide inputs like characters and target audience, and can guide the story's creation by selecting from various narrative frameworks (e.g., Dan Harmon's Story Circle), authorial styles (e.g., Roald Dahl, Studio Ghibli), and granular tonal adjustments.

## How it Works

The application employs a client-side agent-based system. When a user requests a story:

1.  **Input Gathering:** The system collects user inputs: characters, target audience, the chosen story framework, and a desired authorial style. It also considers optional plot suggestions, reading age adjustments, and fine-grained stylistic controls for tone, pacing, humor, and emotional journey. Advanced settings, like per-agent "thinking" toggles, are also factored in.
2.  **Agent Pipeline Execution:** A sequence of specialised "agents" processes the story. The core logic for this is managed in `pipeline.js`. The prompt for each agent is a rich composite of the user's core request, the chosen structural framework, the selected authorial style, and any granular tonal adjustments.
    *   **Story Crafter (Agent 1):** Generates an initial draft based on all inputs and structural/stylistic guidelines.
    *   **Elaborator (Agent 2):** Takes the draft and enriches it with more detail, dialogue, and potentially new minor scenes to increase depth and length.
    *   **Reviewer (Agent 3):** Evaluates the elaborated draft against all chosen principles (structure, style, tone) and general storytelling quality, providing constructive feedback.
    *   **Polisher (Agent 4):** Rewrites the story, incorporating the reviewer's feedback to improve pacing, humour, emotional depth, and adherence to all guides.
    *   **Cleaner (Agent 5):** Performs a final pass to remove any extraneous formatting or artefacts.
    *   **Titler (Agent 6):** Generates a captivating title for the finalised story.
3.  **Output:** The final story and its title are displayed to the user. The word count is logged to the browser console. An "Elaborate Story" option allows users to run a similar pipeline to expand the current story.

All processing, including API calls, is handled in the user's browser. Application settings and the last generated story can be persisted using Local Storage.

## Key Features

*   **Multiple Story Frameworks:** Choose from classic and modern narrative structures.
*   **Authorial Style Emulation:** Select from styles inspired by master storytellers like Roald Dahl or Studio Ghibli to influence the story's voice and theme.
*   **Granular Tonal Control:** Fine-tune the story's tone, pacing, humor, and emotional journey via a dedicated adjustments panel.
*   **Agent-Based Generation:** A multi-step AI pipeline for robust story creation.
*   **Customisable Inputs:** Define characters, audience, and provide plot ideas.
*   **Reading Age Adjustment:** Option to tailor vocabulary and sentence structure for specific age groups.
*   **Story Elaboration:** Further develop and expand generated stories.
*   **Model-Aware Configuration:** Advanced settings like 'Agent Thinking' are automatically enabled for compatible Gemini models (e.g., Gemini 2.5 Flash).
*   **Settings Persistence:** API key, model preferences, and other settings are saved locally.
*   **Chat Log Download:** Download a JSON log of the last generation session for debugging or review.
*   **Word Count:** The final word count is logged to the browser console.
*   **Client-Side Operation:** Runs entirely in the browser.
*   **Responsive Design:** Adapts to various screen sizes.

## Spelling Convention

Please use UK English spellings throughout the project for documentation and user-facing text. Code elements (variables, function names, CSS classes) should follow conventional US English spellings common in programming.

## Project File Structure

├── .gitignore
├── favicon.ico
├── index.html
├── README.md
├── story_craft_guide_collection.md (Reference for story structure theory, not directly used by app code)
└── src/
    ├── api.js # Handles communication with the Gemini API.
    ├── appState.js # Manages core application state.
    ├── localStorage.js # Utilities for saving/loading data from Local Storage.
    ├── pipeline.js # Manages agent definitions and pipeline execution logic.
    ├── script.js # Main application logic, event handling, UI control.
    ├── style.css # CSS styles for the application.
    ├── ui.js # Functions for manipulating the user interface.
    ├── utils.js # Utility functions (e.g., parsing inputs, counting words).
    └── prompts/
        ├── agent_prompts.js # Templates for prompts sent to the Gemini API agents.
        ├── adjustment_modules.js # Defines granular tonal/pacing/etc. modules.
        ├── author_styles.js # Defines stylistic guides inspired by authors.
        └── story_crafting_guides.js # Detailed guides for each story framework.


## Configuration

Application settings are managed via the UI:

*   **Gemini API Key:** Your Google Gemini API key is required. This can be entered in the "Settings" modal (⚙️ icon).
*   **Gemini Model:** Select your preferred Gemini model.
*   **Minimum API Interval:** Configure the minimum time (in seconds) between consecutive API calls to help manage rate limits.
*   **Reading Age Slider Limits:** Define the minimum and maximum ages for the reading age adjustment slider.
*   **Agent Thinking Toggles:** In the Settings modal, you can enable or disable the 'thinking' feature for each individual agent in the pipeline. This option is only available for supported models (like Gemini-2.5-Flash).

These settings, along with your last inputs, are stored in your browser's Local Storage.

## Local Setup and Running

1.  Ensure you have a modern web browser (e.g., Chrome, Firefox, Edge).
2.  Clone or download the project files.
3.  Open the `index.html` file in your web browser.
4.  Configure your Gemini API key via the Settings (⚙️) panel.

No build process or local server is strictly required for basic operation. However, for development, using a simple local HTTP server (like `live-server` for VS Code, Python's `http.server`, or `npx serve`) is recommended to avoid potential browser security issues with `file:///` URLs.