// --- Configuration ---
const GEMINI_MODEL_ID = "gemini-2.0-flash";

// --- Local Storage Keys ---
const LS_API_KEY = 'geminiApiKey_storyCircle'; // Added suffix for uniqueness
const LS_CHARACTERS = 'storyCharacters_storyCircle';
const LS_AUDIENCE = 'storyAudience_storyCircle';

// --- Imports ---
import { STORY_CIRCLE_AND_CRAFT_GUIDE } from './prompts/story_circle_craft_guide.js';
import { PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE } from './prompts/agent1_story_crafter_template.js';
import { PROMPT_AGENT_2_REVIEWER_TEMPLATE } from './prompts/agent2_reviewer_template.js';
import { PROMPT_AGENT_3_POLISHER_TEMPLATE } from './prompts/agent3_polisher_template.js';
import { PROMPT_AGENT_4_CLEANER_TEMPLATE } from './prompts/agent4_cleaner_template.js';
import { PROMPT_AGENT_5_TITLER_TEMPLATE } from './prompts/agent5_titler_template.js';
// import { PROMPT_ILLUSTRATOR_NOTES_TEMPLATE } from './prompts/illustrator_notes_template.js'; // Not used in current flow

// --- Global DOM Element Variables ---
let apiKeyInput, charactersInput, audienceInput, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv;

// --- UI Update Functions ---
function displayLoading(isLoading, message = '') {
    if (isLoading) {
        if (statusMessageDiv) {
            statusMessageDiv.textContent = message || 'Processing...';
            statusMessageDiv.className = 'loading';
        }
        if (storyTitleDiv) storyTitleDiv.textContent = '';
        if (storyOutputDiv) storyOutputDiv.textContent = 'Your story will appear here...';
        if (generateButton) generateButton.disabled = true;
    } else {
        if (statusMessageDiv && statusMessageDiv.classList.contains('loading')) {
            statusMessageDiv.textContent = '';
            statusMessageDiv.className = '';
        }
        if (generateButton) generateButton.disabled = false;
    }
}

function displayOutput(title, storyText) {
    if (storyTitleDiv) storyTitleDiv.textContent = title;
    if (storyOutputDiv) storyOutputDiv.textContent = storyText;
    if (statusMessageDiv) {
        statusMessageDiv.textContent = 'Story generated successfully!';
        statusMessageDiv.className = '';
        setTimeout(() => {
            if (statusMessageDiv && statusMessageDiv.textContent === 'Story generated successfully!') {
                statusMessageDiv.textContent = '';
            }
        }, 5000);
    }
}

function displayError(errorMessage) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = `Error: ${errorMessage}`;
        statusMessageDiv.className = 'error';
    }
    if (storyTitleDiv) storyTitleDiv.textContent = '';
    if (storyOutputDiv) storyOutputDiv.textContent = 'Story generation failed.';
    console.error("Pipeline Error Details:", errorMessage);
}

// --- Local Storage Helper Functions ---
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Could not save to local storage:", e);
    }
}

function loadFromLocalStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn("Could not load from local storage:", e);
        return null;
    }
}

// --- Helper Functions ---
function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(placeholder, dataObject[key]);
    }
    if (prompt.includes('${STORY_CIRCLE_AND_CRAFT_GUIDE}')) {
        prompt = prompt.replace(/\$\{STORY_CIRCLE_AND_CRAFT_GUIDE\}/g, STORY_CIRCLE_AND_CRAFT_GUIDE);
    }
    return prompt;
}

