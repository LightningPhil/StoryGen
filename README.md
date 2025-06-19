# Story Circle Story Generator

This project is a web application that generates stories based on user input, utilizing the Gemini API.

## Spelling Convention

Please use UK English spellings throughout the project.
## Serving the Application

This application is designed to be served using **Internet Information Services (IIS)**. Ensure your IIS server is configured to serve static files from the project's root directory.

## Gemini API Configuration

*   **API Key:** The Gemini API key is entered by the user in the Settings menu (⚙️ icon).
*   **Model Choice:** The application allows users to choose their preferred Gemini model via the Settings menu. Available models include:
    *   Gemini 1.5 Flash (Latest)
    *   Gemini 1.5 Pro (Latest)
    The default model is `gemini-1.5-flash-latest`. The selected model is saved in local storage.

## Story Crafting Frameworks

The application allows users to choose from several story crafting frameworks:

*   Dan Harmon's Story Circle
*   Three-Act Structure
*   Kishōtenketsu
*   Freytag’s Pyramid
*   Hero’s Journey (Condensed)
*   “But, Therefore” Chain
*   Pixar Story Spine
*   Chekhov’s Sketch

The selected framework guides the story generation process. The definitions for these frameworks are located in `src/prompts/story_crafting_guides.js`.

## Project File Structure

├── .gitignore
├── favicon.ico
├── index.html
├── README.md
├── story_craft_guide_collection.md
└── src/
    ├── api.js
    ├── localStorage.js
    ├── script.js
    ├── style.css
    ├── ui.js
    ├── utils.js
    └── prompts/
        ├── agent_prompts.js
        └── story_crafting_guides.js