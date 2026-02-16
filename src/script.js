// src/script.js

// --- Configuration (Constants) ---
const DEFAULT_GEMINI_MODEL_ID = "gemini-3-flash-preview"; 
const AVAILABLE_MODELS = { 
    "gemini-3-flash-preview": { name: "Gemini-3-Flash-Preview", supportsThinking: true },
    "gemini-2.5-flash": { name: "Gemini-2.5-Flash", supportsThinking: true }
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
    LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL, 
    LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, 
    LS_READING_AGE_MIN, LS_READING_AGE_MAX, LS_ENABLE_CONSOLIDATOR,
    LS_SELECTED_AUTHOR_STYLE, LS_ADJUSTMENT_TONE, LS_ADJUSTMENT_PACING,
    LS_ADJUSTMENT_HUMOR, LS_ADJUSTMENT_EMOTION, LS_STEM_CONCEPT, LS_INCLUDE_PLOT_POINTS,
    LS_SENSITIVITY_PRESET,
    LS_SENSITIVITY_CONFLICT, LS_SENSITIVITY_SCARY, LS_SENSITIVITY_SADNESS, LS_SENSITIVITY_COMPLEXITY,
    LS_THINKING_AGENT_1_CRAFTER, LS_THINKING_AGENT_2_ELABORATOR, LS_THINKING_AGENT_3_REVIEWER,
    LS_THINKING_AGENT_4_POLISHER, LS_THINKING_AGENT_5_CLEANER, LS_THINKING_AGENT_6_TITLER,
    LS_THINKING_AGENT_C_CONSOLIDATOR, LS_THEME,
    saveToLocalStorage, loadFromLocalStorage, clearAllAppData 
} from './localStorage.js';

// --- Imports from Modules ---
import appState from './appState.js'; 
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import { STORY_STYLE_GUIDES, STORY_STYLE_SUMMARIES } from './prompts/author_styles.js';
import { ADJUSTMENT_MODULES, getSensitivityGuidance } from './prompts/adjustment_modules.js';
import { READING_AGE_ADJUSTMENT_TEXT_TEMPLATE } from './prompts/agent_prompts.js';
import { HELP_TOPICS, HELP_TOPIC_ORDER } from './prompts/help_content.js';
import { parseCharacters, countWords } from './utils.js'; 
import { 
    initUIElements,
    updateStatusInStoryOutput, 
    clearStoryOutput, 
    displayFinalStoryOutput, 
    displayErrorInStoryOutput, 
    showTemporaryToast, 
    updateFrameworkSummaryDisplay, 
    updateAuthorStyleSummaryDisplay,
    disableMainControls, 
    enableMainControls,
    applyStoryFontSize,
    populateDropdown
} from './ui.js';
// --- New Pipeline Module Import ---
import { runPipeline, getStoryGenerationPipelineConfig, getElaborationPipelineConfig } from './pipeline.js';

// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, cancelSettingsButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton, decreaseFontButton, increaseFontButton; 
let userSuggestionsTextarea;
let enableReadingAgeAdjustmentCheckbox, targetReadingAgeSlider, readingAgeSliderContainer; 
let readingAgeMinInput, readingAgeMaxInput; 
let enableConsolidatorCheckbox;
let authorStyleSelect, styleSummaryDiv;
let toneSelect, pacingSelect, humorSelect, emotionSelect;
let agentTogglesContainer, agent1CrafterToggle, agent2ElaboratorToggle, agent3ReviewerToggle, agent4PolisherToggle, agent5CleanerToggle, agent6TitlerToggle, agentCConsolidatorToggle;
let parentalControlsToggle, parentalControlsContent, sensitivityPresetSelect, customSensitivityControls;
let conflictSlider, scarySlider, sadnessSlider, complexitySlider;
let conflictLabel, scaryLabel, sadnessLabel, complexityLabel, sensitivitySummary;
let stemConceptSection, stemConceptSelect, stemConceptHint;
// Framework and Style modal elements
let frameworkModal, frameworkSelectButton, frameworkSelectedLabel, frameworkOptionsGrid;
let styleModal, styleSelectButton, styleSelectedLabel, styleOptionsGrid, closeStyleModalButton;
// Help modal elements
let helpModal, helpButton, helpTopicsList, helpContentDisplay, closeHelpModalButton;
// Plot points toggle
let includePlotPointsCheckbox, plotPointsContainer;
// Theme toggle
let themeToggle;

