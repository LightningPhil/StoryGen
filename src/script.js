// --- Configuration ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.0-flash"; // Updated default, -latest often points to newest stable
const AVAILABLE_MODELS = {
    "gemini-2.5-flash": "Gemini-2.5-Flash",
    "gemini-2.0-flash": "Gemini-2.0-flash",
    "gemini-1.5-flash": "Gemini-1.5-Flash"
    // Add other models here if they become available and you want to support them
};

// --- Local Storage Keys ---
const LS_API_KEY = 'geminiApiKey_storyCircle';
const LS_CHARACTERS = 'storyCharacters_storyCircle';
const LS_AUDIENCE = 'storyAudience_storyCircle';
const LS_SELECTED_FRAMEWORK = 'storySelectedFramework_storyCircle';
const LS_SELECTED_MODEL = 'geminiSelectedModel_storyCircle'; // New LS Key for model

// --- Imports ---
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import {
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_REVIEWER_TEMPLATE,
    PROMPT_AGENT_3_POLISHER_TEMPLATE,
    PROMPT_AGENT_4_CLEANER_TEMPLATE,
    PROMPT_AGENT_5_TITLER_TEMPLATE,
} from './prompts/agent_prompts.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton, modalModelSelect; // Added modalModelSelect


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
        statusMessageDiv.className = 'success';
        setTimeout(() => {
            if (statusMessageDiv && statusMessageDiv.classList.contains('success')) {
                statusMessageDiv.textContent = '';
                statusMessageDiv.className = '';
            }
        }, 4000);
    }
}

function displayError(errorMessage) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = `Error: ${errorMessage}`;
        statusMessageDiv.className = 'error';
    }
    if (storyTitleDiv) storyTitleDiv.textContent = '';
    console.error("Pipeline Error Details:", errorMessage);
}

function updateFrameworkSummaryDisplay() {
    if (craftingFrameworkSelect && frameworkSummaryDiv) {
        const selectedFrameworkKey = craftingFrameworkSelect.value;
        const summary = STORY_FRAMEWORK_SUMMARIES[selectedFrameworkKey] || "No summary available for this framework.";
        frameworkSummaryDiv.textContent = summary;
    } else if (frameworkSummaryDiv) {
        frameworkSummaryDiv.textContent = "Select a framework to see its summary.";
    }
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
    return prompt;
}

