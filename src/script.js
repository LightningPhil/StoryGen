// --- Configuration ---
const GEMINI_API_KEY = "AIzaSyA9lyUpAMWlBQmVfc8mGRTn5xe8JSK-xyQ"; // Your hardcoded API Key
const GEMINI_MODEL_ID = "gemini-2.0-flash"; // << UPDATED MODEL ID

// --- Imports ---
import { STORY_CIRCLE_AND_CRAFT_GUIDE } from './prompts/story_circle_craft_guide.js';
import { PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE } from './prompts/agent1_story_crafter_template.js';
import { PROMPT_AGENT_2_REVIEWER_TEMPLATE } from './prompts/agent2_reviewer_template.js';
import { PROMPT_AGENT_3_POLISHER_TEMPLATE } from './prompts/agent3_polisher_template.js';

import { PROMPT_AGENT_4_CLEANER_TEMPLATE } from './prompts/agent4_cleaner_template.js';
import { PROMPT_AGENT_5_TITLER_TEMPLATE } from './prompts/agent5_titler_template.js';
import { PROMPT_ILLUSTRATOR_NOTES_TEMPLATE } from './prompts/illustrator_notes_template.js';


// --- DOM Element References ---
const charactersInput = document.getElementById('charactersInput');
const audienceInput = document.getElementById('audienceInput');
const wordCountMinInput = document.getElementById('wordCountMin');
const wordCountMaxInput = document.getElementById('wordCountMax');
const generateButton = document.getElementById('generateButton');
const statusMessageDiv = document.getElementById('statusMessage');
const storyTitleDiv = document.getElementById('storyTitle');
const storyOutputDiv = document.getElementById('storyOutput');

// --- UI Update Functions ---
function displayLoading(isLoading, message = '') {
    if (isLoading) {
        statusMessageDiv.textContent = message || 'Processing...';
        statusMessageDiv.className = 'loading';
        storyTitleDiv.textContent = ''; 
        storyOutputDiv.textContent = 'Your story will appear here...';
        generateButton.disabled = true;
    } else {
        if (statusMessageDiv.classList.contains('loading')) {
            statusMessageDiv.textContent = '';
            statusMessageDiv.className = '';
        }
        generateButton.disabled = false;
    }
}

function displayOutput(title, storyText) {
    storyTitleDiv.textContent = title;
    storyOutputDiv.textContent = storyText;
    statusMessageDiv.textContent = 'Story generated successfully!';
    statusMessageDiv.className = ''; 
    setTimeout(() => {
        if (statusMessageDiv.textContent === 'Story generated successfully!') {
            statusMessageDiv.textContent = '';
        }
    }, 5000);
}