// STEM Concept data for hints
const STEM_CONCEPT_DATA = {
    displacement: {
        hint: "When you put something in water, it pushes the water out of the way—making the water level rise.",
        example: "Crow drops pebbles into pitcher to raise water level",
        animal: "Crow, Beaver"
    },
    leverage: {
        hint: "A lever helps you lift heavy things with less effort—the longer the lever, the easier it gets!",
        example: "Ant uses a stick to move a heavy rock",
        animal: "Ant, Monkey"
    },
    momentum: {
        hint: "Heavy things moving fast are hard to stop. Light things are easy to stop!",
        example: "Tortoise vs hare—the ball keeps rolling",
        animal: "Tortoise, Elephant"
    },
    buoyancy: {
        hint: "Some things float because they're lighter than water—or shaped to trap air inside.",
        example: "Duck teaches mouse to float using a leaf boat",
        animal: "Duck, Otter"
    },
    friction: {
        hint: "Rough surfaces slow things down, smooth surfaces let them slide easily.",
        example: "Snake learns different ways to move on different surfaces",
        animal: "Snake, Snail"
    },
    aerodynamics: {
        hint: "The shape of something changes how air moves around it—pointy shapes cut through air better.",
        example: "Bird teaches squirrel about gliding shapes",
        animal: "Bird, Flying Squirrel"
    },
    counting: {
        hint: "Counting helps us know exactly how many we have—and share fairly!",
        example: "Squirrel divides acorns among friends",
        animal: "Squirrel, Ant colony"
    },
    patterns: {
        hint: "Patterns repeat in a special order—once you spot the pattern, you can guess what comes next!",
        example: "Spider weaves a web using repeating patterns",
        animal: "Spider, Bee"
    },
    geometry: {
        hint: "Shapes have special properties—triangles are strong, hexagons fit together perfectly.",
        example: "Bees explain why honeycombs are hexagons",
        animal: "Bee, Spider"
    },
    estimation: {
        hint: "We can make good guesses about how big, how far, or how many—without counting every single one.",
        example: "Ant estimates if the food will fit through the tunnel",
        animal: "Ant"
    },
    metamorphosis: {
        hint: "Some creatures completely change their bodies as they grow—like magic, but it's science!",
        example: "Caterpillar's journey to becoming a butterfly",
        animal: "Caterpillar/Butterfly, Tadpole/Frog"
    },
    camouflage: {
        hint: "Animals hide by looking like their surroundings—some can even change colors!",
        example: "Chameleon teaches moth about blending in",
        animal: "Chameleon, Moth, Octopus"
    },
    ecosystems: {
        hint: "Every living thing is connected—when one thing changes, it affects everything else.",
        example: "Forest animals discover how they all depend on each other",
        animal: "Multiple forest animals"
    },
    lifecycles: {
        hint: "Living things go through stages: born, grow, have babies, and pass on—a circle that keeps going.",
        example: "Salmon's incredible journey",
        animal: "Salmon, Butterfly"
    },
    echolocation: {
        hint: "Some animals 'see' with sound—they make a noise and listen for the echo bouncing back!",
        example: "Bat teaches a lost bird to navigate in darkness",
        animal: "Bat, Dolphin"
    },
    problem_solving: {
        hint: "When something doesn't work, try a different way! Good inventors try many times before succeeding.",
        example: "Beaver builds and rebuilds dam until it holds",
        animal: "Beaver, Crow"
    },
    materials: {
        hint: "Different materials have different strengths—straw is light, sticks are stronger, bricks are strongest!",
        example: "Three little pigs engineering edition",
        animal: "Pig, Beaver"
    },
    structures: {
        hint: "The way you arrange things matters—triangles and arches make things extra strong.",
        example: "Ants discover arch structures for their tunnels",
        animal: "Ant, Beaver, Spider"
    }
};

// Sensitivity level labels
const SENSITIVITY_LABELS = ['None', 'Gentle', 'Standard', 'Adventurous'];

// Sensitivity presets
const SENSITIVITY_PRESETS = {
    extra_gentle: { conflict: 0, scary: 0, sadness: 0, complexity: 0 },
    gentle: { conflict: 1, scary: 1, sadness: 1, complexity: 1 },
    standard: { conflict: 2, scary: 2, sadness: 2, complexity: 2 },
    adventurous: { conflict: 3, scary: 3, sadness: 3, complexity: 3 }
};

// --- Application State for Font Size ---
let currentStoryFontSizeRem = DEFAULT_STORY_FONT_SIZE_REM;


// --- Theme Functions ---
/**
 * Initialize theme from localStorage or system preference
 */
function initializeTheme() {
    const savedTheme = loadFromLocalStorage(LS_THEME);
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    saveToLocalStorage(LS_THEME, newTheme);
}


// --- UI Helper Functions ---
function updateTargetReadingAgeSliderDOMState() {
    if (!targetReadingAgeSlider || !readingAgeMinInput || !readingAgeMaxInput || !enableReadingAgeAdjustmentCheckbox || !readingAgeSliderContainer) return;
    
    const minAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString(), 10);
    const maxAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString(), 10);
    
    targetReadingAgeSlider.min = minAge.toString();
    targetReadingAgeSlider.max = maxAge.toString();
    
    let currentValue = parseInt(targetReadingAgeSlider.value, 10);
    if (isNaN(currentValue) || currentValue < minAge) currentValue = minAge;
    if (currentValue > maxAge) currentValue = maxAge;
    targetReadingAgeSlider.value = currentValue.toString();
        
    const isEnabled = enableReadingAgeAdjustmentCheckbox.checked;
    targetReadingAgeSlider.disabled = !isEnabled;
    readingAgeSliderContainer.classList.toggle('disabled', !isEnabled);
}

function updateAgentTogglesUI() {
    if (!modalModelSelect || !agentTogglesContainer) return;
    const selectedModelId = modalModelSelect.value;
    const model = AVAILABLE_MODELS[selectedModelId];
    const canThink = model ? model.supportsThinking : false;

    agentTogglesContainer.classList.toggle('disabled', !canThink);
}