// --- Gemini API Call Function ---
async function callAgentAPI(prompt, currentApiKey) {
    if (!currentApiKey) {
        console.error("API Key is missing in callAgentAPI");
        throw new Error("Gemini API Key is missing. Please enter it above and try again.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${currentApiKey}`;
    
    console.log(`Calling Agent with model ${GEMINI_MODEL_ID}. Prompt starts with: "${prompt.substring(0,150)}..."`);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            // temperature: 0.7, // Example, adjust as needed
            // maxOutputTokens: 8192,
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            let errorMessage = `API request failed with status ${response.status} using model ${GEMINI_MODEL_ID}`;
            if (responseData && responseData.error && responseData.error.message) {
                errorMessage += ` - ${responseData.error.message}`;
                 if (response.status === 400 && responseData.error.message.toLowerCase().includes("api key not valid")) {
                    errorMessage = "Invalid Gemini API Key. Please check the key and try again.";
                }
            } else {
                errorMessage += ` - ${response.statusText}`;
            }
            console.error("API Error Data:", responseData);
            throw new Error(errorMessage);
        }
        
        if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            let blockDetails = responseData.promptFeedback.safetyRatings ? JSON.stringify(responseData.promptFeedback.safetyRatings) : 'No additional details.';
            if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].finishReason === 'SAFETY') {
                 blockDetails += ` Candidate finish reason: SAFETY.`;
            }
            throw new Error(`Content generation blocked by API. Reason: ${responseData.promptFeedback.blockReason}. Details: ${blockDetails}`);
        }

        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
            if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].finishReason && responseData.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`Content generation stopped prematurely. Finish Reason: ${responseData.candidates[0].finishReason}. Check safety ratings if available: ${JSON.stringify(responseData.candidates[0].safetyRatings)}`);
            }
            console.error("Unexpected API response structure or empty content from model " + GEMINI_MODEL_ID + ":", responseData);
            throw new Error('Failed to extract content from API response. Structure might have changed or content was not generated as expected from model ' + GEMINI_MODEL_ID + '.');
        }
        
        const rawTextOutput = responseData.candidates[0].content.parts[0].text;
        console.log(`Agent raw output starts with: "${rawTextOutput.substring(0,150)}..."`);
        
        return rawTextOutput;

    } catch (error) {
        console.error('Error in callAgentAPI:', error);
        throw error instanceof Error ? error : new Error(String(error.message || `An unknown network or API error occurred with model ${GEMINI_MODEL_ID}.`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    apiKeyInput = document.getElementById('apiKeyInput');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    generateButton = document.getElementById('generateButton');
    statusMessageDiv = document.getElementById('statusMessage');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');

    // --- Initial UI Setup & Event Listeners ---
    // Check if critical elements were found.
    const criticalElements = { apiKeyInput, charactersInput, audienceInput, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv };
    for (const elName in criticalElements) {
        if (!criticalElements[elName]) {
            console.error(`Error: ${elName} element not found in HTML! UI may not function correctly.`);
        }
    }

    // Load settings from Local Storage and attach listeners
    if (apiKeyInput) {
        apiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
        apiKeyInput.addEventListener('input', () => saveToLocalStorage(LS_API_KEY, apiKeyInput.value.trim()));
    }
    if (charactersInput) {
        charactersInput.value = loadFromLocalStorage(LS_CHARACTERS) || '';
        charactersInput.addEventListener('input', () => saveToLocalStorage(LS_CHARACTERS, charactersInput.value));
    }
    if (audienceInput) {
        audienceInput.value = loadFromLocalStorage(LS_AUDIENCE) || '';
        audienceInput.addEventListener('input', () => saveToLocalStorage(LS_AUDIENCE, audienceInput.value));
    }

    if (storyOutputDiv) {
        storyOutputDiv.textContent = 'Enter API Key, characters, audience, then click "Generate Story" to create a tale using the Story Circle!';
    }
    if (storyTitleDiv) {
        storyTitleDiv.textContent = '';
    }

    // --- Main Event Handler ---
    async function handleGenerateStory() {
        if (!apiKeyInput || !charactersInput || !audienceInput) {
            const missing = [
                !apiKeyInput && "API Key input",
                !charactersInput && "Characters input",
                !audienceInput && "Audience input"
            ].filter(Boolean).join(', ');
            displayError(`Cannot generate story: Missing form elements (${missing}). Please check the HTML or report this issue.`);
            return;
        }

        const currentApiKey = apiKeyInput.value.trim();
        if (!currentApiKey) {
            displayError('Please enter your Gemini API Key.');
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }
        // Save API key on attempt, in case 'input' event didn't cover all scenarios (e.g. paste)
        saveToLocalStorage(LS_API_KEY, currentApiKey);

        const charactersStr = charactersInput.value;
        const audienceStr = audienceInput.value;

        // Save other inputs on attempt too
        saveToLocalStorage(LS_CHARACTERS, charactersStr);
        saveToLocalStorage(LS_AUDIENCE, audienceStr);

        if (!charactersStr.trim()) {
            displayError('Please enter at least one character.');
            if (charactersInput) charactersInput.focus();
            return;
        }
        const parsedCharsArray = parseCharacters(charactersStr);
        if (parsedCharsArray.length === 0) {
             displayError('Please enter valid character descriptions (e.g., "brave dog, clever cat").');
             if (charactersInput) charactersInput.focus();
             return;
        }
        if (!audienceStr.trim()) {
            displayError('Please enter the target audience.');
            if (audienceInput) audienceInput.focus();
            return;
        }

        displayLoading(true, "Initializing Story Circle pipeline...");

        try {
            // Agent 1: Story Crafter
            displayLoading(true, "Step 1/5: Crafting initial Story Circle outline and draft...");
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, {
                charactersList: parsedCharsArray.join(', '),
                audience: audienceStr
            });
            const agent1Output_FullText = await callAgentAPI(agent1Prompt, currentApiKey);
            console.log("Agent 1 Output (first 500 chars):", agent1Output_FullText.substring(0, 500));

            // Agent 2: Story Reviewer
            displayLoading(true, "Step 2/5: Reviewing draft based on Story Circle...");
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_REVIEWER_TEMPLATE, {
                storyText: agent1Output_FullText
            });
            const agent2Output_ReviewText = await callAgentAPI(agent2Prompt, currentApiKey);
            console.log("Agent 2 Output (first 500 chars):", agent2Output_ReviewText.substring(0, 500));

            // Agent 3: Story Polisher & Rewriter
            displayLoading(true, "Step 3/5: Polishing story with Story Circle feedback...");
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_POLISHER_TEMPLATE, {
                draftText: agent1Output_FullText,
                reviewText: agent2Output_ReviewText
            });
            const agent3Output_Story = await callAgentAPI(agent3Prompt, currentApiKey);
            console.log("Agent 3 Output (first 500 chars):", agent3Output_Story.substring(0, 500));

            // Agent 4: Story Cleaner
            displayLoading(true, "Step 4/5: Cleaning up the story...");
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_CLEANER_TEMPLATE, {
                storyText: agent3Output_Story 
            });
            const agent4Output_CleanStory = await callAgentAPI(agent4Prompt, currentApiKey);
            console.log("Agent 4 Output (first 500 chars):", agent4Output_CleanStory.substring(0, 500));

            // Agent 5: Title Generator
            displayLoading(true, "Step 5/5: Generating a title...");
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_TITLER_TEMPLATE, {
                storyText: agent4Output_CleanStory 
            });
            const agent5Output_Title = await callAgentAPI(agent5Prompt, currentApiKey);
            console.log("Agent 5 Output (first 500 chars):", agent5Output_Title.substring(0, 500));

            displayOutput(agent5Output_Title.trim(), agent4Output_CleanStory.trim()); 

        } catch (error) {
            let userFriendlyMessage = error.message || 'An unknown error occurred during story generation.';
            if (error.message && (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid gemini api key"))) {
                 userFriendlyMessage = "Invalid Gemini API Key. Please check your API Key and try again.";
                 if (apiKeyInput) apiKeyInput.focus();
            } else if (error.message && error.message.includes("API Key is missing")) {
                userFriendlyMessage = "Gemini API Key is missing. Please enter it above and try again.";
                if (apiKeyInput) apiKeyInput.focus();
            }
            displayError(userFriendlyMessage);
        } finally {
            displayLoading(false);
        }
    }

    // --- Attach Event Listener to Generate Button ---
    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateStory);
    } else {
        displayError("Generate button not found. Cannot generate stories.");
    }
});