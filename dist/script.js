// src/script.ts
// --- Configuration (Constants) ---
// ─── HOW TO ADD OR CHANGE GEMINI MODELS ────────────────────────────────
// 1. Search this file for "AVAILABLE_MODELS" to find this block.
// 2. Add a new entry using the model's API ID (the string you'd use in a
//    REST call to generativelanguage.googleapis.com). For example:
//        "gemini-2.0-pro": { name: "Gemini 2.0 Pro", supportsThinking: false }
// 3. Set supportsThinking to true if the model supports the "thinking"
//    (extended reasoning) parameter, or false if it doesn't.
// 4. To change the default model, update DEFAULT_GEMINI_MODEL_ID below.
// 5. That's it — no other files need changing. The Settings dropdown and
//    API calls are built dynamically from this object.
// ────────────────────────────────────────────────────────────────────────
const DEFAULT_GEMINI_MODEL_ID = "gemini-2.5-flash-lite";
const AVAILABLE_MODELS = {
    "gemini-flash-latest": { name: "Gemini Flash Latest", supportsThinking: false },
    "gemini-3-flash-preview": { name: "Gemini 3 Flash Preview", supportsThinking: true },
    "gemini-2.5-flash": { name: "Gemini 2.5 Flash", supportsThinking: true },
    "gemini-2.5-flash-lite": { name: "Gemini 2.5 Flash Lite", supportsThinking: true },
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
import { LS_API_KEY, LS_CHARACTERS, LS_AUDIENCE, LS_SELECTED_FRAMEWORK, LS_SELECTED_MODEL, LS_USER_SUGGESTIONS, LS_MIN_API_INTERVAL, LS_ADJUST_READING_AGE_ENABLED, LS_TARGET_READING_AGE, LS_READING_AGE_MIN, LS_READING_AGE_MAX, LS_ENABLE_CONSOLIDATOR, LS_SELECTED_AUTHOR_STYLE, LS_ADJUSTMENT_TONE, LS_ADJUSTMENT_PACING, LS_ADJUSTMENT_HUMOR, LS_ADJUSTMENT_EMOTION, LS_STEM_CONCEPT, LS_INCLUDE_PLOT_POINTS, LS_SENSITIVITY_PRESET, LS_SENSITIVITY_CONFLICT, LS_SENSITIVITY_SCARY, LS_SENSITIVITY_SADNESS, LS_SENSITIVITY_COMPLEXITY, LS_THINKING_AGENT_1_CRAFTER, LS_THINKING_AGENT_2_ELABORATOR, LS_THINKING_AGENT_3_REVIEWER, LS_THINKING_AGENT_4_POLISHER, LS_THINKING_AGENT_5_CLEANER, LS_THINKING_AGENT_6_TITLER, LS_THINKING_AGENT_C_CONSOLIDATOR, LS_THINKING_ENABLED, LS_THEME, LS_VOCAB_LOOKUPS, LS_TTS_VOICE, LS_TTS_GENDER, LS_TTS_SOURCE, saveToLocalStorage, loadFromLocalStorage, clearAllAppData, trackVocabularyLookup, loadVocabularyLookupData, removeFromLocalStorage } from './localStorage.js';
// --- Imports from Modules ---
import appState from './appState.js';
import { STORY_CRAFTING_GUIDES, STORY_FRAMEWORK_SUMMARIES } from './prompts/story_crafting_guides.js';
import { STORY_STYLE_GUIDES, STORY_STYLE_SUMMARIES } from './prompts/author_styles.js';
import { ADJUSTMENT_MODULES, getSensitivityGuidance } from './prompts/adjustment_modules.js';
import { READING_AGE_ADJUSTMENT_TEXT_TEMPLATE } from './prompts/agent_prompts.js';
import { HELP_TOPICS, HELP_TOPIC_ORDER } from './prompts/help_content.js';
import { parseCharacters, countWords, normalizeVocabularyWord } from './utils.js';
import { initUIElements, updateStatusInStoryOutput, clearStoryOutput, displayFinalStoryOutput, displayErrorInStoryOutput, showTemporaryToast, updateFrameworkSummaryDisplay, updateAuthorStyleSummaryDisplay, disableMainControls, enableMainControls, applyStoryFontSize, populateDropdown, formatStoryAsHtml } from './ui.js';
// --- New Pipeline Module Import ---
import { runPipeline, getStoryGenerationPipelineConfig, getElaborationPipelineConfig } from './pipeline.js';
import { lookupWord } from './wiktionary.js';
// --- Phonics Module Import ---
import { ensureRitaLoaded, buildPhonicsAssist, ttsHintForPhoneme } from './phonics.js';
import { saveStoryToLibrary } from './storyLibrary.js';
// Expose ttsHintForPhoneme for use by phoneme-only playback
window.__phonicsHelpers = { ttsHintForPhoneme };
// --- Global DOM Element Variables ---
let modalApiKeyInput, charactersInput, audienceInput, craftingFrameworkSelect, frameworkSummaryDiv, generateButton, storyTitleDiv, storyOutputDiv;
let settingsModal, settingsButton, cancelSettingsButton, saveSettingsButton, modalModelSelect, downloadChatLogButton, minApiIntervalInput;
let copyStoryButton, saveStoryButton, elaborateStoryButton, decreaseFontButton, increaseFontButton;
let openStoryButton, storyFileInput;
let userSuggestionsTextarea;
let enableReadingAgeAdjustmentCheckbox, targetReadingAgeSlider, readingAgeSliderContainer;
let readingAgeMinInput, readingAgeMaxInput;
let enableConsolidatorCheckbox;
let authorStyleSelect, styleSummaryDiv;
let toneSelect, pacingSelect, humorSelect, emotionSelect;
let agentTogglesContainer, masterThinkingToggle, agent1CrafterToggle, agent2ElaboratorToggle, agent3ReviewerToggle, agent4PolisherToggle, agent5CleanerToggle, agent6TitlerToggle, agentCConsolidatorToggle;
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
// Assist tab and settings export controls
let assistTabButton, exportVocabularyButton, clearVocabularyButton;
let assistEmptyState, assistWordState, assistWordHeading, assistDefinitions, assistSynonyms, assistAntonyms, assistIpa;
let assistSpeakButton, assistLoadingState, assistErrorState, assistSource, assistLookupCount;
let loadSampleStoryButton;
let ttsVoiceSelect, ttsGenderSelect, ttsSourceSelect;
let readAloudButton, stopReadAloudButton, readAloudLabel;
// Phonics Assist DOM elements
let assistPhonicsSection, phonicsChunks, phonicsSoundOutButton, phonicsPhonemesRow, phonicsDisclaimer, phonicsLoadingState;
// Shared tab state
let tabButtons = [];
let tabPanels = [];
// Assist interaction state
let selectedStoryWordElement = null;
let selectedAssistWord = "";
let selectedAssistWordNormalized = "";
let assistLookupRequestToken = 0;
let currentAssistAudioUrl = '';
let currentAssistAudio = null;
// Phonics Assist state
let currentPhonicsAssist = null;
let isSoundingOut = false;
let soundOutAbortController = null;
let currentPhonicsAudio = null;
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
// --- Sample Story for Testing ---
const SAMPLE_STORY_TEXT = `In a cottage where the roof was thatched with thick bundles of dried lavender and the chimney puffed out violet smoke, lived Mistress Mumble-Wick. She was a witch of quiet, comfortable habits. Every morning, she used a long wooden spoon to stir the heavy morning clouds until they rained just enough to water her spice-bushels. Beside her, perched on a fence post made of twisted pearwood, sat Skitter. Skitter was a sparrow with feathers the color of a toasted marshmallow and a chest that puffed out with pride whenever he began his morning chores.

Their life followed the happy rhythm of tea and tunes. Mistress Mumble-Wick owned a collection of copper kettles that whistled different melodies depending on the breeze. One hummed like a cello when the wind blew from the north, and another sang like a flute during a southern gust. Skitter would match their pitch, weaving a bright, looping melody into the air, while Mumble-Wick hummed along. Her voice sounded like the crackle of a cozy hearth on a winter night. She was his whole world, and the sturdy stone wall of the garden was the only boundary he ever needed.

One Tuesday, while the sun sat high and the bees were heavy and drowsy with nectar, a cold wind hissed through the iron gate. A shadow-thief, known as the Silence-Snatcher, slid across the grass. It had no face, only a hood made of swirling soot and a hunger for things that made noise. With a sudden, jagged movement, it reached out and plucked the sound right from Mumble-Wick\u2019s throat. The witch gasped, her mouth opening wide, but no sound came out. The Snatcher stuffed the silver thread of her voice into a jar of frozen smoke and vanished toward the Iron-Thorn Woods.

Mumble-Wick\u2019s face turned the color of dry parchment. She pointed a trembling finger at the sun, which was beginning its slow, heavy slide toward the horizon. Then she pointed at the woods. Skitter understood the silent warning. If her voice was not returned to her throat before the final sliver of the sun vanished, the silence would settle into her bones like a deep winter frost, turning her into a garden statue of cold, grey stone.

Skitter\u2019s tiny claws dug deep into the pearwood fence until the bark nipped at his skin. A tremor rippled through his wings, making his flight feathers rattle like dry leaves. This is terror, he realized. His heart drummed against his ribs like a moth beating its wings against a glass windowpane. \u201CI am a speck of dust in a world of giants,\u201D he thought, looking at the jagged trees beyond the safety of the wall. \u201CThe shadows will swallow me before I even find the path.\u201D

But the clock on the cottage mantle struck four, its chimes sounding dull and thudding, as if the clock itself was losing its spirit. Time was a falling leaf, and he had to catch it. With a sharp, desperate breath, Skitter launched himself into the air.

The Iron-Thorn Woods were not like the garden. As he crossed the threshold, the wind roared like a bruised beast, the air bit with the sharp tang of rusted metal, and the jagged bark of the trees scraped his belly like dragon scales. The forest tried to shove him back, its branches acting as long, tangled fingers. Skitter struggled, his wings aching, until he remembered the North-Wind kettle. He closed his eyes for a heartbeat and shaped his throat to mimic that low, cello-like drone. By matching the vibration of the gale, he found he could slide through the wind\u2019s resistance as if he were part of the storm itself.

High above, a Great Horned Owl drifted across the purple sky. Its shadow was a vast, dark blanket that draped over the trees, making Skitter feel smaller than a single pine needle. He pulled his wings tight to his body and huddled on a swaying, thorny branch, freezing as the owl\u2019s golden eyes scanned the brush. For a long minute, he watched the garden wall in the distance. It looked so warm and golden. \u201CI could go back,\u201D he whispered to the wind. \u201CI am too small for a forest this big.\u201D

Then he remembered the look in Mumble-Wick\u2019s eyes\u2014the way she had shared her cinnamon biscuits and stirred the clouds just for him. He took a deep breath of the pine-scented air, pushed off the branch, and dived deeper into the heart of the woods, using his new understanding of the forest\u2019s rhythm to dodge the snapping twigs.

He found the Silence-Snatcher in the belly of a hollow oak tree. The creature sat on a pile of stolen echoes, clutching the jar of frozen smoke. Inside, the silver thread shimmered with a soft, pulsing light, shivering with the trapped music of Mumble-Wick\u2019s voice.

\u201CGive it back,\u201D Skitter tried to scream, but the words felt heavy in his beak.

The Snatcher looked up, its soot-cloak swirling like ink dropped in a bucket of water. It was a creature of the void, and it wanted the one thing it could never possess: beauty. It leaned close to Skitter, and its breath smelled of burnt matches and stale winter. The creature gestured to the sparrow\u2019s throat and then to the jar. It was a trade. The witch\u2019s voice for the sparrow\u2019s song.

Skitter hesitated. His song was his pride. It was how he greeted the morning and how he told the world he was alive. If he gave it away, he would be just another quiet bird in the brush. \u201CIf I lose my music, will I still be Skitter?\u201D he wondered. The doubt felt like a cold stone in his belly. He looked at the Snatcher\u2019s empty, dark hood, felt the gritty texture of the ash on the floor, and heard the frantic, high-pitched hum of the trapped voice.

He saw the orange sun dipping lower through the tree-hollow and he nodded. He opened his beak and let out one final, magnificent trill. It was a sound of summer mornings, honey-soaked biscuits, and the smell of rain on dry grass. As the last note drifted away, a cold, hollowing ache settled behind his beak, as if a silver string had been unspooled from his very heart. He felt lighter, but emptier, a vessel with the liquid poured out. The sensation was a sharp, phantom itch where his music used to live.

The Snatcher caught the melody in a net of shadows, its soot-fingers twitching with delight. The jar of frozen smoke shattered with a sound like a thousand mirrors breaking at once. The silver thread leaped out, winding itself around Skitter\u2019s leg like a ribbon of living starlight.

Skitter did not wait for the Snatcher to change its mind. He flew. He could no longer sing to keep his spirits up, and his throat felt dry and tight, as if he had swallowed a heavy river pebble. He flew until his muscles burned and his lungs ached for air. The sun was a thin, bleeding sliver of orange on the edge of the world when he finally burst through the garden gate.

Mistress Mumble-Wick was sitting on the porch steps. Her skin was already turning a dull, flat grey, and her fingers were stiff like river rocks. Skitter landed on her shoulder, his chest heaving, and pressed his leg against the cold skin of her neck. The silver thread recognized its home. It slid from his feathers and dived back into the witch\u2019s throat.

Mumble-Wick took a deep, refreshing breath. The grey faded, replaced by the warm glow of life. \u201COh, my brave little spark,\u201D she whispered, her voice returning like a flood of warm honey.

Skitter tried to answer with his usual bell-like melody. He wanted to tell her about the wind and the owl and the dark oak. Instead, a small, gravelly \u201Ccrrr-ak\u201D came out. It was a rough, dry sound, like two stones rubbing together. He tucked his head under his wing, ashamed of the raspy noise.

Mumble-Wick lifted him gently in her soft, flour-dusted hands. She did not look disappointed. Her eyes shone like wet pebbles in a mountain brook. \u201CYour song is gone, Skitter,\u201D she said softly, \u201Cbut your heart has grown loud enough for the whole forest to hear.\u201D

That night, the Great Horned Owl flew over the garden again, its shadow silent and heavy against the white moon. In the past, Skitter would have hidden under a lavender leaf, shivering until the dawn. Instead, he hopped onto the very highest chimney pot, right where the violet smoke curled into the air. He looked at the stars, felt the cool night breeze ruffle his toasted-marshmallow feathers, and let out a bold, raspy chirp. The owl kept flying, and Skitter stayed exactly where he was, a small bird standing tall against the endless, sparkling sky.`;
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
    }
    else {
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
    if (!targetReadingAgeSlider || !readingAgeMinInput || !readingAgeMaxInput || !enableReadingAgeAdjustmentCheckbox || !readingAgeSliderContainer)
        return;
    const minAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MIN) || DEFAULT_READING_AGE_MIN.toString(), 10);
    const maxAge = parseInt(loadFromLocalStorage(LS_READING_AGE_MAX) || DEFAULT_READING_AGE_MAX.toString(), 10);
    targetReadingAgeSlider.min = minAge.toString();
    targetReadingAgeSlider.max = maxAge.toString();
    let currentValue = parseInt(targetReadingAgeSlider.value, 10);
    if (isNaN(currentValue) || currentValue < minAge)
        currentValue = minAge;
    if (currentValue > maxAge)
        currentValue = maxAge;
    targetReadingAgeSlider.value = currentValue.toString();
    const isEnabled = enableReadingAgeAdjustmentCheckbox.checked;
    targetReadingAgeSlider.disabled = !isEnabled;
    readingAgeSliderContainer.classList.toggle('disabled', !isEnabled);
}
function updateAgentTogglesUI() {
    if (!modalModelSelect || !agentTogglesContainer)
        return;
    const selectedModelId = modalModelSelect.value;
    const model = AVAILABLE_MODELS[selectedModelId];
    const canThink = model ? model.supportsThinking : false;
    const masterEnabled = masterThinkingToggle ? masterThinkingToggle.checked : false;
    // Disable everything if the model can't think, or master is off
    const active = canThink && masterEnabled;
    agentTogglesContainer.classList.toggle('disabled', !active);
    agentTogglesContainer.style.display = masterEnabled ? '' : 'none';
    if (masterThinkingToggle)
        masterThinkingToggle.disabled = !canThink;
}
function initializeTabSystem() {
    tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled)
                return;
            setActiveTab(btn.dataset.tab || '');
        });
    });
}
function setActiveTab(targetTab) {
    if (!targetTab)
        return false;
    const targetButton = tabButtons.find(btn => btn.dataset.tab === targetTab);
    if (!targetButton || targetButton.disabled)
        return false;
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    targetButton.classList.add('active');
    targetButton.setAttribute('aria-selected', 'true');
    tabPanels.forEach(panel => panel.classList.remove('active'));
    const targetPanel = document.getElementById(`tab-${targetTab}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    return true;
}
function setAssistTabEnabled(isEnabled) {
    if (!assistTabButton)
        return;
    assistTabButton.disabled = !isEnabled;
    assistTabButton.setAttribute('aria-disabled', (!isEnabled).toString());
    if (!isEnabled && assistTabButton.classList.contains('active')) {
        setActiveTab('story');
    }
}
function clearSelectedStoryWordHighlight() {
    if (!selectedStoryWordElement)
        return;
    selectedStoryWordElement.classList.remove('is-selected');
    selectedStoryWordElement = null;
}
function resetAssistPanelToEmptyState() {
    if (assistErrorState) {
        assistErrorState.classList.add('hidden');
        assistErrorState.textContent = '';
    }
    if (assistLoadingState) {
        assistLoadingState.classList.add('hidden');
    }
    if (assistWordHeading)
        assistWordHeading.textContent = '';
    if (assistDefinitions)
        assistDefinitions.innerHTML = '';
    if (assistSynonyms)
        assistSynonyms.innerHTML = '';
    if (assistAntonyms)
        assistAntonyms.innerHTML = '';
    if (assistIpa)
        assistIpa.textContent = '';
    if (assistSource)
        assistSource.textContent = '';
    if (assistLookupCount) {
        assistLookupCount.textContent = '';
        assistLookupCount.classList.add('hidden');
    }
    if (assistWordState)
        assistWordState.classList.add('hidden');
    if (assistEmptyState)
        assistEmptyState.classList.remove('hidden');
    if (assistSpeakButton)
        assistSpeakButton.disabled = true;
    currentAssistAudioUrl = '';
    // Reset phonics
    if (assistPhonicsSection)
        assistPhonicsSection.classList.add('hidden');
    resetPhonicsSection();
    // Reset phonics section
    if (assistPhonicsSection)
        assistPhonicsSection.classList.add('hidden');
    resetPhonicsSection();
}
function setAssistLoadingState(isLoading) {
    if (!assistLoadingState)
        return;
    assistLoadingState.classList.toggle('hidden', !isLoading);
}
function setAssistErrorState(message) {
    if (!assistErrorState)
        return;
    if (message) {
        assistErrorState.textContent = message;
        assistErrorState.classList.remove('hidden');
    }
    else {
        assistErrorState.textContent = '';
        assistErrorState.classList.add('hidden');
    }
}
function prepareAssistPanelForWord(word) {
    if (assistEmptyState)
        assistEmptyState.classList.add('hidden');
    if (assistWordState)
        assistWordState.classList.remove('hidden');
    if (assistWordHeading)
        assistWordHeading.textContent = word;
    if (assistDefinitions)
        assistDefinitions.innerHTML = '';
    if (assistSynonyms)
        assistSynonyms.innerHTML = '';
    if (assistAntonyms)
        assistAntonyms.innerHTML = '';
    if (assistIpa)
        assistIpa.textContent = '';
    if (assistSource)
        assistSource.textContent = '';
    if (assistLookupCount) {
        assistLookupCount.textContent = '';
        assistLookupCount.classList.add('hidden');
    }
    if (assistSpeakButton)
        assistSpeakButton.disabled = true;
    currentAssistAudioUrl = '';
    // Reset phonics for new word
    if (assistPhonicsSection)
        assistPhonicsSection.classList.add('hidden');
    resetPhonicsSection();
    setAssistErrorState('');
    setAssistLoadingState(true);
}
function renderAssistResult(assistData) {
    // Definitions grouped by part of speech
    if (assistDefinitions) {
        assistDefinitions.innerHTML = '';
        if (assistData.definitions && assistData.definitions.length > 0) {
            for (const group of assistData.definitions) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'assist-definitions-group';
                const posLabel = document.createElement('div');
                posLabel.className = 'assist-definitions-pos';
                posLabel.textContent = group.partOfSpeech;
                groupDiv.appendChild(posLabel);
                const ol = document.createElement('ol');
                ol.className = 'assist-definitions-list';
                for (const gloss of group.glosses) {
                    const li = document.createElement('li');
                    li.textContent = gloss;
                    ol.appendChild(li);
                }
                groupDiv.appendChild(ol);
                assistDefinitions.appendChild(groupDiv);
            }
        }
        else {
            assistDefinitions.innerHTML = '<p class="assist-none">No definition found.</p>';
        }
    }
    // Synonyms as clickable chips
    renderWordChips(assistSynonyms, assistData.synonyms);
    // Antonyms as clickable chips
    renderWordChips(assistAntonyms, assistData.antonyms);
    // IPA with dialect label
    if (assistIpa) {
        const dialectLabels = { uk: 'UK', us: 'US' };
        const dialectTag = assistData.ipaDialect ? ` (${dialectLabels[assistData.ipaDialect] || assistData.ipaDialect})` : '';
        assistIpa.textContent = assistData.ipa ? `${assistData.ipa}${dialectTag}` : '';
    }
    // Audio URL
    currentAssistAudioUrl = (assistData.audioUrl && assistData.audioUrl.startsWith('http')) ? assistData.audioUrl : '';
    if (assistSpeakButton) {
        assistSpeakButton.disabled = !selectedAssistWord || (!currentAssistAudioUrl && !('speechSynthesis' in window));
    }
    // Source attribution
    if (assistSource) {
        const sourceNames = { freedict: 'Free Dictionary', wiktionary: 'Wiktionary', cache: 'Cached' };
        assistSource.textContent = assistData.source ? `Source: ${sourceNames[assistData.source] || assistData.source}` : '';
    }
    // Lookup count badge
    updateLookupCountBadge(selectedAssistWordNormalized);
    setAssistLoadingState(false);
}
function renderWordChips(container, words) {
    if (!container)
        return;
    container.innerHTML = '';
    if (!words || words.length === 0) {
        container.innerHTML = '<span class="assist-none">None found</span>';
        return;
    }
    for (const word of words) {
        const chip = document.createElement('span');
        chip.className = 'assist-word-chip';
        chip.dataset.word = word;
        chip.textContent = word;
        container.appendChild(chip);
    }
}
function updateLookupCountBadge(normalizedWord) {
    if (!assistLookupCount)
        return;
    const vocabData = loadVocabularyLookupData();
    const entry = vocabData[normalizedWord];
    if (entry && entry.lookupCount > 1) {
        assistLookupCount.textContent = `You've looked this up ${entry.lookupCount} times`;
        assistLookupCount.classList.remove('hidden');
    }
    else {
        assistLookupCount.textContent = '';
        assistLookupCount.classList.add('hidden');
    }
}
function cancelAssistSpeech() {
    if (currentAssistAudio) {
        currentAssistAudio.pause();
        currentAssistAudio.currentTime = 0;
        currentAssistAudio = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    // Abort any in-progress sound-out sequence
    stopSoundOut();
    // Reset read-aloud button state if it was active
    if (isReadingAloud) {
        isReadingAloud = false;
        if (readAloudButton)
            readAloudButton.classList.remove('hidden');
        if (stopReadAloudButton)
            stopReadAloudButton.classList.add('hidden');
    }
}
// ─── Phonics Assist Functions ────────────────────────────────────────────────
/**
 * Start phonics lookup for a word (runs in parallel with dictionary lookup).
 * Lazily loads RiTa on first use.
 */
async function loadPhonicsForWord(word, normalizedWord) {
    if (!assistPhonicsSection)
        return;
    // Reset phonics UI
    resetPhonicsSection();
    if (phonicsLoadingState) {
        phonicsLoadingState.classList.remove('hidden');
    }
    assistPhonicsSection.classList.remove('hidden');
    try {
        await ensureRitaLoaded();
        // Guard against stale request (user clicked a different word)
        if (normalizedWord !== selectedAssistWordNormalized)
            return;
        const assist = buildPhonicsAssist(word);
        currentPhonicsAssist = assist;
        // Guard again after build
        if (normalizedWord !== selectedAssistWordNormalized)
            return;
        renderPhonicsSection(assist);
    }
    catch (err) {
        console.warn('Phonics assist unavailable:', err.message);
        // Hide phonics section gracefully if RiTa fails to load
        if (assistPhonicsSection)
            assistPhonicsSection.classList.add('hidden');
    }
    finally {
        if (phonicsLoadingState)
            phonicsLoadingState.classList.add('hidden');
    }
}
function resetPhonicsSection() {
    currentPhonicsAssist = null;
    stopSoundOut();
    if (phonicsChunks)
        phonicsChunks.innerHTML = '';
    if (phonicsPhonemesRow) {
        phonicsPhonemesRow.innerHTML = '';
        phonicsPhonemesRow.classList.add('hidden');
    }
    if (phonicsDisclaimer) {
        phonicsDisclaimer.textContent = '';
        phonicsDisclaimer.classList.add('hidden');
    }
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.classList.remove('is-playing');
        phonicsSoundOutButton.textContent = '▶ Sound it out';
    }
}
function renderPhonicsSection(assist) {
    if (!assistPhonicsSection || !phonicsChunks)
        return;
    if (assist.fallback || assist.confidence < 0.4) {
        // Fallback: show phoneme-only chips
        renderPhonemeOnlyChips(assist);
        return;
    }
    // Render grapheme-phoneme chunk chips
    phonicsChunks.innerHTML = '';
    assist.chunks.forEach((chunk, idx) => {
        const el = document.createElement('span');
        el.className = 'phonics-chunk';
        el.dataset.index = String(idx);
        const graphemeSpan = document.createElement('span');
        graphemeSpan.className = 'phonics-grapheme';
        graphemeSpan.textContent = chunk.grapheme;
        el.appendChild(graphemeSpan);
        if (chunk.phoneme) {
            const phonemeSpan = document.createElement('span');
            phonemeSpan.className = 'phonics-phoneme';
            phonemeSpan.textContent = chunk.phoneme;
            el.appendChild(phonemeSpan);
        }
        el.addEventListener('click', () => handlePhonicsChunkClick(idx));
        phonicsChunks.appendChild(el);
    });
    // Show disclaimer for medium confidence
    if (assist.confidence >= 0.4 && assist.confidence < 0.6 && phonicsDisclaimer) {
        phonicsDisclaimer.textContent = 'This breakdown is approximate.';
        phonicsDisclaimer.classList.remove('hidden');
    }
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.style.display = '';
    }
    assistPhonicsSection.classList.remove('hidden');
}
function renderPhonemeOnlyChips(assist) {
    if (!phonicsPhonemesRow || !assist.phonemes || assist.phonemes.length === 0) {
        if (assistPhonicsSection)
            assistPhonicsSection.classList.add('hidden');
        return;
    }
    // Hide grapheme row, show phoneme-only row
    if (phonicsChunks)
        phonicsChunks.innerHTML = '';
    phonicsPhonemesRow.innerHTML = '';
    phonicsPhonemesRow.classList.remove('hidden');
    assist.phonemes.forEach((ph, idx) => {
        const chip = document.createElement('span');
        chip.className = 'phonics-phoneme-chip';
        chip.dataset.index = String(idx);
        chip.textContent = ph;
        chip.addEventListener('click', () => speakPhonemeOnly(ph, idx));
        phonicsPhonemesRow.appendChild(chip);
        if (idx < assist.phonemes.length - 1) {
            const sep = document.createTextNode(' · ');
            phonicsPhonemesRow.appendChild(sep);
        }
    });
    if (phonicsDisclaimer) {
        phonicsDisclaimer.textContent = 'Showing sounds only — letter breakdown unavailable for this word.';
        phonicsDisclaimer.classList.remove('hidden');
    }
    // Sound-out still works on phonemes
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.style.display = '';
    }
    assistPhonicsSection.classList.remove('hidden');
}
function handlePhonicsChunkClick(index) {
    if (!currentPhonicsAssist || !currentPhonicsAssist.chunks[index])
        return;
    const chunk = currentPhonicsAssist.chunks[index];
    if (!chunk.phoneme && !chunk.ttsHint)
        return;
    cancelAssistSpeech();
    highlightPhonicsChunk(index);
    speakPhonicsSound(chunk.phoneme, chunk.ttsHint, () => {
        clearPhonicsHighlight();
    });
}
function speakPhonemeOnly(phoneme, index) {
    cancelAssistSpeech();
    // Highlight the phoneme chip
    if (phonicsPhonemesRow) {
        phonicsPhonemesRow.querySelectorAll('.phonics-phoneme-chip').forEach(el => el.classList.remove('is-highlighted'));
        const chip = phonicsPhonemesRow.querySelector(`[data-index="${index}"]`);
        if (chip)
            chip.classList.add('is-highlighted');
    }
    // Use ttsHint mapping from phonics module for better pronunciation
    const { ttsHintForPhoneme } = window.__phonicsHelpers || {};
    const hint = ttsHintForPhoneme ? ttsHintForPhoneme(phoneme) : phoneme;
    speakPhonicsSound(phoneme, hint, () => {
        if (phonicsPhonemesRow) {
            phonicsPhonemesRow.querySelectorAll('.phonics-phoneme-chip').forEach(el => el.classList.remove('is-highlighted'));
        }
    });
}
// ─── Phoneme Audio File Cache ────────────────────────────────────────────────
// Tracks which phoneme .mp3 files exist in the sounds/ directory.
// Values: true = confirmed present, false = confirmed missing, undefined = not checked yet.
const phonemeAudioCache = {};
const SOUNDS_DIR = './sounds/';
/**
 * Build the filename for a phoneme audio file.
 * Phonemes like "sh ah n" become "sh ah n.mp3".
 */
