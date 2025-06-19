// src/script.js

// --- Configuration (Constants) ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.5-flash"; 
const AVAILABLE_MODELS = { 
    "gemini-2.5-flash": "Gemini-2.5-Flash",
    "gemini-2.0-flash": "Gemini-2.0-Flash",
    "gemini-1.5-flash": "Gemini-1.5-Flash"
};
const DEFAULT_MIN_API_INTERVAL_S = 5; 
const DEFAULT_READING_AGE_MIN = 5; 
const DEFAULT_READING_AGE_MAX = 12; 
const DEFAULT_TARGET_READING_AGE = 7; 

const STORY_FONT_SIZE_STEP = 0.1; 
const MIN_STORY_FONT_SIZE_REM = 0.7;
const MAX_STORY_FONT_SIZE_REM = 2.0;
const DEFAULT_STORY_FONT_SIZE_REM = 1.0; 

// --- Local Storage Keys (Constants) ---
import { 
    LS_API_KEY, LS_CHARACTERS, LS_AUDIENCE, LS_SELECTED_FRAMEWORK, LS_SELECTED_MODEL,
    LS_USE_ENGINE_SUGGESTIONS, LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL, 
    LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, 
    LS_READING_AGE_MIN, LS_READING_AGE_MAX, LS_ENABLE_CONSOLIDATOR, // Added LS_ENABLE_CONSOLIDATOR
    saveToLocalStorage, loadFromLocalStorage 
} from './localStorage.js';

// --- Imports from Modules ---
import appState from './appState.js'; 
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import {
    READING_AGE_ADJUSTMENT_TEXT_TEMPLATE, 
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
    PROMPT_AGENT_3_REVIEWER_TEMPLATE,
    PROMPT_AGENT_4_POLISHER_TEMPLATE,
    PROMPT_AGENT_5_CLEANER_TEMPLATE,
    PROMPT_AGENT_6_TITLER_TEMPLATE,
    PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE, // Added PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE
} from './prompts/agent_prompts.js';
import { callAgentAPI } from './api.js';
import { parseCharacters, constructAgentPrompt, countWords } from './utils.js'; 
import { 
    initUIElements,
    updateStatusInStoryOutput, 
    clearStoryOutput, 
    displayFinalStoryOutput, 
    displayErrorInStoryOutput, 
    showTemporaryToast, 
    updateFrameworkSummaryDisplay, 
    updateSuggestionsTextareaStyle,
    disableMainControls, 
    enableMainControls,
    applyStoryFontSize 
} from './ui.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, cancelSettingsButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton, decreaseFontButton, increaseFontButton; 
let useEngineSuggestionsCheckbox, userSuggestionsTextarea;
let enableReadingAgeAdjustmentCheckbox, targetReadingAgeSlider, /* targetReadingAgeValueDisplay removed */ readingAgeSliderContainer; 
let readingAgeMinInput, readingAgeMaxInput; 
let enableConsolidatorCheckbox; // New checkbox

// --- Application State for Font Size ---
let currentStoryFontSizeRem = DEFAULT_STORY_FONT_SIZE_REM;