// --- Modal Population Functions ---
function populateFrameworkModal() {
    if (!frameworkOptionsGrid || !craftingFrameworkSelect) return;
    
    frameworkOptionsGrid.innerHTML = '';
    const currentValue = craftingFrameworkSelect.value;
    
    Object.entries(STORY_FRAMEWORK_SUMMARIES).forEach(([key, summary]) => {
        const card = document.createElement('div');
        card.className = 'selection-card' + (key === currentValue ? ' selected' : '');
        card.dataset.value = key;
        card.innerHTML = `
            <div class="selection-card-title">${key}</div>
            <div class="selection-card-description">${summary}</div>
        `;
        card.addEventListener('click', () => {
            // Update the hidden select
            craftingFrameworkSelect.value = key;
            craftingFrameworkSelect.dispatchEvent(new Event('change'));
            
            // Update visual selection
            frameworkOptionsGrid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            // Update button label
            frameworkSelectedLabel.textContent = key;
            
            // Close modal
            frameworkModal.classList.remove('active');
        });
        frameworkOptionsGrid.appendChild(card);
    });
    
    // Set initial label
    frameworkSelectedLabel.textContent = currentValue || 'Select Framework';
}

function populateStyleModal() {
    if (!styleOptionsGrid || !authorStyleSelect) return;
    
    styleOptionsGrid.innerHTML = '';
    const currentValue = authorStyleSelect.value;
    
    Object.entries(STORY_STYLE_SUMMARIES).forEach(([key, summary]) => {
        const card = document.createElement('div');
        card.className = 'selection-card' + (key === currentValue ? ' selected' : '');
        card.dataset.value = key;
        card.innerHTML = `
            <div class="selection-card-title">${key}</div>
            <div class="selection-card-description">${summary}</div>
        `;
        card.addEventListener('click', () => {
            // Update the hidden select
            authorStyleSelect.value = key;
            authorStyleSelect.dispatchEvent(new Event('change'));
            
            // Update visual selection
            styleOptionsGrid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            // Update button label
            styleSelectedLabel.textContent = key;
        });
        styleOptionsGrid.appendChild(card);
    });
    
    // Set initial label
    styleSelectedLabel.textContent = currentValue || 'Select Style';
}

// --- Help Modal Functions ---
let currentHelpTopic = null;

function populateHelpTopics() {
    if (!helpTopicsList) return;
    
    helpTopicsList.innerHTML = '';
    
    HELP_TOPIC_ORDER.forEach((topicKey, index) => {
        const topic = HELP_TOPICS[topicKey];
        if (!topic) return;
        
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'help-topic-btn' + (index === 0 ? ' active' : '');
        btn.textContent = topic.title;
        btn.dataset.topic = topicKey;
        
        btn.addEventListener('click', () => {
            selectHelpTopic(topicKey);
        });
        
        li.appendChild(btn);
        helpTopicsList.appendChild(li);
    });
    
    // Load first topic by default
    if (HELP_TOPIC_ORDER.length > 0) {
        selectHelpTopic(HELP_TOPIC_ORDER[0]);
    }
}

function selectHelpTopic(topicKey) {
    if (!helpContentDisplay || !HELP_TOPICS[topicKey]) return;
    
    currentHelpTopic = topicKey;
    
    // Update active state on buttons
    helpTopicsList.querySelectorAll('.help-topic-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.topic === topicKey);
    });
    
    // Display the content
    helpContentDisplay.innerHTML = HELP_TOPICS[topicKey].content;
}

// --- STEM Concept Section Functions ---
function updateSTEMSectionVisibility() {
    if (!stemConceptSection || !craftingFrameworkSelect) return;
    
    const selectedFramework = craftingFrameworkSelect.value;
    const isLearningFable = selectedFramework === 'Learning Fable (STEM)';
    
    if (isLearningFable) {
        stemConceptSection.classList.remove('hidden');
        stemConceptSection.classList.add('show');
    } else {
        stemConceptSection.classList.add('hidden');
        stemConceptSection.classList.remove('show');
    }
}

function updateSTEMConceptHint(conceptKey) {
    if (!stemConceptHint) return;
    
    const conceptData = STEM_CONCEPT_DATA[conceptKey];
    if (conceptData) {
        stemConceptHint.innerHTML = `
            <strong>💡 Concept:</strong> ${conceptData.hint}<br>
            <strong>🎬 Example:</strong> ${conceptData.example}<br>
            <strong>🐾 Suggested Animals:</strong> ${conceptData.animal}
        `;
        stemConceptHint.classList.remove('hidden');
    } else {
        stemConceptHint.innerHTML = '';
        stemConceptHint.classList.add('hidden');
    }
}

/**
 * Gets the current STEM concept for inclusion in prompts
 * @returns {Object|null} The concept data or null if not using Learning Fable
 */
function getSelectedSTEMConcept() {
    if (!craftingFrameworkSelect || !stemConceptSelect) return null;
    
    const selectedFramework = craftingFrameworkSelect.value;
    if (selectedFramework !== 'Learning Fable (STEM)') return null;
    
    const conceptKey = stemConceptSelect.value;
    if (!conceptKey || !STEM_CONCEPT_DATA[conceptKey]) return null;
    
    return {
        key: conceptKey,
        ...STEM_CONCEPT_DATA[conceptKey]
    };
}