function phonemeAudioPath(phoneme) {
    if (!phoneme)
        return null;
    // Encode spaces for URL safety (e.g. "sh ah n" → "sh%20ah%20n.mp3")
    return SOUNDS_DIR + encodeURIComponent(phoneme) + '.mp3';
}
/**
 * Try to play a local phoneme audio file. Returns a promise.
 * Resolves with true if audio played successfully, false if file missing.
 */
function tryPlayPhonemeAudio(phoneme) {
    return new Promise((resolve) => {
        if (!phoneme) {
            resolve(false);
            return;
        }
        // Already known to be missing
        if (phonemeAudioCache[phoneme] === false) {
            resolve(false);
            return;
        }
        const path = phonemeAudioPath(phoneme);
        if (!path) {
            resolve(false);
            return;
        }
        const audio = new Audio(path);
        currentPhonicsAudio = audio;
        audio.addEventListener('canplaythrough', () => {
            phonemeAudioCache[phoneme] = true;
            audio.play()
                .then(() => {
                audio.addEventListener('ended', () => { currentPhonicsAudio = null; resolve(true); }, { once: true });
            })
                .catch(() => { currentPhonicsAudio = null; resolve(false); });
        }, { once: true });
        audio.addEventListener('error', () => {
            phonemeAudioCache[phoneme] = false;
            currentPhonicsAudio = null;
            resolve(false);
        }, { once: true });
        // Timeout: if neither event fires within 3s, assume missing
        setTimeout(() => {
            if (phonemeAudioCache[phoneme] === undefined) {
                phonemeAudioCache[phoneme] = false;
            }
            resolve(false);
        }, 3000);
    });
}
/**
 * Play a phoneme sound: tries local MP3 first, falls back to browser TTS.
 * @param {string} phoneme  - The phoneme key (used for file lookup, e.g. "ay", "sh ah n")
 * @param {string} ttsHint  - Fallback text for browser TTS (e.g. "eye", "shun")
 * @param {Function} onEnd  - Called when playback finishes
 */