function displayError(errorMessage) {
    statusMessageDiv.textContent = `Error: ${errorMessage}`;
    statusMessageDiv.className = 'error';
    storyTitleDiv.textContent = ''; 
    storyOutputDiv.textContent = 'Story generation failed.'; 
    console.error("Pipeline Error Details:", errorMessage); 
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
async function callAgentAPI(prompt) { // Removed expectJson parameter
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log(`Calling Agent with model ${GEMINI_MODEL_ID}. Prompt starts with: "${prompt.substring(0,150)}..."`);
    // console.debug("Full prompt for agent:", prompt);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
         generationConfig: { // Example generationConfig - adjust as needed
            // temperature: 0.7, 
            // maxOutputTokens: 8192, // Max for gemini-1.5-flash, check if 2.0 has different limits
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
        // console.debug("Full raw output from agent:", rawTextOutput);


        return rawTextOutput; // Return raw text directly

    } catch (error) {
        console.error('Error in callAgentAPI:', error);
        throw error instanceof Error ? error : new Error(String(error.message || `An unknown network or API error occurred with model ${GEMINI_MODEL_ID}.`));
    }
}

// --- Main Event Handler ---
async function handleGenerateStory() {
    const charactersStr = charactersInput.value;
    const audienceStr = audienceInput.value;
    const wordCountMin = parseInt(wordCountMinInput.value);
    const wordCountMax = parseInt(wordCountMaxInput.value);

    if (!charactersStr.trim()) {
        displayError('Please enter at least one character.');
        return;
    }
    const parsedCharsArray = parseCharacters(charactersStr);
    if (parsedCharsArray.length === 0) {
         displayError('Please enter valid character descriptions (e.g., "brave dog, clever cat").');
         return;
    }
    if (!audienceStr.trim()) {
        displayError('Please enter the target audience.');
        return;
    }

    if (isNaN(wordCountMin) || isNaN(wordCountMax) || wordCountMin < 500 || wordCountMax < 500 || wordCountMin > 5000 || wordCountMax > 5000 || wordCountMin > wordCountMax) {
        displayError('Please enter valid word count range (500-5000 words, min must be less than or equal to max).');
        return;
    }

    const wordsPerStep = Math.floor((wordCountMin + wordCountMax) / 16);

    displayLoading(true, "Initializing Story Circle pipeline...");

    try {
        // Agent 1: Story Crafter
        displayLoading(true, "Step 1/5: Crafting initial Story Circle outline and draft...");
        const agent1Prompt = constructAgentPrompt(PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, {
            charactersList: parsedCharsArray.join(', '),
            audience: audienceStr,
            wordCountMin: wordCountMin,
            wordCountMax: wordCountMax,
            wordsPerStep: wordsPerStep
        });
        const agent1Output_FullText = await callAgentAPI(agent1Prompt);
        console.log("Agent 1 Output (first 500 chars):", agent1Output_FullText.substring(0, 500));

        // Agent 2: Story Reviewer
        displayLoading(true, "Step 2/5: Reviewing draft based on Story Circle...");
        const agent2Prompt = constructAgentPrompt(PROMPT_AGENT_2_REVIEWER_TEMPLATE, {
            storyText: agent1Output_FullText,
            wordCountMin: wordCountMin,
            wordCountMax: wordCountMax,
            wordsPerStep: wordsPerStep
        });
        const agent2Output_ReviewText = await callAgentAPI(agent2Prompt);
        console.log("Agent 2 Output (first 500 chars):", agent2Output_ReviewText.substring(0, 500));


        // Agent 3: Story Polisher & Rewriter (NO JSON)
        displayLoading(true, "Step 3/5: Polishing story with Story Circle feedback...");
        const agent3Prompt = constructAgentPrompt(PROMPT_AGENT_3_POLISHER_TEMPLATE, {
            draftText: agent1Output_FullText,
            reviewText: agent2Output_ReviewText,
            wordCountMin: wordCountMin,
            wordCountMax: wordCountMax,
            wordsPerStep: wordsPerStep
        });
        const agent3Output_Story = await callAgentAPI(agent3Prompt);
        console.log("Agent 3 Output (first 500 chars):", agent3Output_Story.substring(0, 500));


        // Agent 4: Story Cleaner
        displayLoading(true, "Step 4/5: Cleaning up the story...");
        const agent4Prompt = constructAgentPrompt(PROMPT_AGENT_4_CLEANER_TEMPLATE, {
            storyText: agent3Output_Story // Correct: Pass agent3Output_Story to Agent 4
        });
        const agent4Output_CleanStory = await callAgentAPI(agent4Prompt);
        console.log("Agent 4 Output (first 500 chars):", agent4Output_CleanStory.substring(0, 500));


        // Agent 5: Title Generator
        displayLoading(true, "Step 5/5: Generating a title...");
        const agent5Prompt = constructAgentPrompt(PROMPT_AGENT_5_TITLER_TEMPLATE, {
            storyText: agent4Output_CleanStory // Correct: Pass cleaned story to title generator
        });
        const agent5Output_Title = await callAgentAPI(agent5Prompt);
        console.log("Agent 5 Output (first 500 chars):", agent5Output_Title.substring(0, 500));


        displayOutput(agent5Output_Title, agent4Output_CleanStory); // Correct: Display title and cleaned story

    } catch (error) {
        displayError(error.message || 'An unknown error occurred during story generation.');
    } finally {
        displayLoading(false);
    }
}

// --- Attach Event Listener ---
generateButton.addEventListener('click', handleGenerateStory);

// Initial message for story output
storyOutputDiv.textContent = 'Enter characters, audience, and word count, then click "Generate Story" to create a tale using the Story Circle!';
storyTitleDiv.textContent = '';