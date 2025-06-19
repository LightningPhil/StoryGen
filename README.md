# Story Circle Story Generator

This project is a web application that generates stories based on user input, utilizing the Gemini API.

## Serving the Application

This application is designed to be served using **Internet Information Services (IIS)**. Ensure your IIS server is configured to serve static files from the project's root directory.

## Gemini API Configuration

*   **API Key:** The Gemini API key is entered by the user in the UI. For production environments, it is highly recommended to use a more secure method for managing API keys (e.g., environment variables, server-side proxy).
*   **Model Choice:** The application uses the `gemini-2.0-flash` model, as specified in `src/script.js`.

## Story Crafting Frameworks

The application allows users to choose from several story crafting frameworks:

*   Dan Harmon's Story Circle
*   Three-Act Structure
*   Kishōtenketsu
*   Freytag’s Pyramid
*   Hero’s Journey (Condensed)
*   “But, Therefore” Chain
*   Chekhov’s Sketch

The selected framework guides the story generation process. The definitions for these frameworks are located in `src/prompts/story_crafting_guides.js`.

## Project File Structure
├── index.html
├── README.md
└── src/
├── script.js
├── style.css
└── prompts/
├── agent_prompts.js
└── story_crafting_guides.js