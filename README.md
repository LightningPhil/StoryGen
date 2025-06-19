# Story Circle Story Generator

This project is a web application that generates stories based on user input, utilizing the Gemini API.

## Serving the Application

This application is designed to be served using **Internet Information Services (IIS)**. Ensure your IIS server is configured to serve static files from the project's root directory.

## Gemini API Configuration

*   **API Key:** The Gemini API key is currently **hardcoded** directly into `src/script.js`. For production environments, it is highly recommended to use a more secure method for managing API keys (e.g., environment variables, server-side proxy).
*   **Model Choice:** The application uses the `gemini-2.0-flash` model, as specified in `src/script.js`.

## Project File Structure

```
.
├── index.html
├── README.md
└── src/
    ├── script.js
    ├── style.css
    └── prompts/
        ├── agent1_story_crafter_template.js
        ├── agent2_reviewer_template.js
        ├── agent3_polisher_template.js
        ├── agent4_cleaner_template.js
        ├── agent5_titler_template.js
        ├── illustrator_notes_template.js
        └── story_circle_craft_guide.js