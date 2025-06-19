# Story Circle Story Generator

This project is a web application designed to help users generate creative children's stories. It leverages the Google Gemini API through a sophisticated multi-agent pipeline to craft, elaborate, review, and polish stories based on user-provided inputs like characters, target audience, and optional plot suggestions. Users can select from various narrative frameworks (e.g., Dan Harmon's Story Circle, Three-Act Structure) to guide the story's structure.

## How it Works

The application employs a client-side agent-based system. When a user requests a story:

1.  **Input Gathering:** The system collects user inputs: characters, target audience, chosen story framework, and any optional suggestions. It also considers reading age adjustments.
2.  **Agent Pipeline Execution:** A sequence of specialised "agents" processes the story. Each agent is a call to the Gemini API with a carefully crafted prompt:
    *   **Story Crafter (Agent 1):** Generates an initial draft based on the inputs and the selected framework's structural guidelines.
    *   **Elaborator (Agent 2):** Takes the draft and enriches it with more detail, dialogue, and potentially new minor scenes or plot points to increase depth and length.
    *   **Reviewer (Agent 3):** Evaluates the elaborated draft against the chosen framework's principles and general storytelling quality, providing constructive feedback.
    *   **Polisher (Agent 4):** Rewrites the story, incorporating the reviewer's feedback to improve pacing, humour, emotional depth, and structural adherence.
    *   **Cleaner (Agent 5):** Performs a final pass to remove any extraneous formatting or artefacts, ensuring the text is ready.
    *   **Titler (Agent 6):** Generates a captivating title for the finalised story.
3.  **Output:** The final story and its title are displayed to the user. The word count of the final story is logged to the browser console. An "Elaborate Story" option allows users to run a similar (shorter) pipeline on the current story to further expand it.

All processing, including API calls, is handled in the user's browser. Application settings and the last generated story can be persisted using Local Storage.

## Key Features

*   **Multiple Story Frameworks:** Choose from classic and modern narrative structures.
*   **Agent-Based Generation:** A multi-step AI pipeline for robust story creation.
*   **Customisable Inputs:** Define characters, audience, and provide plot ideas.
*   **Reading Age Adjustment:** Option to tailor vocabulary and sentence structure for specific age groups.
*   **Story Elaboration:** Further develop and expand generated stories.
*   **Settings Persistence:** API key, model preferences, and other settings are saved locally.
*   **Chat Log Download:** Download a JSON log of the last generation session for debugging or review.
*   **Word Count:** The final word count of the generated/elaborated story is logged to the browser console.
*   **Client-Side Operation:** Runs entirely in the browser (requires an internet connection for API calls).
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
├── script.js # Main application logic, event handling, pipeline orchestration.
├── style.css # CSS styles for the application.
├── ui.js # Functions for manipulating the user interface.
├── utils.js # Utility functions (e.g., parsing inputs, counting words).
└── prompts/
├── agent_prompts.js # Templates for prompts sent to the Gemini API agents.
└── story_crafting_guides.js # Detailed guides and rules for each story framework.


## Configuration

Application settings are managed via the UI:

*   **Gemini API Key:** Your Google Gemini API key is required for the application to function. This can be entered in the "Settings" modal (⚙️ icon).
*   **Gemini Model:** Select your preferred Gemini model (Gemini-2.5-Flash, Gemini-2.0-Flash, Gemini-1.5-Flash) from the available options in Settings. The default is Gemini-2.5-Flash.
*   **Minimum API Interval:** Configure the minimum time (in seconds) between consecutive API calls to help manage rate limits.
*   **Reading Age Slider Limits:** Define the minimum and maximum ages for the reading age adjustment slider.

These settings, along with your last inputs for characters, audience, etc., are stored in your browser's Local Storage.

## Local Setup and Running

1.  Ensure you have a modern web browser (e.g., Chrome, Firefox, Edge).
2.  Clone or download the project files.
3.  Open the `index.html` file in your web browser.
4.  Configure your Gemini API key via the Settings (⚙️) panel.

No build process or local server is strictly required for basic operation, as it's a client-side application. However, some browser security features related to `file:///` URLs might behave differently than when served via HTTP (e.g., for ES Modules in older setups, though modern browsers are generally fine). For development, using a simple local HTTP server (like `live-server` for VS Code, Python's `http.server`, or `npx serve`) is recommended.