async function speakPhonicsSound(phoneme, ttsHint, onEnd) {
    // Try local audio file first
    const played = await tryPlayPhonemeAudio(phoneme);
    if (played) {
        onEnd?.();
        return;
    }
    // Fall back to browser TTS
    speakPhonicsHintTTS(ttsHint || phoneme, onEnd);
}
/**
 * Speak a short TTS hint string using the user's chosen voice (fallback).
 * Returns nothing; calls onEnd when done.
 */
function speakPhonicsHintTTS(text, onEnd) {
    if (!text || !('speechSynthesis' in window)) {
        onEnd?.();
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getSelectedTTSVoice();
    if (voice) {
        utterance.voice = voice;
        if (voice.lang)
            utterance.lang = voice.lang;
    }
    else {
        utterance.lang = 'en-US';
    }
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
}
function highlightPhonicsChunk(index) {
    if (!phonicsChunks)
        return;
    phonicsChunks.querySelectorAll('.phonics-chunk').forEach(el => el.classList.remove('is-highlighted'));
    const target = phonicsChunks.querySelector(`[data-index="${index}"]`);
    if (target)
        target.classList.add('is-highlighted');
}
function clearPhonicsHighlight() {
    if (phonicsChunks) {
        phonicsChunks.querySelectorAll('.phonics-chunk').forEach(el => el.classList.remove('is-highlighted'));
    }
    if (phonicsPhonemesRow) {
        phonicsPhonemesRow.querySelectorAll('.phonics-phoneme-chip').forEach(el => el.classList.remove('is-highlighted'));
    }
}
/**
 * Sequential "karaoke" playback of all chunks/phonemes.
 */
async function startSoundOut() {
    if (!currentPhonicsAssist)
        return;
    const assist = currentPhonicsAssist;
    const useFallback = assist.fallback || assist.confidence < 0.4;
    // Determine items to iterate (each item carries phoneme + ttsHint for audio lookup)
    let items;
    if (useFallback && assist.phonemes) {
        items = assist.phonemes.map(ph => {
            const { ttsHintForPhoneme } = window.__phonicsHelpers || {};
            return { phoneme: ph, hint: ttsHintForPhoneme ? ttsHintForPhoneme(ph) : ph, type: 'phoneme' };
        });
    }
    else if (assist.chunks && assist.chunks.length > 0) {
        items = assist.chunks.map(ch => ({ phoneme: ch.phoneme, hint: ch.ttsHint, type: 'chunk' }));
    }
    else {
        return;
    }
    cancelAssistSpeech();
    isSoundingOut = true;
    const abortCtrl = new AbortController();
    soundOutAbortController = abortCtrl;
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.classList.add('is-playing');
        phonicsSoundOutButton.textContent = '⏹ Stop';
    }
    try {
        for (let i = 0; i < items.length; i++) {
            if (abortCtrl.signal.aborted)
                break;
            // Highlight
            if (items[i].type === 'chunk') {
                highlightPhonicsChunk(i);
            }
            else if (phonicsPhonemesRow) {
                phonicsPhonemesRow.querySelectorAll('.phonics-phoneme-chip').forEach(el => el.classList.remove('is-highlighted'));
                const chip = phonicsPhonemesRow.querySelector(`[data-index="${i}"]`);
                if (chip)
                    chip.classList.add('is-highlighted');
            }
            // Speak and wait (try local MP3 first, then TTS)
            if (items[i].phoneme || items[i].hint) {
                await new Promise((resolve) => {
                    if (abortCtrl.signal.aborted) {
                        resolve();
                        return;
                    }
                    speakPhonicsSound(items[i].phoneme, items[i].hint, resolve);
                    // Safety timeout in case onend never fires
                    setTimeout(resolve, 2000);
                });
            }
            // Brief pause between chunks
            if (!abortCtrl.signal.aborted && i < items.length - 1) {
                await new Promise(r => setTimeout(r, 120));
            }
        }
    }
    finally {
        isSoundingOut = false;
        soundOutAbortController = null;
        clearPhonicsHighlight();
        if (phonicsSoundOutButton) {
            phonicsSoundOutButton.classList.remove('is-playing');
            phonicsSoundOutButton.textContent = '▶ Sound it out';
        }
    }
}
function stopSoundOut() {
    if (soundOutAbortController) {
        soundOutAbortController.abort();
        soundOutAbortController = null;
    }
    // Stop any in-progress local audio playback
    if (currentPhonicsAudio) {
        try {
            currentPhonicsAudio.pause();
            currentPhonicsAudio.currentTime = 0;
        }
        catch (_) { }
        currentPhonicsAudio = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isSoundingOut = false;
    clearPhonicsHighlight();
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.classList.remove('is-playing');
        phonicsSoundOutButton.textContent = '▶ Sound it out';
    }
}
function handleSoundOutClick() {
    if (isSoundingOut) {
        stopSoundOut();
    }
    else {
        startSoundOut();
    }
}
function getSelectedTTSVoice() {
    if (!('speechSynthesis' in window))
        return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0)
        return null;
    const savedVoiceName = (loadFromLocalStorage(LS_TTS_VOICE) || '').trim();
    if (savedVoiceName) {
        const exactMatches = voices
            .filter(v => v.name === savedVoiceName)
            .sort(compareVoicesForStability);
        if (exactMatches.length > 0)
            return exactMatches[0];
    }
    // In "Auto" mode, prefer Google UK English Female if available (Chrome),
    // then fall back to a deterministic voice to prevent rotation across utterances.
    const selectedGender = (ttsGenderSelect?.value || loadFromLocalStorage(LS_TTS_GENDER) || 'female').toLowerCase();
    const englishVoices = voices
        .filter(v => typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('en'))
        .sort(compareVoicesForStability);
    // Try Google UK English Female first (high-quality, available in Chrome)
    const googleUKFemale = englishVoices.find(v => v.name === 'Google UK English Female');
    if (googleUKFemale && selectedGender === 'female')
        return googleUKFemale;
    const genderMatches = englishVoices.filter(v => classifyVoiceGender(v) === selectedGender);
    if (genderMatches.length > 0)
        return genderMatches[0];
    if (englishVoices.length > 0)
        return englishVoices[0];
    const anyVoices = [...voices].sort(compareVoicesForStability);
    return anyVoices[0] || null;
}
// Heuristic gender classification for TTS voices
function classifyVoiceGender(voice) {
    const name = (voice?.name || '').toLowerCase();
    const femalePatterns = /\b(female|woman|girl|zira|hazel|susan|jenny|linda|aria|sara|elsa|jenny|catherine|heera|tracy|irina|paulina|sabina|helena|monica|lucia|ayumi|hanhan|huihui|yaoyao|zhiwei|miren|hedda)\b/;
    const malePatterns = /\b(male|man|boy|david|mark|james|george|richard|daniel|sean|ravi|frank|cosimo|pablo|ivan|naayf|tolga|bengt|andika|hemant|filip)\b/;
    if (femalePatterns.test(name))
        return 'female';
    if (malePatterns.test(name))
        return 'male';
    // Default guess: voices with higher-pitched-sounding names tend to be female
    return 'female';
}
function compareVoicesForStability(a, b) {
    const aLang = (a?.lang || '').toLowerCase();
    const bLang = (b?.lang || '').toLowerCase();
    const aIsEnglish = aLang.startsWith('en');
    const bIsEnglish = bLang.startsWith('en');
    if (aIsEnglish !== bIsEnglish)
        return aIsEnglish ? -1 : 1;
    const aLocal = Boolean(a?.localService);
    const bLocal = Boolean(b?.localService);
    if (aLocal !== bLocal)
        return aLocal ? -1 : 1;
    const aDefault = Boolean(a?.default);
    const bDefault = Boolean(b?.default);
    if (aDefault !== bDefault)
        return aDefault ? -1 : 1;
    const nameCompare = (a?.name || '').localeCompare(b?.name || '');
    if (nameCompare !== 0)
        return nameCompare;
    return (a?.voiceURI || '').localeCompare(b?.voiceURI || '');
}
function populateTTSVoiceDropdown() {
    if (!ttsVoiceSelect || !ttsGenderSelect || !('speechSynthesis' in window))
        return;
    const voices = window.speechSynthesis.getVoices();
    const selectedGender = ttsGenderSelect.value || 'female';
    const savedVoiceName = loadFromLocalStorage(LS_TTS_VOICE);
    // Filter to English voices matching selected gender
    const englishVoices = voices
        .filter(v => typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('en'))
        .filter(v => classifyVoiceGender(v) === selectedGender)
        .sort(compareVoicesForStability);
    ttsVoiceSelect.innerHTML = '<option value="">Auto (best available)</option>';
    for (const voice of englishVoices) {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name}${voice.localService ? '' : ' (online)'}`;
        if (voice.name === savedVoiceName)
            opt.selected = true;
        ttsVoiceSelect.appendChild(opt);
    }
    // If no English voices match the gender, show all English voices
    if (englishVoices.length === 0) {
        const allEnglish = voices
            .filter(v => typeof v.lang === 'string' && v.lang.toLowerCase().startsWith('en'))
            .sort(compareVoicesForStability);
        for (const voice of allEnglish) {
            const opt = document.createElement('option');
            opt.value = voice.name;
            opt.textContent = `${voice.name}${voice.localService ? '' : ' (online)'}`;
            if (voice.name === savedVoiceName)
                opt.selected = true;
            ttsVoiceSelect.appendChild(opt);
        }
    }
}
function updateBrowserVoiceSettingsVisibility() {
    const container = document.getElementById('browserVoiceSettings');
    if (!container)
        return;
    const source = ttsSourceSelect ? ttsSourceSelect.value : 'browser';
    container.style.display = source === 'browser' ? '' : 'none';
}
function speakWithTTS(word) {
    if (!('speechSynthesis' in window))
        return;
    const utterance = new SpeechSynthesisUtterance(word);
    const voice = getSelectedTTSVoice();
    if (voice) {
        utterance.voice = voice;
        if (voice.lang)
            utterance.lang = voice.lang;
    }
    else {
        utterance.lang = 'en-US';
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}
// Prime the TTS audio pipeline with a near-silent utterance so the first
// real pronunciation isn't swallowed or played at reduced volume.
let ttsPrimed = false;
function primeTTSAudio() {
    if (ttsPrimed || !('speechSynthesis' in window))
        return;
    ttsPrimed = true;
    const primer = new SpeechSynthesisUtterance('.');
    primer.volume = 0.01; // barely audible
    primer.rate = 2;
    const voice = getSelectedTTSVoice();
    if (voice) {
        primer.voice = voice;
        if (voice.lang)
            primer.lang = voice.lang;
    }
    else {
        primer.lang = 'en-US';
    }
    window.speechSynthesis.speak(primer);
}
function getTTSSource() {
    return loadFromLocalStorage(LS_TTS_SOURCE) || 'browser';
}
function speakSelectedAssistWord() {
    if (!selectedAssistWord)
        return;
    cancelAssistSpeech();
    const preferBrowser = getTTSSource() === 'browser';
    if (preferBrowser) {
        // User prefers the consistent browser TTS voice
        if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length > 0) {
            speakWithTTS(selectedAssistWord);
            return;
        }
        // Fall back to dictionary audio if TTS unavailable
        if (currentAssistAudioUrl) {
            currentAssistAudio = new Audio(currentAssistAudioUrl);
            currentAssistAudio.play().catch(() => { currentAssistAudio = null; });
        }
        return;
    }
    // Default: prefer dictionary recordings (natural human pronunciation)
    if (currentAssistAudioUrl) {
        currentAssistAudio = new Audio(currentAssistAudioUrl);
        currentAssistAudio.play().catch(() => {
            currentAssistAudio = null;
            // Fall back to browser TTS if recording fails
            speakWithTTS(selectedAssistWord);
        });
        return;
    }
    // No dictionary audio available — use browser TTS
    speakWithTTS(selectedAssistWord);
}
function resetAssistSelectionForNewStory() {
    assistLookupRequestToken += 1;
    clearSelectedStoryWordHighlight();
    selectedAssistWord = "";
    selectedAssistWordNormalized = "";
    cancelAssistSpeech();
    resetAssistPanelToEmptyState();
    updateReadAloudButtonLabel();
}
// ── Read Aloud (whole text / from highlighted word) ──────────────────────────
let isReadingAloud = false;
let readAloudQueue = [];
/**
 * Extracts the plain text from the story output, optionally starting from
 * the currently highlighted word.
 *
 * Walks block-level children of storyOutputDiv so that paragraph / heading
 * boundaries produce natural sentence breaks (". ") instead of being
 * silently concatenated.  Falls back gracefully when the DOM structure is
 * unexpected (e.g. markdown-rendered headings, lists, blockquotes, tables).
 */
function getReadAloudText() {
    if (!storyOutputDiv)
        return '';
    // Determine the starting word index (0 = start of story)
    const words = storyOutputDiv.querySelectorAll('.story-word');
    let startNode = null;
    if (selectedStoryWordElement && words.length > 0) {
        const idx = Array.from(words).indexOf(selectedStoryWordElement);
        if (idx >= 0)
            startNode = selectedStoryWordElement;
    }
    // Walk top-level block children, collect text from each, join with ". "
    // so that TTS pauses between paragraphs / headings / list items.
    try {
        const blocks = storyOutputDiv.children;
        if (blocks.length === 0)
            return storyOutputDiv.textContent?.trim() || '';
        let collecting = !startNode; // if no start word, collect from the beginning
        const parts = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            // Skip decorative elements (hr, story-break)
            if (block.tagName === 'HR')
                continue;
            if (block.classList.contains('story-break'))
                continue;
            // If we haven't reached the start word yet, check if it's in this block
            if (!collecting) {
                if (startNode && block.contains(startNode)) {
                    collecting = true;
                    // Extract text from the start word onward within this block
                    const range = document.createRange();
                    range.setStartBefore(startNode);
                    range.setEndAfter(block.lastChild || block);
                    const fragment = range.cloneContents();
                    const temp = document.createElement('div');
                    temp.appendChild(fragment);
                    const text = temp.textContent?.trim();
                    if (text)
                        parts.push(text);
                    continue;
                }
                continue;
            }
            const text = block.textContent?.trim();
            if (text)
                parts.push(text);
        }
        if (parts.length > 0)
            return parts.join('. ');
    }
    catch (err) {
        console.warn('getReadAloudText: block-walk failed, using fallback', err);
    }
    // Fallback: use the entire textContent
    return storyOutputDiv.textContent?.trim() || '';
}
/**
 * Split text into sentences / natural chunks so that each
 * SpeechSynthesisUtterance stays under Chrome's ~200-char safe limit.
 * This works around a well-known Chrome bug where long utterances
 * silently stop after ≈15 seconds.
 */
function splitTextForTTS(text) {
    // Split on sentence-ending punctuation followed by whitespace
    const raw = text.split(/(?<=[.!?…])\s+/);
    const MAX_CHUNK = 180;
    const chunks = [];
    let current = '';
    for (const sentence of raw) {
        if (current.length + sentence.length + 1 > MAX_CHUNK && current) {
            chunks.push(current.trim());
            current = '';
        }
        current += (current ? ' ' : '') + sentence;
    }
    if (current.trim())
        chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
}
function startReadAloud() {
    if (!('speechSynthesis' in window))
        return;
    // If already reading, stop first
    stopReadAloud();
    const text = getReadAloudText();
    if (!text)
        return;
    primeTTSAudio();
    const voice = getSelectedTTSVoice();
    const chunks = splitTextForTTS(text);
    readAloudQueue = [];
    const onFinish = () => {
        isReadingAloud = false;
        readAloudQueue = [];
        if (readAloudButton)
            readAloudButton.classList.remove('hidden');
        if (stopReadAloudButton)
            stopReadAloudButton.classList.add('hidden');
    };
    for (let i = 0; i < chunks.length; i++) {
        const utterance = new SpeechSynthesisUtterance(chunks[i]);
        if (voice) {
            utterance.voice = voice;
            if (voice.lang)
                utterance.lang = voice.lang;
        }
        else {
            utterance.lang = 'en-US';
        }
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        if (i === 0) {
            utterance.onstart = () => {
                isReadingAloud = true;
                if (readAloudButton)
                    readAloudButton.classList.add('hidden');
                if (stopReadAloudButton)
                    stopReadAloudButton.classList.remove('hidden');
            };
        }
        if (i === chunks.length - 1) {
            utterance.onend = onFinish;
        }
        utterance.onerror = onFinish;
        readAloudQueue.push(utterance);
    }
    // Enqueue all chunks — the browser plays them sequentially
    for (const u of readAloudQueue) {
        window.speechSynthesis.speak(u);
    }
}
function stopReadAloud() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isReadingAloud = false;
    readAloudQueue = [];
    if (readAloudButton)
        readAloudButton.classList.remove('hidden');
    if (stopReadAloudButton)
        stopReadAloudButton.classList.add('hidden');
}
function updateReadAloudButtonLabel() {
    if (!readAloudLabel)
        return;
    if (selectedStoryWordElement && selectedAssistWord) {
        readAloudLabel.textContent = `Read from \u201c${selectedAssistWord}\u201d`;
    }
    else {
        readAloudLabel.textContent = 'Read from start';
    }
}
// ─────────────────────────────────────────────────────────────────────────────
async function lookupAssistDataForWord(selectedWord, normalizedWord) {
    const requestToken = ++assistLookupRequestToken;
    try {
        const result = await lookupWord(selectedWord);
        // Guard against stale responses from rapid clicking
        if (requestToken !== assistLookupRequestToken ||
            normalizedWord !== selectedAssistWordNormalized)
            return;
        if (!result) {
            setAssistLoadingState(false);
            setAssistErrorState(`"${selectedWord}" isn't in the dictionary \u2014 it might be a name or a made-up word from the story!`);
            // Still allow TTS even if no dictionary entry
            if (assistSpeakButton) {
                assistSpeakButton.disabled = !selectedAssistWord || !('speechSynthesis' in window);
            }
            return;
        }
        renderAssistResult(result);
    }
    catch (error) {
        if (requestToken !== assistLookupRequestToken ||
            normalizedWord !== selectedAssistWordNormalized)
            return;
        setAssistLoadingState(false);
        setAssistErrorState("Couldn\u2019t load help for this word. Try another.");
    }
}
function handleStoryWordClick(event) {
    const wordElement = event.target.closest('.story-word');
    if (!wordElement || !storyOutputDiv || !storyOutputDiv.contains(wordElement)) {
        // Clicked whitespace / non-word area inside the story — deselect current word
        if (selectedStoryWordElement) {
            clearSelectedStoryWordHighlight();
            selectedAssistWord = '';
            selectedAssistWordNormalized = '';
            updateReadAloudButtonLabel();
        }
        return;
    }
    // Keep drag-select/copy behavior smooth by ignoring clicks while a text selection exists.
    const browserSelection = window.getSelection();
    if (browserSelection && !browserSelection.isCollapsed && browserSelection.toString().trim()) {
        return;
    }
    const clickedWord = (wordElement.dataset.storyWord || wordElement.textContent || '').trim();
    const normalizedWord = normalizeVocabularyWord(wordElement.dataset.wordNormalized || clickedWord);
    if (!clickedWord || !normalizedWord) {
        return;
    }
    clearSelectedStoryWordHighlight();
    selectedStoryWordElement = wordElement;
    selectedStoryWordElement.classList.add('is-selected');
    selectedAssistWord = clickedWord;
    selectedAssistWordNormalized = normalizedWord;
    cancelAssistSpeech();
    primeTTSAudio();
    updateReadAloudButtonLabel();
    trackVocabularyLookup(normalizedWord);
    setAssistTabEnabled(true);
    setActiveTab('assist');
    prepareAssistPanelForWord(clickedWord);
    lookupAssistDataForWord(clickedWord, normalizedWord);
    // Start phonics lookup in parallel
    loadPhonicsForWord(clickedWord, normalizedWord);
}
function handleAssistChipClick(event) {
    const chip = event.target.closest('.assist-word-chip');
    if (!chip)
        return;
    const word = chip.dataset.word;
    if (!word)
        return;
    selectedAssistWord = word;
    selectedAssistWordNormalized = normalizeVocabularyWord(word);
    cancelAssistSpeech();
    clearSelectedStoryWordHighlight();
    updateReadAloudButtonLabel();
    trackVocabularyLookup(selectedAssistWordNormalized);
    prepareAssistPanelForWord(word);
    lookupAssistDataForWord(word, selectedAssistWordNormalized);
    // Start phonics lookup in parallel
    loadPhonicsForWord(word, selectedAssistWordNormalized);
}
function downloadJsonFile(data, filename) {
    const serialized = JSON.stringify(data, null, 2);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
// --- Modal Population Functions ---
function populateFrameworkModal() {
    if (!frameworkOptionsGrid || !craftingFrameworkSelect)
        return;
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
    if (!styleOptionsGrid || !authorStyleSelect)
        return;
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
    if (!helpTopicsList)
        return;
    helpTopicsList.innerHTML = '';
    HELP_TOPIC_ORDER.forEach((topicKey, index) => {
        const topic = HELP_TOPICS[topicKey];
        if (!topic)
            return;
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
    if (!helpContentDisplay || !HELP_TOPICS[topicKey])
        return;
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
    if (!stemConceptSection || !craftingFrameworkSelect)
        return;
    const selectedFramework = craftingFrameworkSelect.value;
    const isLearningFable = selectedFramework === 'Learning Fable (STEM)';
    if (isLearningFable) {
        stemConceptSection.classList.remove('hidden');
        stemConceptSection.classList.add('show');
    }
    else {
        stemConceptSection.classList.add('hidden');
        stemConceptSection.classList.remove('show');
    }
}
function updateSTEMConceptHint(conceptKey) {
    if (!stemConceptHint)
        return;
    const conceptData = STEM_CONCEPT_DATA[conceptKey];
    if (conceptData) {
        stemConceptHint.innerHTML = `
            <strong>💡 Concept:</strong> ${conceptData.hint}<br>
            <strong>🎬 Example:</strong> ${conceptData.example}<br>
            <strong>🐾 Suggested Animals:</strong> ${conceptData.animal}
        `;
        stemConceptHint.classList.remove('hidden');
    }
    else {
        stemConceptHint.innerHTML = '';
        stemConceptHint.classList.add('hidden');
    }
}
/**
 * Gets the current STEM concept for inclusion in prompts
 * @returns {Object|null} The concept data or null if not using Learning Fable
 */
function getSelectedSTEMConcept() {
    if (!craftingFrameworkSelect || !stemConceptSelect)
        return null;
    const selectedFramework = craftingFrameworkSelect.value;
    if (selectedFramework !== 'Learning Fable (STEM)')
        return null;
    const conceptKey = stemConceptSelect.value;
    if (!conceptKey || !STEM_CONCEPT_DATA[conceptKey])
        return null;
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
    if (!preset)
        return;
    if (conflictSlider)
        conflictSlider.value = String(preset.conflict);
    if (scarySlider)
        scarySlider.value = String(preset.scary);
    if (sadnessSlider)
        sadnessSlider.value = String(preset.sadness);
    if (complexitySlider)
        complexitySlider.value = String(preset.complexity);
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
    const preset = loadFromLocalStorage(LS_SENSITIVITY_PRESET) || 'adventurous';
    if (sensitivityPresetSelect) {
        sensitivityPresetSelect.value = preset;
    }
    if (preset === 'custom') {
        if (conflictSlider)
            conflictSlider.value = loadFromLocalStorage(LS_SENSITIVITY_CONFLICT) || '2';
        if (scarySlider)
            scarySlider.value = loadFromLocalStorage(LS_SENSITIVITY_SCARY) || '2';
        if (sadnessSlider)
            sadnessSlider.value = loadFromLocalStorage(LS_SENSITIVITY_SADNESS) || '2';
        if (complexitySlider)
            complexitySlider.value = loadFromLocalStorage(LS_SENSITIVITY_COMPLEXITY) || '2';
        if (customSensitivityControls)
            customSensitivityControls.classList.remove('hidden');
    }
    else {
        applySensitivityPreset(preset);
    }
    updateSensitivitySliderLabels();
    updateSensitivitySummary();
}
function updateSensitivitySummary() {
    if (!sensitivitySummary)
        return;
    const preset = sensitivityPresetSelect ? sensitivityPresetSelect.value : 'standard';
    if (preset !== 'custom') {
        const summaries = {
            extra_gentle: "🌸 Extra gentle mode: No conflict, scary elements, or sad moments. Very simple stories.",
            gentle: "🌼 Gentle mode: Minimal challenges with quick resolutions. Easy, comforting stories.",
            standard: "🌻 Standard mode: Age-appropriate content with traditional story elements.",
            adventurous: "🌟 Adventurous mode: Fuller exploration of themes with more complex narratives."
        };
        sensitivitySummary.textContent = summaries[preset] || '';
    }
    else {
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
    // Helper for typed getElementById
    const $id = (id) => document.getElementById(id);
    // Get DOM elements
    modalApiKeyInput = $id('modalApiKeyInput');
    modalModelSelect = $id('modalModelSelect');
    minApiIntervalInput = $id('minApiIntervalInput');
    readingAgeMinInput = $id('readingAgeMinInput');
    readingAgeMaxInput = $id('readingAgeMaxInput');
    downloadChatLogButton = $id('downloadChatLogButton');
    exportVocabularyButton = $id('exportVocabularyButton');
    clearVocabularyButton = $id('clearVocabularyButton');
    charactersInput = $id('charactersInput');
    audienceInput = $id('audienceInput');
    userSuggestionsTextarea = $id('userSuggestionsTextarea');
    enableReadingAgeAdjustmentCheckbox = $id('enableReadingAgeAdjustmentCheckbox');
    targetReadingAgeSlider = $id('targetReadingAgeSlider');
    readingAgeSliderContainer = $id('readingAgeSliderContainer');
    enableConsolidatorCheckbox = $id('enableConsolidatorCheckbox');
    craftingFrameworkSelect = $id('craftingFrameworkSelect');
    frameworkSummaryDiv = $id('frameworkSummary');
    generateButton = $id('generateButton');
    storyTitleDiv = $id('storyTitle');
    storyOutputDiv = $id('storyOutput');
    copyStoryButton = $id('copyStoryButton');
    saveStoryButton = $id('saveStoryButton');
    openStoryButton = $id('openStoryButton');
    storyFileInput = $id('storyFileInput');
    elaborateStoryButton = $id('elaborateStoryButton');
    readAloudButton = $id('readAloudButton');
    readAloudLabel = $id('readAloudLabel');
    stopReadAloudButton = $id('stopReadAloudButton');
    decreaseFontButton = $id('decreaseFontButton');
    increaseFontButton = $id('increaseFontButton');
    settingsModal = $id('settingsModal');
    settingsButton = $id('settingsButton');
    cancelSettingsButton = $id('cancelSettingsButton');
    saveSettingsButton = $id('saveSettingsButton');
    authorStyleSelect = $id('authorStyleSelect');
    styleSummaryDiv = $id('styleSummary');
    toneSelect = $id('toneSelect');
    pacingSelect = $id('pacingSelect');
    humorSelect = $id('humorSelect');
    emotionSelect = $id('emotionSelect');
    agentTogglesContainer = $id('agentTogglesContainer');
    masterThinkingToggle = $id('masterThinkingToggle');
    agent1CrafterToggle = $id('agent1CrafterToggle');
    agent2ElaboratorToggle = $id('agent2ElaboratorToggle');
    agent3ReviewerToggle = $id('agent3ReviewerToggle');
    agent4PolisherToggle = $id('agent4PolisherToggle');
    agent5CleanerToggle = $id('agent5CleanerToggle');
    agent6TitlerToggle = $id('agent6TitlerToggle');
    agentCConsolidatorToggle = $id('agentCConsolidatorToggle');
    stemConceptSection = $id('stemConceptSection');
    stemConceptSelect = $id('stemConceptSelect');
    stemConceptHint = $id('stemConceptHint');
    // Parental Controls DOM elements
    parentalControlsToggle = $id('parentalControlsToggle');
    parentalControlsContent = $id('parentalControlsContent');
    sensitivityPresetSelect = $id('sensitivityPresetSelect');
    customSensitivityControls = $id('customSensitivityControls');
    conflictSlider = $id('conflictSlider');
    scarySlider = $id('scarySlider');
    sadnessSlider = $id('sadnessSlider');
    complexitySlider = $id('complexitySlider');
    conflictLabel = $id('conflictLabel');
    scaryLabel = $id('scaryLabel');
    sadnessLabel = $id('sadnessLabel');
    complexityLabel = $id('complexityLabel');
    sensitivitySummary = $id('sensitivitySummary');
    // Theme toggle
    themeToggle = $id('themeToggle');
    // Assist tab elements
    assistTabButton = $id('assistTabButton');
    assistEmptyState = $id('assistEmptyState');
    assistWordState = $id('assistWordState');
    assistWordHeading = $id('assistWordHeading');
    assistDefinitions = $id('assistDefinitions');
    assistSynonyms = $id('assistSynonyms');
    assistAntonyms = $id('assistAntonyms');
    assistIpa = $id('assistIpa');
    assistSpeakButton = $id('assistSpeakButton');
    assistLoadingState = $id('assistLoadingState');
    assistErrorState = $id('assistErrorState');
    assistSource = $id('assistSource');
    assistLookupCount = $id('assistLookupCount');
    loadSampleStoryButton = $id('loadSampleStoryButton');
    ttsVoiceSelect = $id('ttsVoiceSelect');
    ttsGenderSelect = $id('ttsGenderSelect');
    ttsSourceSelect = $id('ttsSourceSelect');
    // Phonics Assist DOM elements
    assistPhonicsSection = $id('assistPhonicsSection');
    phonicsChunks = $id('phonicsChunks');
    phonicsSoundOutButton = $id('phonicsSoundOutButton');
    phonicsPhonemesRow = $id('phonicsPhonemesRow');
    phonicsDisclaimer = $id('phonicsDisclaimer');
    phonicsLoadingState = $id('phonicsLoadingState');
    // Framework and Style modal elements
    frameworkModal = $id('frameworkModal');
    frameworkSelectButton = $id('frameworkSelectButton');
    frameworkSelectedLabel = $id('frameworkSelectedLabel');
    frameworkOptionsGrid = $id('frameworkOptionsGrid');
    styleModal = $id('styleModal');
    styleSelectButton = $id('styleSelectButton');
    styleSelectedLabel = $id('styleSelectedLabel');
    styleOptionsGrid = $id('styleOptionsGrid');
    closeStyleModalButton = $id('closeStyleModalButton');
    // Plot points toggle
    includePlotPointsCheckbox = $id('includePlotPointsCheckbox');
    plotPointsContainer = $id('plotPointsContainer');
    // Help modal elements
    helpModal = $id('helpModal');
    helpButton = $id('helpButton');
    helpTopicsList = $id('helpTopicsList');
    helpContentDisplay = $id('helpContentDisplay');
    closeHelpModalButton = $id('closeHelpModalButton');
    if (!modalApiKeyInput || !charactersInput || !audienceInput || !craftingFrameworkSelect || !generateButton || !storyOutputDiv || !settingsModal || !settingsButton || !saveSettingsButton || !modalModelSelect || !storyTitleDiv || !userSuggestionsTextarea || !enableReadingAgeAdjustmentCheckbox || !targetReadingAgeSlider || !readingAgeSliderContainer || !decreaseFontButton || !increaseFontButton || !enableConsolidatorCheckbox || !authorStyleSelect || !agentTogglesContainer || !assistTabButton || !assistEmptyState || !assistWordState || !assistWordHeading || !assistDefinitions || !assistSynonyms || !assistAntonyms || !assistIpa || !assistSpeakButton || !assistLoadingState || !assistErrorState || !exportVocabularyButton || !clearVocabularyButton) {
        console.error("Critical UI elements are missing. Application may not function correctly.");
        if (storyOutputDiv)
            storyOutputDiv.textContent = "Error: Critical UI elements missing. Check console.";
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
    if (storyOutputDiv) {
        const welcomeText = 'Welcome to StoryGen!\n\nStoryGen was created to help children with reading \u2014 specifically to aid understanding and pronunciation of new words. Tap any word in a story to hear it spoken aloud, see its definition, and explore examples.\n\nRather than asking one AI to write a story in one go, StoryGen uses a team of specialist agents \u2014 a Crafter writes the first draft, an Elaborator adds detail, a Reviewer gives feedback, a Polisher refines, a Cleaner tidies up, and a Titler names the finished story.\n\nTo create a story:\n1. Enter your characters in the Characters field\n2. Set your target audience (e.g. \u201cchildren aged 5-7\u201d)\n3. Choose a Story Framework and Authorial Style\n4. Click \u201cGenerate Story\u201d\n\nYou can also open a previously saved story \u2014 use the folder icon (\uD83D\uDCC2) at the top right to load a .md or .txt file.\n\nFirst time? Configure your Gemini API Key in Settings (\u2699\uFE0F). Need help? Click the question mark icon (\u2753) to open the Help Wiki.\n\nStories can be made using various Frameworks and Authorial Styles. They don\u2019t copy the work of the authors and creators they\u2019re based on \u2014 they were chosen to explore stories crafted with an enthusiasm that leans in different directions. It\u2019s well worth exploring the stories created with the same characters and plot points using different combinations of Frameworks and Authorial Styles.\n\nWhile there is argument that LLMs have been trained on copyrighted content, we\u2019re asking for unique creations and not duplications here. The purpose is absolutely for educational purposes only. Use what\u2019s learned here as a stepping stone to explore the real works of great authors. Enjoy, create your own stories, learn and then explore the rich world of books.';
        storyOutputDiv.innerHTML = formatStoryAsHtml(welcomeText);
    }
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
    masterThinkingToggle.checked = (loadFromLocalStorage(LS_THINKING_ENABLED) ?? 'false') === 'true';
    agent1CrafterToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_1_CRAFTER) ?? 'true') === 'true';
    agent2ElaboratorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_2_ELABORATOR) ?? 'true') === 'true';
    agent3ReviewerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_3_REVIEWER) ?? 'true') === 'true';
    agent4PolisherToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_4_POLISHER) ?? 'true') === 'true';
    agent5CleanerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_5_CLEANER) ?? 'false') === 'true';
    agent6TitlerToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_6_TITLER) ?? 'false') === 'true';
    agentCConsolidatorToggle.checked = (loadFromLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR) ?? 'true') === 'true';
    masterThinkingToggle.addEventListener('change', updateAgentTogglesUI);
    updateAgentTogglesUI();
    // --- Event Listeners ---
    initializeTabSystem();
    setAssistTabEnabled(true);
    resetAssistPanelToEmptyState();
    if (assistSpeakButton) {
        assistSpeakButton.addEventListener('click', speakSelectedAssistWord);
    }
    if (phonicsSoundOutButton) {
        phonicsSoundOutButton.addEventListener('click', handleSoundOutClick);
    }
    if (readAloudButton) {
        readAloudButton.addEventListener('click', startReadAloud);
    }
    if (stopReadAloudButton) {
        stopReadAloudButton.addEventListener('click', stopReadAloud);
    }
    if (storyOutputDiv) {
        storyOutputDiv.addEventListener('click', handleStoryWordClick);
    }
    if (assistWordState) {
        assistWordState.addEventListener('click', handleAssistChipClick);
    }
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
            }
            else {
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
        // Populate TTS voice dropdown with current gender filter
        if (ttsGenderSelect)
            ttsGenderSelect.value = loadFromLocalStorage(LS_TTS_GENDER) || 'female';
        if (ttsSourceSelect) {
            ttsSourceSelect.value = loadFromLocalStorage(LS_TTS_SOURCE) || 'browser';
            updateBrowserVoiceSettingsVisibility();
        }
        populateTTSVoiceDropdown();
        settingsModal.classList.add('active');
    });
    modalModelSelect.addEventListener('change', updateAgentTogglesUI);
    cancelSettingsButton.addEventListener('click', () => settingsModal.classList.remove('active'));
    // TTS source selection
    if (ttsSourceSelect) {
        ttsSourceSelect.addEventListener('change', () => {
            saveToLocalStorage(LS_TTS_SOURCE, ttsSourceSelect.value);
            updateBrowserVoiceSettingsVisibility();
        });
    }
    // TTS voice gender filter
    if (ttsGenderSelect) {
        ttsGenderSelect.addEventListener('change', () => {
            saveToLocalStorage(LS_TTS_GENDER, ttsGenderSelect.value);
            populateTTSVoiceDropdown();
        });
    }
    if (ttsVoiceSelect) {
        ttsVoiceSelect.addEventListener('change', () => {
            saveToLocalStorage(LS_TTS_VOICE, ttsVoiceSelect.value);
        });
    }
    // Voices may load asynchronously in some browsers
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => populateTTSVoiceDropdown();
    }
    saveSettingsButton.addEventListener('click', () => {
        saveToLocalStorage(LS_API_KEY, modalApiKeyInput.value);
        saveToLocalStorage(LS_SELECTED_MODEL, modalModelSelect.value);
        saveToLocalStorage(LS_MIN_API_INTERVAL, minApiIntervalInput.value);
        saveToLocalStorage(LS_READING_AGE_MIN, readingAgeMinInput.value);
        saveToLocalStorage(LS_READING_AGE_MAX, readingAgeMaxInput.value);
        saveToLocalStorage(LS_THINKING_ENABLED, masterThinkingToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_1_CRAFTER, agent1CrafterToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_2_ELABORATOR, agent2ElaboratorToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_3_REVIEWER, agent3ReviewerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_4_POLISHER, agent4PolisherToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_5_CLEANER, agent5CleanerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_6_TITLER, agent6TitlerToggle.checked.toString());
        saveToLocalStorage(LS_THINKING_AGENT_C_CONSOLIDATOR, agentCConsolidatorToggle.checked.toString());
        if (ttsVoiceSelect)
            saveToLocalStorage(LS_TTS_VOICE, ttsVoiceSelect.value);
        if (ttsGenderSelect)
            saveToLocalStorage(LS_TTS_GENDER, ttsGenderSelect.value);
        if (ttsSourceSelect)
            saveToLocalStorage(LS_TTS_SOURCE, ttsSourceSelect.value);
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
            if (modal)
                modal.classList.remove('active');
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
        downloadJsonFile(appState.lastRunChatLog, `story_generator_chat_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        showTemporaryToast("Chat log downloaded.", "info");
    });
    exportVocabularyButton.addEventListener('click', () => {
        const vocabularyData = loadVocabularyLookupData();
        downloadJsonFile(vocabularyData, `story_vocabulary_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        showTemporaryToast("Vocabulary data exported.", "success");
    });
    clearVocabularyButton.addEventListener('click', () => {
        const shouldClear = confirm('Clear all vocabulary lookup history? This cannot be undone.');
        if (!shouldClear)
            return;
        removeFromLocalStorage(LS_VOCAB_LOOKUPS);
        showTemporaryToast("Vocabulary data cleared.", "info");
    });
    if (loadSampleStoryButton) {
        loadSampleStoryButton.addEventListener('click', () => {
            const sampleTitle = "The Sparrow and the Silence-Snatcher";
            const sampleText = SAMPLE_STORY_TEXT;
            appState.latestGeneratedStoryTitle = sampleTitle;
            appState.latestGeneratedStoryText = sampleText;
            displayFinalStoryOutput(sampleTitle, sampleText);
            setAssistTabEnabled(true);
            resetAssistPanelToEmptyState();
            setActiveTab('story');
            // Close settings modal
            if (settingsModal)
                settingsModal.classList.remove('active');
            showTemporaryToast("Sample story loaded — click any word to test Assist.", "success");
        });
    }
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
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            // Gather current settings for frontmatter
            const characters = charactersInput ? charactersInput.value.trim() : '';
            const audience = audienceInput ? audienceInput.value.trim() : '';
            const framework = craftingFrameworkSelect ? craftingFrameworkSelect.value : '';
            const style = authorStyleSelect ? authorStyleSelect.value : '';
            // Build markdown with YAML frontmatter
            let md = '---\n';
            md += `title: "${title.replace(/"/g, '\\"')}"\n`;
            md += `date: ${dateStr}\n`;
            if (characters)
                md += `characters: "${characters.replace(/"/g, '\\"')}"\n`;
            if (audience)
                md += `audience: "${audience.replace(/"/g, '\\"')}"\n`;
            if (framework)
                md += `framework: "${framework}"\n`;
            if (style)
                md += `style: "${style}"\n`;
            md += '---\n\n';
            md += `# ${title}\n\n`;
            md += appState.latestGeneratedStoryText;
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeFilename = title
                .replace(/[^a-z0-9\s]/gi, '')
                .trim()
                .replace(/\s+/g, '_')
                .toLowerCase()
                || 'untitled_story';
            a.download = `${safeFilename}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showTemporaryToast("Story saved as markdown!", "success");
        }
    });
    // --- Open Story from Markdown file ---
    openStoryButton.addEventListener('click', () => {
        storyFileInput.click();
    });
    storyFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let title = '';
            let storyBody = content;
            // Try to parse YAML frontmatter
            const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
            if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                storyBody = content.slice(frontmatterMatch[0].length);
                // Extract title from frontmatter
                const titleMatch = frontmatter.match(/^title:\s*"?(.*?)"?\s*$/m);
                if (titleMatch)
                    title = titleMatch[1];
            }
            // Trim leading whitespace before heading detection — frontmatter
            // stripping can leave a leading newline that prevents ^# from matching.
            storyBody = storyBody.replace(/^\s+/, '');
            // Remove leading markdown heading if it duplicates the title
            const headingMatch = storyBody.match(/^#\s+(.+)\r?\n+/);
            if (headingMatch) {
                if (!title)
                    title = headingMatch[1];
                // Remove the heading from the story body if it matches the title
                if (headingMatch[1].trim() === title.trim()) {
                    storyBody = storyBody.slice(headingMatch[0].length);
                }
            }
            // Fallback: derive title from filename
            if (!title) {
                title = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[_-]/g, ' ');
            }
            storyBody = storyBody.trim();
            if (!storyBody) {
                showTemporaryToast("The file appears to be empty.", "error");
                storyFileInput.value = '';
                return;
            }
            appState.latestGeneratedStoryTitle = title;
            appState.latestGeneratedStoryText = storyBody;
            displayFinalStoryOutput(title, storyBody);
            setAssistTabEnabled(true);
            resetAssistPanelToEmptyState();
            showTemporaryToast(`Loaded: ${title}`, "success");
        };
        reader.onerror = () => {
            showTemporaryToast("Could not read the file.", "error");
        };
        reader.readAsText(file);
        // Reset so the same file can be re-opened
        storyFileInput.value = '';
    });
    increaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem + STORY_FONT_SIZE_STEP;
        if (newSize > MAX_STORY_FONT_SIZE_REM)
            newSize = MAX_STORY_FONT_SIZE_REM;
        currentStoryFontSizeRem = newSize;
        applyStoryFontSize(currentStoryFontSizeRem);
    });
    decreaseFontButton.addEventListener('click', () => {
        let newSize = currentStoryFontSizeRem - STORY_FONT_SIZE_STEP;
        if (newSize < MIN_STORY_FONT_SIZE_REM)
            newSize = MIN_STORY_FONT_SIZE_REM;
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
        const masterThinkingEnabled = (loadFromLocalStorage(LS_THINKING_ENABLED) ?? 'false') === 'true';
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
        if (!canThink || !masterThinkingEnabled) {
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
        setAssistTabEnabled(false);
        resetAssistSelectionForNewStory();
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
        updateStatusInStoryOutput(`This will take a while — it's multiple calls to models. Just wait a bit and the story should be ready.\n\n`);
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
            setAssistTabEnabled(true);
            resetAssistPanelToEmptyState();
            // Auto-save to library
            try {
                await saveStoryToLibrary({
                    title: appState.latestGeneratedStoryTitle,
                    markdown: appState.latestGeneratedStoryText,
                    characters: charactersInput ? charactersInput.value.trim() : '',
                    audience: audienceInput ? audienceInput.value.trim() : '',
                    framework: craftingFrameworkSelect ? craftingFrameworkSelect.value : '',
                    style: authorStyleSelect ? authorStyleSelect.value : '',
                    date: new Date().toISOString()
                });
            }
            catch (e) {
                console.warn('Could not save story to library:', e);
            }
        }
        catch (error) {
            console.error("Error in handleGenerateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story generation.");
            setAssistTabEnabled(false);
        }
        finally {
            enableMainControls();
        }
    }
    async function handleElaborateStory() {
        if (!appState.latestGeneratedStoryText) {
            showTemporaryToast("No story available to elaborate. Please generate a story first.", "info");
            return;
        }
        appState.addLogEntry({ agentName: "User Action", type: 'elaboration-start', content: `Elaborating existing story. Initial length: ${appState.latestGeneratedStoryText.length}`, timestamp: new Date().toISOString() });
        setAssistTabEnabled(false);
        resetAssistSelectionForNewStory();
        clearStoryOutput();
        if (storyOutputDiv)
            storyOutputDiv.textContent = `Previous story version (will be elaborated):\n"${appState.latestGeneratedStoryText.substring(0, 150)}..."\n\n`;
        disableMainControls();
        updateStatusInStoryOutput(`Starting elaboration...\n`);
        updateStatusInStoryOutput(`This will take a while — it's multiple calls to thinking models. Just wait a bit and the story should be ready.\n\n`);
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
            setAssistTabEnabled(true);
            resetAssistPanelToEmptyState();
        }
        catch (error) {
            console.error("Error in handleElaborateStory:", error);
            displayErrorInStoryOutput(error.message || "An unknown error occurred during story elaboration.");
            setAssistTabEnabled(false);
        }
        finally {
            enableMainControls();
        }
    }
    if (generateButton)
        generateButton.addEventListener('click', handleGenerateStory);
    if (elaborateStoryButton)
        elaborateStoryButton.addEventListener('click', handleElaborateStory);
    // Global keyboard shortcut: Ctrl+Shift+R to reset all data
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
            e.preventDefault(); // Prevent browser refresh
            if (confirm('Reset all StoryGen data? This will clear:\n- All story settings\n- Plot points\n- Style choices\n- Vocabulary lookup history\n\nYour API key will be preserved.\n\nContinue?')) {
                clearAllAppData(false); // Keep API key
                showTemporaryToast('All data reset. Reloading...', 'info');
                setTimeout(() => window.location.reload(), 500);
            }
        }
    });
});
//# sourceMappingURL=script.js.map