// --- Gemini API Call Function ---
async function callAgentAPI(prompt, currentApiKey, selectedModelId) { // Added selectedModelId
    if (!currentApiKey) {
        console.error("API Key is missing in callAgentAPI");
        throw new Error("Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.");
    }
    if (!selectedModelId) {
        console.error("Gemini Model ID is missing in callAgentAPI");
        throw new Error("Gemini Model not selected. Please select a model in Settings (⚙️).");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:generateContent?key=${currentApiKey}`;
    
    console.log(`Calling Agent with model ${selectedModelId}. Prompt starts with: "${prompt.substring(0,150)}..."`);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {}
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const responseData = await response.json();

        if (!response.ok) {
            let errorMessage = `API request failed with status ${response.status} using model ${selectedModelId}`;
            if (responseData && responseData.error && responseData.error.message) {
                errorMessage += ` - ${responseData.error.message}`;
                 if (response.status === 400 && responseData.error.message.toLowerCase().includes("api key not valid")) {
                    errorMessage = `Invalid Gemini API Key (model: ${selectedModelId}). Please check the key in Settings (⚙️) and try again.`;
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
            throw new Error(`Content generation blocked by API (model: ${selectedModelId}). Reason: ${responseData.promptFeedback.blockReason}. Details: ${blockDetails}`);
        }

        if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content || !responseData.candidates[0].content.parts || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
            if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].finishReason && responseData.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`Content generation stopped prematurely (model: ${selectedModelId}). Finish Reason: ${responseData.candidates[0].finishReason}. Check safety ratings if available: ${JSON.stringify(responseData.candidates[0].safetyRatings)}`);
            }
            console.error("Unexpected API response structure or empty content from model " + selectedModelId + ":", responseData);
            throw new Error('Failed to extract content from API response. Structure might have changed or content was not generated as expected from model ' + selectedModelId + '.');
        }
        
        const rawTextOutput = responseData.candidates[0].content.parts[0].text;
        console.log(`Agent raw output from model ${selectedModelId} starts with: "${rawTextOutput.substring(0,150)}..."`);
        return rawTextOutput;

    } catch (error) {
        console.error(`Error in callAgentAPI with model ${selectedModelId}:`, error);
        throw error instanceof Error ? error : new Error(String(error.message || `An unknown network or API error occurred with model ${selectedModelId}.`));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect'); // New
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    statusMessageDiv = document.getElementById('statusMessage');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');

    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    closeSettingsModalButton = document.getElementById('closeSettingsModal');
    saveSettingsButton = document.getElementById('saveSettingsButton');

    // --- Initial UI Setup & Event Listeners ---
    const criticalElements = { modalApiKeyInput, modalModelSelect, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, statusMessageDiv, storyTitleDiv, storyOutputDiv, settingsModal, settingsButton, closeSettingsModalButton, saveSettingsButton };
    for (const elName in criticalElements) {
        if (!criticalElements[elName]) {
            console.error(`Error: ${elName} element not found in HTML! UI may not function correctly.`);
        }
    }
    
    // Populate Model Select Dropdown in Modal
    if (modalModelSelect) {
        for (const modelId in AVAILABLE_MODELS) {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = AVAILABLE_MODELS[modelId];
            modalModelSelect.appendChild(option);
        }
        // Load saved model or set default
        const savedModel = loadFromLocalStorage(LS_SELECTED_MODEL);
        if (savedModel && AVAILABLE_MODELS[savedModel]) {
            modalModelSelect.value = savedModel;
        } else {
            modalModelSelect.value = DEFAULT_GEMINI_MODEL_ID; // Default if nothing saved or invalid
        }
    }

    if (modalApiKeyInput) {
        modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
    }

    if (settingsButton && settingsModal && closeSettingsModalButton && saveSettingsButton && modalApiKeyInput && modalModelSelect) {
        settingsButton.addEventListener('click', () => {
            // Load current settings into modal before showing
            modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
            const savedModel = loadFromLocalStorage(LS_SELECTED_MODEL);
            modalModelSelect.value = (savedModel && AVAILABLE_MODELS[savedModel]) ? savedModel : DEFAULT_GEMINI_MODEL_ID;
            
            settingsModal.style.display = 'block';
            modalApiKeyInput.focus();
        });
        closeSettingsModalButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        saveSettingsButton.addEventListener('click', () => {
            saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value.trim());
            saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value); // Save selected model
            settingsModal.style.display = 'none';
             if (statusMessageDiv) {
                statusMessageDiv.textContent = 'Settings saved successfully.';
                statusMessageDiv.className = 'success'; 
                setTimeout(() => {
                    if (statusMessageDiv && statusMessageDiv.classList.contains('success')) {
                        statusMessageDiv.textContent = '';
                        statusMessageDiv.className = '';
                    }
                }, 3000);
            }
        });
        window.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && settingsModal.style.display === 'block') {
                settingsModal.style.display = 'none';
            }
        });
    }


    if (craftingFrameworkSelect) {
        Object.keys(STORY_CRAFTING_GUIDES).forEach(frameworkName => {
            const option = document.createElement('option');
            option.value = frameworkName;
            option.textContent = frameworkName;
            craftingFrameworkSelect.appendChild(option);
        });
        const savedFramework = loadFromLocalStorage(LS_SELECTED_FRAMEWORK);
        if (savedFramework && STORY_CRAFTING_GUIDES[savedFramework]) {
            craftingFrameworkSelect.value = savedFramework;
        } else if (Object.keys(STORY_CRAFTING_GUIDES).length > 0) {
            craftingFrameworkSelect.value = Object.keys(STORY_CRAFTING_GUIDES)[0];
        }
        craftingFrameworkSelect.addEventListener('change', () => {
            saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
            updateFrameworkSummaryDisplay();
        });
        updateFrameworkSummaryDisplay();
    } else if (frameworkSummaryDiv) {
        frameworkSummaryDiv.textContent = "Framework selection dropdown is missing.";
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
        storyOutputDiv.textContent = 'Describe your characters, choose an audience and a story framework, then click "Generate Story".\n\nConfigure your Gemini API Key and Model in Settings (⚙️ icon in the top right).';
    }
    if (storyTitleDiv) {
        storyTitleDiv.textContent = '';
    }

    async function handleGenerateStory() {
        if (!modalApiKeyInput || !modalModelSelect || !charactersInput || !audienceInput || !craftingFrameworkSelect) {
            const missing = [
                !modalApiKeyInput && "API Key input (in modal)",
                !modalModelSelect && "Model select (in modal)",
                !charactersInput && "Characters input",
                !audienceInput && "Audience input",
                !craftingFrameworkSelect && "Framework select"
            ].filter(Boolean).join(', ');
            displayError(`Cannot generate story: Missing form elements (${missing}). Please check the HTML or report this issue.`);
            return;
        }

        const currentApiKey = modalApiKeyInput.value.trim(); // Still get from modal for consistency, even if saved
        const selectedModelId = modalModelSelect.value; // Get selected model from modal
        
        // It's better to rely on the loaded values from local storage for generation
        // or prompt user to save settings if they are not set.
        const storedApiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const storedModelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;


        if (!storedApiKey) {
            displayError('Please enter your Gemini API Key in Settings (⚙️).');
            if (settingsModal && modalApiKeyInput) {
                settingsModal.style.display = 'block';
                modalApiKeyInput.focus();
            }
            return;
        }
        if (!storedModelId || !AVAILABLE_MODELS[storedModelId]) {
             displayError('Please select a valid Gemini Model in Settings (⚙️).');
            if (settingsModal && modalModelSelect) {
                settingsModal.style.display = 'block';
                modalModelSelect.focus();
            }
            return;
        }


        const charactersStr = charactersInput.value;
        const audienceStr = audienceInput.value;
        const selectedFrameworkKey = craftingFrameworkSelect.value;
        const selectedCraftGuideText = STORY_CRAFTING_GUIDES[selectedFrameworkKey];

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
        if (!selectedCraftGuideText) {
            displayError('Invalid story crafting framework selected. Please try again.');
            if(craftingFrameworkSelect) craftingFrameworkSelect.focus();
            return;
        }

        if (statusMessageDiv) {
            statusMessageDiv.textContent = '';
            statusMessageDiv.className = '';
        }
        displayLoading(true, `Initializing story generation with ${selectedFrameworkKey} using ${AVAILABLE_MODELS[storedModelId]}...`);

        try {
            displayLoading(true, `Step 1/5: Crafting initial story draft using ${selectedFrameworkKey}...`);
            const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, {
                charactersList: parsedCharsArray.join(', '),
                audience: audienceStr,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            });
            const agent1Output_FullText = await callAgentAPI(agent1Prompt, storedApiKey, storedModelId);
            console.log("Agent 1 Output (first 500 chars):", agent1Output_FullText.substring(0, 500));

            displayLoading(true, `Step 2/5: Reviewing draft based on ${selectedFrameworkKey}...`);
            const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_REVIEWER_TEMPLATE, {
                storyText: agent1Output_FullText,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            });
            const agent2Output_ReviewText = await callAgentAPI(agent2Prompt, storedApiKey, storedModelId);
            console.log("Agent 2 Output (first 500 chars):", agent2Output_ReviewText.substring(0, 500));

            displayLoading(true, `Step 3/5: Polishing story with feedback (using ${selectedFrameworkKey})...`);
            const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_POLISHER_TEMPLATE, {
                draftText: agent1Output_FullText,
                reviewText: agent2Output_ReviewText,
                CRAFT_GUIDE_TEXT: selectedCraftGuideText
            });
            const agent3Output_Story = await callAgentAPI(agent3Prompt, storedApiKey, storedModelId);
            console.log("Agent 3 Output (first 500 chars):", agent3Output_Story.substring(0, 500));

            displayLoading(true, "Step 4/5: Cleaning up the story...");
            const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_CLEANER_TEMPLATE, {
                storyText: agent3Output_Story 
            });
            const agent4Output_CleanStory = await callAgentAPI(agent4Prompt, storedApiKey, storedModelId);
            console.log("Agent 4 Output (first 500 chars):", agent4Output_CleanStory.substring(0, 500));

            displayLoading(true, "Step 5/5: Generating a title...");
            const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_TITLER_TEMPLATE, {
                storyText: agent4Output_CleanStory 
            });
            const agent5Output_Title = await callAgentAPI(agent5Prompt, storedApiKey, storedModelId);
            console.log("Agent 5 Output (first 500 chars):", agent5Output_Title.substring(0, 500));

            displayOutput(agent5Output_Title.trim(), agent4Output_CleanStory.trim()); 

        } catch (error) {
            let userFriendlyMessage = error.message || 'An unknown error occurred during story generation.';
            // Error messages already include model ID if it's part of the API call error
            if (error.message && (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid gemini api key"))) {
                 userFriendlyMessage = `Invalid Gemini API Key. Please check your API Key in Settings (⚙️) and try again.`; // Simplified as model is part of error from API call
                 if (settingsModal && modalApiKeyInput) {
                    settingsModal.style.display = 'block';
                    modalApiKeyInput.focus();
                 }
            } else if (error.message && error.message.includes("API Key is missing")) {
                userFriendlyMessage = `Gemini API Key is missing. Please enter it via Settings (⚙️) and try again.`;
                 if (settingsModal && modalApiKeyInput) {
                    settingsModal.style.display = 'block';
                    modalApiKeyInput.focus();
                 }
            } else if (error.message && error.message.includes("Model not selected")) {
                 if (settingsModal && modalModelSelect) {
                    settingsModal.style.display = 'block';
                    modalModelSelect.focus();
                 }
            }
            displayError(userFriendlyMessage);
        } finally {
            displayLoading(false);
        }
    }

    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateStory);
    } else {
        displayError("Generate button not found. Cannot generate stories.");
    }
});