/**
 * Gets the current narrator persona text for inclusion in prompts
 * @returns {string} Empty string - narrator persona feature removed
 */
function getSelectedPersonaText() {
    return "";
}

// --- Parental Controls Functions ---
function updateSensitivitySliderLabels() {
    if (conflictSlider && conflictLabel) {
        conflictLabel.textContent = SENSITIVITY_LABELS[parseInt(conflictSlider.value)];
    }
    if (scarySlider && scaryLabel) {
        scaryLabel.textContent = SENSITIVITY_LABELS[parseInt(scarySlider.value)];
    }
    if (sadnessSlider && sadnessLabel) {
        sadnessLabel.textContent = SENSITIVITY_LABELS[parseInt(sadnessSlider.value)];
    }
    if (complexitySlider && complexityLabel) {
        complexityLabel.textContent = SENSITIVITY_LABELS[parseInt(complexitySlider.value)];
    }
}

function applySensitivityPreset(presetKey) {
    const preset = SENSITIVITY_PRESETS[presetKey];
    if (!preset) return;
    
    if (conflictSlider) conflictSlider.value = preset.conflict;
    if (scarySlider) scarySlider.value = preset.scary;
    if (sadnessSlider) sadnessSlider.value = preset.sadness;
    if (complexitySlider) complexitySlider.value = preset.complexity;
    
    updateSensitivitySliderLabels();
    saveSensitivitySettings();
    updateSensitivitySummary();
}

function saveSensitivitySettings() {
    if (sensitivityPresetSelect) {
        saveToLocalStorage(LS_SENSITIVITY_PRESET, sensitivityPresetSelect.value);
    }
    if (conflictSlider) {
        saveToLocalStorage(LS_SENSITIVITY_CONFLICT, conflictSlider.value);
    }
    if (scarySlider) {
        saveToLocalStorage(LS_SENSITIVITY_SCARY, scarySlider.value);
    }
    if (sadnessSlider) {
        saveToLocalStorage(LS_SENSITIVITY_SADNESS, sadnessSlider.value);
    }
    if (complexitySlider) {
        saveToLocalStorage(LS_SENSITIVITY_COMPLEXITY, complexitySlider.value);
    }
}

function loadSensitivitySettings() {
    const preset = loadFromLocalStorage(LS_SENSITIVITY_PRESET) || 'standard';
    if (sensitivityPresetSelect) {
        sensitivityPresetSelect.value = preset;
    }
    
    if (preset === 'custom') {
        if (conflictSlider) conflictSlider.value = loadFromLocalStorage(LS_SENSITIVITY_CONFLICT) || '2';
        if (scarySlider) scarySlider.value = loadFromLocalStorage(LS_SENSITIVITY_SCARY) || '2';
        if (sadnessSlider) sadnessSlider.value = loadFromLocalStorage(LS_SENSITIVITY_SADNESS) || '2';
        if (complexitySlider) complexitySlider.value = loadFromLocalStorage(LS_SENSITIVITY_COMPLEXITY) || '2';
        if (customSensitivityControls) customSensitivityControls.classList.remove('hidden');
    } else {
        applySensitivityPreset(preset);
    }
    
    updateSensitivitySliderLabels();
    updateSensitivitySummary();
}

function updateSensitivitySummary() {
    if (!sensitivitySummary) return;
    
    const preset = sensitivityPresetSelect ? sensitivityPresetSelect.value : 'standard';
    
    if (preset !== 'custom') {
        const summaries = {
            extra_gentle: "🌸 Extra gentle mode: No conflict, scary elements, or sad moments. Very simple stories.",
            gentle: "🌼 Gentle mode: Minimal challenges with quick resolutions. Easy, comforting stories.",
            standard: "🌻 Standard mode: Age-appropriate content with traditional story elements.",
            adventurous: "🌟 Adventurous mode: Fuller exploration of themes with more complex narratives."
        };
        sensitivitySummary.textContent = summaries[preset] || '';
    } else {
        const conflict = parseInt(conflictSlider?.value || '2');
        const scary = parseInt(scarySlider?.value || '2');
        const sadness = parseInt(sadnessSlider?.value || '2');
        const complexity = parseInt(complexitySlider?.value || '2');
        
        sensitivitySummary.textContent = `Custom settings: Conflict ${SENSITIVITY_LABELS[conflict]}, Scary ${SENSITIVITY_LABELS[scary]}, Sadness ${SENSITIVITY_LABELS[sadness]}, Complexity ${SENSITIVITY_LABELS[complexity]}`;
    }
}

/**
 * Gets the current sensitivity settings for inclusion in prompts
 * @returns {Object|null} The sensitivity settings object or null if using standard
 */
function getCurrentSensitivitySettings() {
    const preset = sensitivityPresetSelect ? sensitivityPresetSelect.value : 'standard';
    
    if (preset === 'standard') {
        return null; // Standard settings, no additional guidance needed
    }
    
    if (preset !== 'custom') {
        return SENSITIVITY_PRESETS[preset];
    }
    
    // Custom settings
    return {
        conflict: parseInt(conflictSlider?.value || '2'),
        scary: parseInt(scarySlider?.value || '2'),
        sadness: parseInt(sadnessSlider?.value || '2'),
        complexity: parseInt(complexitySlider?.value || '2')
    };
}


// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    modalApiKeyInput = document.getElementById('modalApiKeyInput');
    modalModelSelect = document.getElementById('modalModelSelect');
    minApiIntervalInput = document.getElementById('minApiIntervalInput'); 
    readingAgeMinInput = document.getElementById('readingAgeMinInput'); 
    readingAgeMaxInput = document.getElementById('readingAgeMaxInput'); 
    downloadChatLogButton = document.getElementById('downloadChatLogButton');
    charactersInput = document.getElementById('charactersInput');
    audienceInput = document.getElementById('audienceInput');
    userSuggestionsTextarea = document.getElementById('userSuggestionsTextarea');
    enableReadingAgeAdjustmentCheckbox = document.getElementById('enableReadingAgeAdjustmentCheckbox'); 
    targetReadingAgeSlider = document.getElementById('targetReadingAgeSlider'); 
    readingAgeSliderContainer = document.getElementById('readingAgeSliderContainer'); 
    enableConsolidatorCheckbox = document.getElementById('enableConsolidatorCheckbox');
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
    authorStyleSelect = document.getElementById('authorStyleSelect');
    styleSummaryDiv = document.getElementById('styleSummary');
    toneSelect = document.getElementById('toneSelect');
    pacingSelect = document.getElementById('pacingSelect');
    humorSelect = document.getElementById('humorSelect');
    emotionSelect = document.getElementById('emotionSelect');
    agentTogglesContainer = document.getElementById('agentTogglesContainer');
    agent1CrafterToggle = document.getElementById('agent1CrafterToggle');
    agent2ElaboratorToggle = document.getElementById('agent2ElaboratorToggle');
    agent3ReviewerToggle = document.getElementById('agent3ReviewerToggle');
    agent4PolisherToggle = document.getElementById('agent4PolisherToggle');
    agent5CleanerToggle = document.getElementById('agent5CleanerToggle');
    agent6TitlerToggle = document.getElementById('agent6TitlerToggle');
    agentCConsolidatorToggle = document.getElementById('agentCConsolidatorToggle');
    stemConceptSection = document.getElementById('stemConceptSection');
    stemConceptSelect = document.getElementById('stemConceptSelect');
    stemConceptHint = document.getElementById('stemConceptHint');
    
    // Parental Controls DOM elements
    parentalControlsToggle = document.getElementById('parentalControlsToggle');
    parentalControlsContent = document.getElementById('parentalControlsContent');
    sensitivityPresetSelect = document.getElementById('sensitivityPresetSelect');
    customSensitivityControls = document.getElementById('customSensitivityControls');
    conflictSlider = document.getElementById('conflictSlider');
    scarySlider = document.getElementById('scarySlider');
    sadnessSlider = document.getElementById('sadnessSlider');
    complexitySlider = document.getElementById('complexitySlider');
    conflictLabel = document.getElementById('conflictLabel');
    scaryLabel = document.getElementById('scaryLabel');
    sadnessLabel = document.getElementById('sadnessLabel');
    complexityLabel = document.getElementById('complexityLabel');
    sensitivitySummary = document.getElementById('sensitivitySummary');
    
    // Theme toggle
    themeToggle = document.getElementById('themeToggle');
    
    // Framework and Style modal elements
    frameworkModal = document.getElementById('frameworkModal');
    frameworkSelectButton = document.getElementById('frameworkSelectButton');
    frameworkSelectedLabel = document.getElementById('frameworkSelectedLabel');
    frameworkOptionsGrid = document.getElementById('frameworkOptionsGrid');
    styleModal = document.getElementById('styleModal');
    styleSelectButton = document.getElementById('styleSelectButton');
    styleSelectedLabel = document.getElementById('styleSelectedLabel');
    styleOptionsGrid = document.getElementById('styleOptionsGrid');
    closeStyleModalButton = document.getElementById('closeStyleModalButton');
    
    // Plot points toggle
    includePlotPointsCheckbox = document.getElementById('includePlotPointsCheckbox');
    plotPointsContainer = document.getElementById('plotPointsContainer');
    
    // Help modal elements
    helpModal = document.getElementById('helpModal');
    helpButton = document.getElementById('helpButton');
    helpTopicsList = document.getElementById('helpTopicsList');
    helpContentDisplay = document.getElementById('helpContentDisplay');
    closeHelpModalButton = document.getElementById('closeHelpModalButton');


    if (!modalApiKeyInput || !charactersInput || !audienceInput || !craftingFrameworkSelect || !generateButton || !storyOutputDiv || !settingsModal || !settingsButton || !saveSettingsButton || !modalModelSelect || !storyTitleDiv || !userSuggestionsTextarea || !enableReadingAgeAdjustmentCheckbox || !targetReadingAgeSlider || !readingAgeSliderContainer || !decreaseFontButton || !increaseFontButton || !enableConsolidatorCheckbox || !authorStyleSelect || !agentTogglesContainer) {
        console.error("Critical UI elements are missing. Application may not function correctly.");
        if (storyOutputDiv) storyOutputDiv.textContent = "Error: Critical UI elements missing. Check console.";
        return;
    }
    
    initUIElements({ 
        storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton,
        decreaseFontButton, increaseFontButton,
        craftingFrameworkSelect, frameworkSummaryDiv, userSuggestionsTextarea,
        authorStyleSelect, styleSummaryDiv
    });

    applyStoryFontSize(currentStoryFontSizeRem);
    
    // Initialize theme from localStorage or system preference
    initializeTheme();

    if (storyOutputDiv) storyOutputDiv.textContent = 'Welcome to StoryGen!\n\nTo create a story:\n1. Enter your characters in the Characters field\n2. Set your target audience (e.g., "children aged 5-7")\n3. Choose a Story Framework and Authorial Style\n4. Optionally add specific plot points\n5. Click "Generate Story"\n\nFirst time? Configure your Gemini API Key in Settings (⚙️ icon).';
    enableMainControls();

    // Populate UI elements
    populateDropdown(craftingFrameworkSelect, STORY_CRAFTING_GUIDES, false);
    const storedFramework = loadFromLocalStorage(LS_SELECTED_FRAMEWORK);
    if (storedFramework && STORY_CRAFTING_GUIDES[storedFramework]) {
        craftingFrameworkSelect.value = storedFramework;
    }
    updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES); 

    populateDropdown(authorStyleSelect, STORY_STYLE_GUIDES, false);
    authorStyleSelect.value = loadFromLocalStorage(LS_SELECTED_AUTHOR_STYLE) || "Default (No Specific Style)";
    updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES);

    populateDropdown(toneSelect, ADJUSTMENT_MODULES.tone);
    populateDropdown(pacingSelect, ADJUSTMENT_MODULES.pacing);
    populateDropdown(humorSelect, ADJUSTMENT_MODULES.humor);
    populateDropdown(emotionSelect, ADJUSTMENT_MODULES.emotion);
    
    // Load all saved settings from Local Storage
    toneSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_TONE) || 'none';
    pacingSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_PACING) || 'default';
    humorSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_HUMOR) || 'none';
    emotionSelect.value = loadFromLocalStorage(LS_ADJUSTMENT_EMOTION) || 'default';

    modalModelSelect.innerHTML = ''; 
    Object.keys(AVAILABLE_MODELS).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = AVAILABLE_MODELS[id].name;
        modalModelSelect.appendChild(option);
    });
    modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;

    modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || '';
    charactersInput.value = loadFromLocalStorage(LS_CHARACTERS) || '';
    audienceInput.value = loadFromLocalStorage(LS_AUDIENCE) || 'children aged 5-7';
    minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
    
    userSuggestionsTextarea.value = loadFromLocalStorage(LS_USER_SUGGESTIONS) || '';

    enableReadingAgeAdjustmentCheckbox.checked = (loadFromLocalStorage(LS_ADJUST_READING_AGE_ENABLED) === 'true');
    readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
    readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
    targetReadingAgeSlider.value = loadFromLocalStorage(LS_TARGET_READING_AGE) || DEFAULT_TARGET_READING_AGE.toString();
    updateTargetReadingAgeSliderDOMState(); 

    enableConsolidatorCheckbox.checked = (loadFromLocalStorage(LS_ENABLE_CONSOLIDATOR) === 'true');
    
    agent1CrafterToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) ?? 'true') === 'true';
    agent2ElaboratorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) ?? 'true') === 'true';
    agent3ReviewerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) ?? 'true') === 'true';
    agent4PolisherToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) ?? 'true') === 'true';
    agent5CleanerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) ?? 'false') === 'true';
    agent6TitlerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) ?? 'false') === 'true';
    agentCConsolidatorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) ?? 'true') === 'true';
    updateAgentTogglesUI();


    // --- Event Listeners ---
    
    // Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update button states
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            // Update panel states
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            const targetPanel = document.getElementById(`tab-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
    
    craftingFrameworkSelect.addEventListener('change', () => {
        updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES);
        saveToLocalStorage(LS_SELECTED_FRAMEWORK, craftingFrameworkSelect.value);
        updateSTEMSectionVisibility();
    });

    // STEM Concept selector
    if (stemConceptSelect) {
        stemConceptSelect.addEventListener('change', () => {
            const conceptKey = stemConceptSelect.value;
            saveToLocalStorage(LS_STEM_CONCEPT, conceptKey);
            updateSTEMConceptHint(conceptKey);
        });
        
        // Load saved STEM concept
        const savedConcept = loadFromLocalStorage(LS_STEM_CONCEPT);
        if (savedConcept) {
            stemConceptSelect.value = savedConcept;
            updateSTEMConceptHint(savedConcept);
        }
    }
    
    // Initialize STEM section visibility
    updateSTEMSectionVisibility();
    
    // Initialize Parental Controls
    loadSensitivitySettings();
    
    // Parental Controls event listeners
    // Note: <details> element handles accordion toggle natively
    
    if (sensitivityPresetSelect) {
        sensitivityPresetSelect.addEventListener('change', () => {
            const preset = sensitivityPresetSelect.value;
            if (preset === 'custom') {
                customSensitivityControls.classList.remove('hidden');
            } else {
                customSensitivityControls.classList.add('hidden');
                applySensitivityPreset(preset);
            }
            saveSensitivitySettings();
            updateSensitivitySummary();
        });
    }
    
    // Slider event listeners
    [conflictSlider, scarySlider, sadnessSlider, complexitySlider].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', () => {
                updateSensitivitySliderLabels();
                // Auto-switch to custom if sliders are changed
                if (sensitivityPresetSelect.value !== 'custom') {
                    sensitivityPresetSelect.value = 'custom';
                    customSensitivityControls.classList.remove('hidden');
                }
                saveSensitivitySettings();
                updateSensitivitySummary();
            });
        }
    });

    authorStyleSelect.addEventListener('change', () => {
        updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES);
        saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, authorStyleSelect.value);
    });

    userSuggestionsTextarea.addEventListener('input', () => saveToLocalStorage(LS_USER_SUGGESTIONS, userSuggestionsTextarea.value));
    
    enableReadingAgeAdjustmentCheckbox.addEventListener('change', () => {
        updateTargetReadingAgeSliderDOMState();
        saveToLocalStorage(LS_ADJUST_READING_AGE_ENABLED, enableReadingAgeAdjustmentCheckbox.checked.toString());
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

    enableConsolidatorCheckbox.addEventListener('change', () => {
        saveToLocalStorage(LS_ENABLE_CONSOLIDATOR, enableConsolidatorCheckbox.checked.toString());
    });

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Settings Modal
    settingsButton.addEventListener('click', () => {
        modalModelSelect.value = loadFromLocalStorage(LS_SELECTED_MODEL) || DEFAULT_GEMINI_MODEL_ID;
        modalApiKeyInput.value = loadFromLocalStorage(LS_API_KEY) || ''; 
        minApiIntervalInput.value = loadFromLocalStorage(LS_MIN_API_INTERVAL) || DEFAULT_MIN_API_INTERVAL_S.toString();
        readingAgeMinInput.value = loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString();
        readingAgeMaxInput.value = loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString();
        updateAgentTogglesUI();
        settingsModal.classList.add('active');
    });
    modalModelSelect.addEventListener('change', updateAgentTogglesUI);
    cancelSettingsButton.addEventListener('click', () => settingsModal.classList.remove('active'));
    saveSettingsButton.addEventListener('click', () => {
        saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value);
        saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
        saveToLocalStorage(LS_MIN_API_INTERVAL, minApiIntervalInput.value);
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value); 
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        saveToLocalStorage(LS_THINKING_AGENT_1_CRAFTER, agent1CrafterToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_2_ELABORATOR, agent2ElaboratorToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_3_REVIEWER, agent3ReviewerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_4_POLISHER, agent4PolisherToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_5_CLEANER, agent5CleanerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_6_TITLER, agent6TitlerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR, agentCConsolidatorToggle.checked.toString());
        updateTargetReadingAgeSliderDOMState(); 
        settingsModal.classList.remove('active');
        showTemporaryToast("Settings saved!", "success");
    });
    
    // Style controls (auto-save on change)
    toneSelect.addEventListener('change', () => saveToLocalStorage(LS_ADJUSTMENT_TONE, toneSelect.value));
    pacingSelect.addEventListener('change', () => saveToLocalStorage(LS_ADJUSTMENT_PACING, pacingSelect.value));
    humorSelect.addEventListener('change', () => saveToLocalStorage(LS_ADJUSTMENT_HUMOR, humorSelect.value));
    emotionSelect.addEventListener('change', () => saveToLocalStorage(LS_ADJUSTMENT_EMOTION, emotionSelect.value));
    
    // Framework Modal
    populateFrameworkModal();
    frameworkSelectButton.addEventListener('click', () => {
        frameworkModal.classList.add('active');
    });
    
    // Style Modal  
    populateStyleModal();
    styleSelectButton.addEventListener('click', () => {
        styleModal.classList.add('active');
    });
    closeStyleModalButton.addEventListener('click', () => {
        styleModal.classList.remove('active');
    });
    
    // Help Modal
    populateHelpTopics();
    if (helpButton && helpModal) {
        helpButton.addEventListener('click', () => {
            helpModal.classList.add('active');
        });
    }
    if (closeHelpModalButton && helpModal) {
        closeHelpModalButton.addEventListener('click', () => {
            helpModal.classList.remove('active');
        });
    }
    
    // Plot points toggle
    if (includePlotPointsCheckbox && plotPointsContainer) {
        const savedIncludePlotPoints = loadFromLocalStorage(LS_INCLUDE_PLOT_POINTS);
        if (savedIncludePlotPoints !== null) {
            includePlotPointsCheckbox.checked = savedIncludePlotPoints === 'true';
        }
        plotPointsContainer.style.display = includePlotPointsCheckbox.checked ? 'block' : 'none';
        
        includePlotPointsCheckbox.addEventListener('change', () => {
            plotPointsContainer.style.display = includePlotPointsCheckbox.checked ? 'block' : 'none';
            saveToLocalStorage(LS_INCLUDE_PLOT_POINTS, includePlotPointsCheckbox.checked.toString());
        });
    }
    
    // Modal close buttons (X buttons in header)
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // Close modal when clicking backdrop
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Other buttons...
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
        if (newSize > MAX_STORY_FONT_SIZE_REM) newSize = MAX_STORY_FONT_SIZE_REM;
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });
    decreaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem - STORY_FONT_SIZE_STEP;
        if (newSize < MIN_STORY_FONT_SIZE_REM) newSize = MIN_STORY_FONT_SIZE_REM;
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
        let craftGuideText = STORY_CRAFTING_GUIDES[frameworkKey] || ""; 
        
        // Append STEM concept information for Learning Fable framework
        const stemConcept = getSelectedSTEMConcept();
        if (stemConcept && frameworkKey === 'Learning Fable (STEM)') {
            craftGuideText += `\n\n## 📚 SELECTED STEM CONCEPT: ${stemConcept.key.toUpperCase().replace('_', ' ')}

**Core Concept Explanation:** ${stemConcept.hint}

**Example Application:** ${stemConcept.example}

**Suggested Animal Characters:** ${stemConcept.animal}

IMPORTANT: The story MUST teach this specific concept. The "moral" or lesson of this fable should be the STEM concept explained above. 
- Introduce the concept naturally through the story's conflict and resolution
- Use concrete, child-friendly examples that demonstrate the concept
- The characters should discover and apply this principle to solve their problem
- End with a clear understanding of the concept that the child reader can take away`;
        } 
        
        const styleKey = authorStyleSelect.value;
        const authorStyleGuideText = STORY_STYLE_GUIDES[styleKey] || "";
        
        const selectedTone = toneSelect.value;
        const selectedPacing = pacingSelect.value;
        const selectedHumor = humorSelect.value;
        const selectedEmotion = emotionSelect.value;

        const adjustmentModulesText = [
            ADJUSTMENT_MODULES.tone[selectedTone],
            ADJUSTMENT_MODULES.pacing[selectedPacing],
            ADJUSTMENT_MODULES.humor[selectedHumor],
            ADJUSTMENT_MODULES.emotion[selectedEmotion]
        ].filter(Boolean).join('\n');

        const agentThinkingConfig = {
            "Agent 1: Story Crafter": (loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) ?? 'true') === 'true',
            "Agent 2: Elaborator": (loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) ?? 'true') === 'true',
            "Agent 3: Reviewer": (loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) ?? 'true') === 'true',
            "Agent 4: Polisher": (loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) ?? 'true') === 'true',
            "Agent 5: Cleaner": (loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) ?? 'false') === 'true',
            "Agent 6: Titler": (loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) ?? 'false') === 'true',
            "Agent C: Consolidator": (loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) ?? 'true') === 'true',
        };
        const model = AVAILABLE_MODELS[modelId];
        const canThink = model ? model.supportsThinking : false;
        if (!canThink) {
            Object.keys(agentThinkingConfig).forEach(key => agentThinkingConfig[key] = false);
        }

        let userSuggestionsText = ""; 
        const suggestions = userSuggestionsTextarea.value.trim();
        if (suggestions) {
            userSuggestionsText = `User Plot Points (please incorporate these if they align with the story framework and goal):\n${suggestions}`;
        }
        
        let readingAgeNote = ""; 
        if (enableReadingAgeAdjustmentCheckbox.checked) { 
            const targetAge = targetReadingAgeSlider.value || DEFAULT_TARGET_READING_AGE;
            readingAgeNote = READING_AGE_ADJUSTMENT_TEXT_TEMPLATE.replace(/\$\{targetReadingAge\}/g, targetAge.toString());
        }

        const enableConsolidator = enableConsolidatorCheckbox.checked;
        
        // Get narrator persona text
        const narratorPersonaText = getSelectedPersonaText();
        
        // Get sensitivity guidance
        const sensitivitySettings = getCurrentSensitivitySettings();
        const sensitivityGuidanceText = sensitivitySettings ? getSensitivityGuidance(sensitivitySettings) : '';

        return { 
            apiKey, 
            modelId, 
            minApiIntervalMs, 
            audience, 
            CRAFT_GUIDE_TEXT: craftGuideText, 
            READING_AGE_NOTE: readingAgeNote, 
            USER_SUGGESTIONS_TEXT: userSuggestionsText,
            enableConsolidator,
            AUTHOR_STYLE_GUIDE: authorStyleGuideText,
            ADJUSTMENT_MODULES_TEXT: adjustmentModulesText,
            NARRATOR_PERSONA_TEXT: narratorPersonaText,
            SENSITIVITY_GUIDANCE_TEXT: sensitivityGuidanceText,
            agentThinkingConfig
        };
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
        saveToLocalStorage(LS_SELECTED_AUTHOR_STYLE, authorStyleSelect.value);
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
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs, storyOutputDiv);
            
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

        const commonInputs = gatherPipelineInputs();

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
            const finalData = await runPipeline(currentPipelineConfig, initialPipelineData, commonInputs, storyOutputDiv);
            
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
    
    // Global keyboard shortcut: Ctrl+Shift+R to reset all data
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
            e.preventDefault(); // Prevent browser refresh
            
            if (confirm('Reset all StoryGen data? This will clear:\n- All story settings\n- Plot points\n- Style choices\n\nYour API key will be preserved.\n\nContinue?')) {
                clearAllAppData(false); // Keep API key
                showTemporaryToast('All data reset. Reloading...', 'info');
                setTimeout(() => window.location.reload(), 500);
            }
        }
    });
});