// --- Agent Definitions (Base) ---
const AGENT_1_CRAFTER_DEF = { name: "Agent 1: Story Crafter", promptTemplate: PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, dataKeys: ['charactersList', 'audience', 'USER_SUGGESTIONS_TEXT', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT'], outputKey: 'storyText' };
const AGENT_2_ELABORATOR_DEF = { name: "Agent 2: Elaborator", promptTemplate: PROMPT_AGENT_2_ELABORATOR_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT'], outputKey: 'storyText' };
const AGENT_C_CONSOLIDATOR_DEF = { name: "Agent C: Consolidator", promptTemplate: PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT'], outputKey: 'storyText' };
const AGENT_3_REVIEWER_DEF = { name: "Agent 3: Reviewer", promptTemplate: PROMPT_AGENT_3_REVIEWER_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT'], outputKey: 'reviewText' };
const AGENT_4_POLISHER_DEF = { name: "Agent 4: Polisher", promptTemplate: PROMPT_AGENT_4_POLISHER_TEMPLATE, dataKeys: ['storyText', 'reviewText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT'], outputKey: 'storyText' };
const AGENT_5_CLEANER_DEF = { name: "Agent 5: Cleaner", promptTemplate: PROMPT_AGENT_5_CLEANER_TEMPLATE, dataKeys: ['storyText'], outputKey: 'storyText' };
const AGENT_6_TITLER_DEF = { name: "Agent 6: Titler", promptTemplate: PROMPT_AGENT_6_TITLER_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE'], outputKey: 'titleText' };


// --- Dynamic Pipeline Configuration Functions ---
function getStoryGenerationPipelineConfig(enableConsolidator) {
    const pipeline = [
        AGENT_1_CRAFTER_DEF,
        AGENT_2_ELABORATOR_DEF,
    ];
    if (enableConsolidator) {
        pipeline.push(AGENT_C_CONSOLIDATOR_DEF);
    }
    pipeline.push(AGENT_3_REVIEWER_DEF);
    pipeline.push(AGENT_4_POLISHER_DEF);
    if (enableConsolidator) {
        pipeline.push(AGENT_C_CONSOLIDATOR_DEF);
    }
    pipeline.push(AGENT_5_CLEANER_DEF);
    pipeline.push(AGENT_6_TITLER_DEF);
    
    return pipeline.map((agent, index) => ({ ...agent, step: `${index + 1}/${pipeline.length}` }));
}

function getElaborationPipelineConfig(enableConsolidator) {
    // For elaboration, let's decide if consolidator makes sense. 
    // Usually, elaboration is about adding. If we consolidate here, it might undo elaboration.
    // For now, let's keep consolidator out of the direct elaboration pipeline,
    // or make it a different toggle for "Refine after Elaboration".
    // Keeping it simple: consolidator is part of the main generation flow if toggled.
    // If user wants to consolidate an already elaborated story, they'd regenerate with consolidator on.
    // Or, we can add a single consolidator step at the end of elaboration.
    // Let's add one at the end for this implementation if enabled.
    const pipeline = [
        AGENT_2_ELABORATOR_DEF, // This is the elaborator from the original code, not a new one
        AGENT_3_REVIEWER_DEF,
        AGENT_4_POLISHER_DEF,
    ];
    if (enableConsolidator) {
        pipeline.push(AGENT_C_CONSOLIDATOR_DEF);
    }
    pipeline.push(AGENT_5_CLEANER_DEF); // Cleaner always last before titling (if titling was here)

    return pipeline.map((agent, index) => ({ ...agent, step: `${index + 1}/${pipeline.length}` }));
}


function updateTargetReadingAgeSliderDOMState() {
    if (!targetReadingAgeSlider || !readingAgeMinInput || !readingAgeMaxInput || /* !targetReadingAgeValueDisplay removed */ !enableReadingAgeAdjustmentCheckbox || !readingAgeSliderContainer) return;
    
    const minAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString(), 10);
    const maxAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString(), 10);
    
    targetReadingAgeSlider.min = minAge.toString();
    targetReadingAgeSlider.max = maxAge.toString();
    
    let currentValue = parseInt(targetReadingAgeSlider.value, 10);
    if (isNaN(currentValue) || currentValue < minAge) currentValue = minAge;
    if (currentValue > maxAge) currentValue = maxAge;
    targetReadingAgeSlider.value = currentValue.toString();
    
    // targetReadingAgeValueDisplay.textContent = currentValue.toString(); // Removed
    
    const isEnabled = enableReadingAgeAdjustmentCheckbox.checked;
    targetReadingAgeSlider.disabled = !isEnabled;
    readingAgeSliderContainer.classList.toggle('disabled', !isEnabled);
}

document.addEventListener('DOMContentLoaded', () => {
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    minApiIntervalInput = document.getElementById('minApiIntervalInput'); 
    readingAgeMinInput = document.getElementById('readingAgeMinInput'); 
    readingAgeMaxInput = document.getElementById('readingAgeMaxInput'); 
    downloadChatLogButton = document.getElementById('downloadChatLogButton');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    useEngineSuggestionsCheckbox = document.getElementById('useEngineSuggestionsCheckbox');
    userSuggestionsTextarea = document.getElementById('userSuggestionsTextarea');
    enableReadingAgeAdjustmentCheckbox = document.getElementById('enableReadingAgeAdjustmentCheckbox'); 
    targetReadingAgeSlider = document.getElementById('targetReadingAgeSlider'); 
    // targetReadingAgeValueDisplay = document.getElementById('targetReadingAgeValue'); // Removed
    readingAgeSliderContainer = document.getElementById('readingAgeSliderContainer'); 
    enableConsolidatorCheckbox = document.getElementById('enableConsolidatorCheckbox'); // New
    craftingFrameworkSelect = document.getElementById('craftingFrameworkSelect');
    frameworkSummaryDiv = document.getElementById('frameworkSummary');
    generateButton = document.getElementById('generateButton');
    storyTitleDiv = document.getElementById('storyTitle');
    storyOutputDiv = document.getElementById('storyOutput');
    copyStoryButton = document.getElementById('copyStoryButton');
    saveStoryButton = document.getElementById('saveStoryButton');
    elaborateStoryButton = document.getElementById('elaborateStoryButton');
    decreaseFontButton = document.getElementById('decreaseFontButton'); 
    increaseFontButton = document.getElementById('increaseFontButton'); 
    settingsModal = document.getElementById('settingsModal');
    settingsButton = document.getElementById('settingsButton');
    cancelSettingsButton = document.getElementById('cancelSettingsButton');
    saveSettingsButton = document.getElementById('saveSettingsButton');

    if (!modalApiKeyInput || !charactersInput || !audienceInput || !craftingFrameworkSelect || !generateButton || !storyOutputDiv || !settingsModal || !settingsButton || !saveSettingsButton || !modalModelSelect || !storyTitleDiv || !useEngineSuggestionsCheckbox || !userSuggestionsTextarea || !enableReadingAgeAdjustmentCheckbox || !targetReadingAgeSlider || !readingAgeSliderContainer || !decreaseFontButton || !increaseFontButton || !enableConsolidatorCheckbox) {
        console.error("Critical UI elements are missing. Application may not function correctly.");
        if (storyOutputDiv) storyOutputDiv.textContent = "Error: Critical UI elements missing. Check console.";
        return;
    }
    
    initUIElements({ 
        storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton,
        decreaseFontButton, increaseFontButton, 
        craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea
    });

    applyStoryFontSize(currentStoryFontSizeRem);

    if (storyOutputDiv) storyOutputDiv.textContent = 'Welcome! Describe your characters, choose an audience and a story framework, then click "Generate Story".\n\nConfigure your Gemini API Key and Model in Settings (⚙️ icon in the top right).';
    enableMainControls();

    Object.keys(STORY_CRAFTING_GUIDES).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        craftingFrameworkSelect.appendChild(option);
    });
    const storedFramework = loadFromLocalStorage(LS_SELECTED_FRAMEWORK);
    if (storedFramework && STORY_CRAFTING_GUIDES[storedFramework]) {
        craftingFrameworkSelect.value = storedFramework;
    }
    updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES); 
    craftingFrameworkSelect.addEventListener('change', () => {
        updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
    });
    
    modalModelSelect.innerHTML = ''; 
    Object.entries(AVAILABLE_MODELS).forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        modalModelSelect.appendChild(option);
    });
    modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;

    modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
    charactersInput.value = loadFromLocalStorage(LS_CHARACTERS) || '';
    audienceInput.value = loadFromLocalStorage(LS_AUDIENCE) || 'children aged 5-7';
    minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
    
    useEngineSuggestionsCheckbox.checked = (loadFromLocalStorage(LS_USE_ENGINE_SUGGESTIONS) === 'true');
    userSuggestionsTextarea.value = loadFromLocalStorage(LS_USER_SUGGESTIONS) || '';
    updateSuggestionsTextareaStyle();

    enableReadingAgeAdjustmentCheckbox.checked = (loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED) === 'true');
    readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
    readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
    targetReadingAgeSlider.value = loadFromLocalStorage(LS_TARGET_READING_AGE) || DEFAULT_TARGET_READING_AGE.toString();
    updateTargetReadingAgeSliderDOMState(); 

    enableConsolidatorCheckbox.checked = (loadFromLocalStorage(LS_ENABLE_CONSOLIDATOR) === 'true'); // Load consolidator state
    enableConsolidatorCheckbox.addEventListener('change', () => { // Save consolidator state
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, enableConsolidatorCheckbox.checked.toString());
    });


    useEngineSuggestionsCheckbox.addEventListener('change', () => {
        updateSuggestionsTextareaStyle();
        saveToLocalStorage(LS_USE_ENGINE_SUGGESTIONS, useEngineSuggestionsCheckbox.checked.toString());
    });
    userSuggestionsTextarea.addEventListener('input', () => saveToLocalStorage(LS_USER_SUGGESTIONS, userSuggestionsTextarea.value));
    
    enableReadingAgeAdjustmentCheckbox.addEventListener('change', () => {
        updateTargetReadingAgeSliderDOMState();
        saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, enableReadingAgeAdjustmentCheckbox.checked.toString());
    });
    targetReadingAgeSlider.addEventListener('input', () => {
        // if (targetReadingAgeValueDisplay) targetReadingAgeValueDisplay.textContent = targetReadingAgeSlider.value; // Removed
    });
    targetReadingAgeSlider.addEventListener('change', () => saveToLocalStorage(LS_TARGET_READING_AGE, targetReadingAgeSlider.value));

    readingAgeMinInput.addEventListener('change', () => {
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value);
        updateTargetReadingAgeSliderDOMState();
    });
    readingAgeMaxInput.addEventListener('change', () => {
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        updateTargetReadingAgeSliderDOMState();
    });

    settingsButton.addEventListener('click', () => {
        modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || ''; 
        minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
        readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
        readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
        settingsModal.classList.add('active');
    });
    cancelSettingsButton.addEventListener('click', () => settingsModal.classList.remove('active'));
    saveSettingsButton.addEventListener('click', () => {
        saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value);
        saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
        saveToLocalStorage(LS_MIN_API_INTERVAL, minApiIntervalInput.value);
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value); 
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        updateTargetReadingAgeSliderDOMState(); 
        settingsModal.classList.remove('active');
        showTemporaryToast("Settings saved!", "success");
    });
    
    downloadChatLogButton.addEventListener('click', () => {
        const logData = JSON.stringify(appState.lastRunChatLog, null, 2);
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `story_generator_chat_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showTemporaryToast("Chat log downloaded.", "info");
    });

    copyStoryButton.addEventListener('click', () => {
        if (appState.latestGeneratedStoryText) {
            navigator.clipboard.writeText(appState.latestGeneratedStoryText)
                .then(() => showTemporaryToast("Story copied to clipboard!", "success"))
                .catch(err => {
                    console.error("Failed to copy story: ", err);
                    showTemporaryToast("Failed to copy story. See console.", "error");
                });
        }
    });

    saveStoryButton.addEventListener('click', () => {
        if (appState.latestGeneratedStoryText) {
            const title = appState.latestGeneratedStoryTitle || "Untitled Story";
            const textToSave = `Title: ${title}\n\n${appState.latestGeneratedStoryText}`;
            const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showTemporaryToast("Story saved as .txt file!", "success");
        }
    });

    increaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem + STORY_FONT_SIZE_STEP;
        if (newSize > MAX_STORY_FONT_SIZE_REM) {
            newSize = MAX_STORY_FONT_SIZE_REM;
        }
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });

    decreaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem - STORY_FONT_SIZE_STEP;
        if (newSize < MIN_STORY_FONT_SIZE_REM) {
            newSize = MIN_STORY_FONT_SIZE_REM;
        }
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });


    charactersInput.addEventListener('input', () => saveToLocalStorage(LS_CHARACTERS, charactersInput.value));
    audienceInput.addEventListener('input', () => saveToLocalStorage(LS_AUDIENCE, audienceInput.value));

    function gatherPipelineInputs() {
        const apiKey = loadFromLocalStorage(LS_API_KEY) || '';
        const modelId = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        const minApiIntervalSeconds = parseInt(loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString(), 10);
        const minApiIntervalMs = (isNaN(minApiIntervalSeconds) || minApiIntervalSeconds < 0 ? DEFAULT_MIN_API_INTERVAL_S : minApiIntervalSeconds) * 1000;
        
        const audience = audienceInput.value.trim() || "children";
        const frameworkKey = craftingFrameworkSelect.value;
        const craftGuideText = STORY_CRAFTING_GUIDES[frameworkKey] || ""; 

        let userSuggestionsText = ""; 
        if (useEngineSuggestionsCheckbox.checked) {
            userSuggestionsText = "User has opted for the story engine to decide on specific suggestions if any are needed. Focus on the core request and framework.";
        } else {
            const suggestions = userSuggestionsTextarea.value.trim();
            if (suggestions) {
                userSuggestionsText = `User Suggestions (please incorporate these if they align with the story framework and goal):\n${suggestions}`;
            } else {
                userSuggestionsText = ""; 
            }
        }
        
        let readingAgeNote = ""; 
        if (enableReadingAgeAdjustmentCheckbox.checked) { 
            const targetAge = targetReadingAgeSlider.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        const enableConsolidator = enableConsolidatorCheckbox.checked; // Get consolidator state

        return { 
            apiKey, 
            modelId, 
            minApiIntervalMs, 
            audience, 
            CRAFT_GUIDE_TEXT: craftGuideText, 
            READING_AGE_NOTE: readingAgeNote, 
            USER_SUGGESTIONS_TEXT: userSuggestionsText,
            enableConsolidator // Pass consolidator state
        };
    }

    async function runPipeline(pipelineConfig, pipelineData, commonInputs) {
        let currentPipelineData = { ...pipelineData }; 

        for (const agentDef of pipelineConfig) {
            // Use agentDef.step which is now pre-calculated as "X/Y"
            updateStatusInStoryOutput(`Step ${agentDef.step}: ${agentDef.name.substring(agentDef.name.indexOf(':') + 2).replace('(Elaboration Cycle)', '').trim().replace('Story ', '')}...\n`);
            
            const agentDataObject = {};

            agentDef.dataKeys.forEach(key => {
                if (commonInputs.hasOwnProperty(key)) {
                    agentDataObject[key] = commonInputs[key];
                } else if (currentPipelineData.hasOwnProperty(key)) {
                    agentDataObject[key] = currentPipelineData[key];
                } else {
                    console.warn(`Data key "${key}" for agent "${agentDef.name}" not found in commonInputs or pipelineData. Using empty string.`);
                    agentDataObject[key] = ''; 
                }
            });
            
            const currentPrompt = constructAgentPrompt(agentDef.promptTemplate, agentDataObject);
            
            const agentOutput = await callAgentAPI(
                currentPrompt, 
                commonInputs.apiKey, 
                commonInputs.modelId, 
                agentDef.name, 
                0, 
                appState.lastRunChatLog, 
                storyOutputDiv, 
                commonInputs.minApiIntervalMs
            );

            if (agentDef.outputKey) {
                currentPipelineData[agentDef.outputKey] = agentOutput;
            } else {
                currentPipelineData.storyText = agentOutput; 
            }
        }
        return currentPipelineData;
    }

    async function handleGenerateStory() {
        appState.clearChatLog(); 
        clearStoryOutput(); 
        disableMainControls();
        appState.latestGeneratedStoryText = ""; 
        appState.latestGeneratedStoryTitle = "";

        const commonInputs = gatherPipelineInputs();

        if (!commonInputs.apiKey) {
            displayErrorInStoryOutput("API Key is missing. Please configure it in Settings.");
            enableMainControls();
            return;
        }
        if (!charactersInput.value.trim()) {
            displayErrorInStoryOutput("Please provide characters for the story.");
            enableMainControls();
            return;
        }
        
        saveToLocalStorage(LS_CHARACTERS, charactersInput.value);
        saveToLocalStorage(LS_AUDIENCE, audienceInput.value);
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, commonInputs.enableConsolidator.toString());


        updateStatusInStoryOutput(`Initialising story generation...\n`);
        
        const initialPipelineData = {
            charactersList: parseCharacters(charactersInput.value).join(', ') || "a brave little mouse",
            storyText: "", 
            reviewText: "",
            titleText: ""
        };

        const currentPipelineConfig = getStoryGenerationPipelineConfig(commonInputs.enableConsolidator);

        try {
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs);
            
            appState.latestGeneratedStoryText = (finalData.storyText || "").trim();
            appState.latestGeneratedStoryTitle = (finalData.titleText || "Untitled Story").trim();
            
            const wordCount = countWords(appState.latestGeneratedStoryText);
            console.log(`Final word count = ${wordCount}`);

            updateStatusInStoryOutput("Story generation complete!\n"); 
            displayFinalStoryOutput(appState.latestGeneratedStoryTitle, appState.latestGeneratedStoryText); 

        } catch (error) {
            console.error("Error in handleGenerateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story generation.");
        } finally {
            enableMainControls(); 
        }
    }

    async function handleElaborateStory() {
        if (!appState.latestGeneratedStoryText) { 
            showTemporaryToast("No story available to elaborate. Please generate a story first.", "info");
            return;
        }
        
        appState.addLogEntry({ agentName: "User Action", type: 'elaboration-start', content: `Elaborating existing story. Initial length: ${appState.latestGeneratedStoryText.length}`, timestamp: new Date().toISOString() });
        
        clearStoryOutput(); 
        if (storyOutputDiv) storyOutputDiv.textContent = `Previous story version (will be elaborated):\n"${appState.latestGeneratedStoryText.substring(0,150)}..."\n\n`;

        disableMainControls();
        updateStatusInStoryOutput(`Starting elaboration...\n`);

        const commonInputs = gatherPipelineInputs(); // Will pick up current consolidator state

        if (!commonInputs.apiKey) {
            displayErrorInStoryOutput("API Key is missing. Please configure it in Settings.");
            enableMainControls();
            return;
        }

        const initialPipelineData = {
            storyText: appState.latestGeneratedStoryText, 
            reviewText: "" 
        };

        const currentPipelineConfig = getElaborationPipelineConfig(commonInputs.enableConsolidator);

        try {
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs);
            
            appState.latestGeneratedStoryText = (finalData.storyText || "").trim();
            
            const wordCount = countWords(appState.latestGeneratedStoryText);
            console.log(`Final word count (after elaboration) = ${wordCount}`);
            
            updateStatusInStoryOutput("Story elaboration complete!\n");
            displayFinalStoryOutput(appState.latestGeneratedStoryTitle, appState.latestGeneratedStoryText, true);

        } catch (error) {
            console.error("Error in handleElaborateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story elaboration.");
        } finally {
            enableMainControls();
        }
    }

    if (generateButton) generateButton.addEventListener('click', handleGenerateStory);
    if (elaborateStoryButton) elaborateStoryButton.addEventListener('click', handleElaborateStory);
});