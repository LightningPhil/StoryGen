// src/ui.js
import appState from './appState.js'; 
import { normalizeVocabularyWord } from './utils.js';

// --- DOM Element References (initialized by initUIElements) ---
let storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton;
let copyStoryButton, saveStoryButton, decreaseFontButton, increaseFontButton;
let craftingFrameworkSelect, frameworkSummaryDiv, userSuggestionsTextarea;
let authorStyleSelect, styleSummaryDiv;

export function initUIElements(elements) {
    storyTitleDiv = elements.storyTitleDiv;
    storyOutputDiv = elements.storyOutputDiv;
    generateButton = elements.generateButton;
    elaborateStoryButton = elements.elaborateStoryButton;
    copyStoryButton = elements.copyStoryButton;
    saveStoryButton = elements.saveStoryButton;
    decreaseFontButton = elements.decreaseFontButton;
    increaseFontButton = elements.increaseFontButton;
    craftingFrameworkSelect = elements.craftingFrameworkSelect;
    frameworkSummaryDiv = elements.frameworkSummaryDiv;
    userSuggestionsTextarea = elements.userSuggestionsTextarea;

    // New element references
    authorStyleSelect = elements.authorStyleSelect;
    styleSummaryDiv = elements.styleSummaryDiv;

    // Initial state for action buttons (hidden)
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (elaborateStoryButton) elaborateStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden');
    if (increaseFontButton) increaseFontButton.classList.add('hidden');


    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Your Story Title Will Appear Here";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function clearStoryOutput() {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent = "";
    if (storyTitleDiv) { 
        storyTitleDiv.textContent = "Generating title...";
        storyTitleDiv.classList.add('placeholder');
    }
}

export function updateStatusInStoryOutput(message) {
    if (!storyOutputDiv) return;
    storyOutputDiv.textContent += message;
    storyOutputDiv.scrollTop = storyOutputDiv.scrollHeight; 
}

export function displayFinalStoryOutput(title, storyText, isElaboration = false) {
    if (storyTitleDiv) {
        storyTitleDiv.textContent = title || "Untitled Story";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        // Format story text as proper paragraphs
        const formattedHtml = formatStoryAsHtml(storyText);
        storyOutputDiv.innerHTML = formattedHtml; 
        storyOutputDiv.scrollTop = 0; 
    }

    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryToast(successMessage, 'success');

    // Show all action buttons
    if (copyStoryButton) copyStoryButton.classList.remove('hidden');
    if (saveStoryButton) saveStoryButton.classList.remove('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.remove('hidden');
    if (increaseFontButton) increaseFontButton.classList.remove('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.remove('hidden');
        if (generateButton && !generateButton.disabled) {
            elaborateStoryButton.disabled = false;
        }
    }
}

export function displayErrorInStoryOutput(errorMessage) {
    console.error("Pipeline Error:", errorMessage); 

    if (storyTitleDiv) {
        storyTitleDiv.textContent = "Error Occurred";
        storyTitleDiv.classList.remove('placeholder');
    }
    if (storyOutputDiv) {
        storyOutputDiv.textContent = "An error occurred. Please check the browser console for details and ensure your API key and settings are correct.";
        storyOutputDiv.scrollTop = 0; 
    }

    // Hide action buttons on error
    if (copyStoryButton) copyStoryButton.classList.add('hidden');
    if (saveStoryButton) saveStoryButton.classList.add('hidden');
    if (decreaseFontButton) decreaseFontButton.classList.add('hidden');
    if (increaseFontButton) increaseFontButton.classList.add('hidden');
    if (elaborateStoryButton) {
        elaborateStoryButton.classList.add('hidden');
        elaborateStoryButton.disabled = true; 
    }
}

export function showTemporaryToast(message, type = 'info', duration = 3000) {
    console.log(`[UI Toast - ${type.toUpperCase()}]: ${message}`);
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        // Fallback removal if transitionend doesn't fire
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, duration);
}

export function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA) {
    if (!craftingFrameworkSelect || !frameworkSummaryDiv) return;
    const selectedFrameworkKey = craftingFrameworkSelect.value;
    const summary = STORY_FRAMEWORK_SUMMARIES_DATA[selectedFrameworkKey] || "No summary available for this framework.";
    frameworkSummaryDiv.textContent = summary;
}

// New function for author style summary
export function updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES_DATA) {
    if (!authorStyleSelect || !styleSummaryDiv) return;
    const selectedStyleKey = authorStyleSelect.value;
    const summary = STORY_STYLE_SUMMARIES_DATA[selectedStyleKey] || "No summary available for this style.";
    styleSummaryDiv.textContent = summary;
}

export function disableMainControls() {
    if (generateButton) generateButton.disabled = true;
    if (elaborateStoryButton) elaborateStoryButton.disabled = true;
    // Font buttons usability depends on story presence, managed by displayFinalStoryOutput/displayErrorInStoryOutput
}

export function enableMainControls() {
    if (generateButton) generateButton.disabled = false;
    
    if (appState.latestGeneratedStoryText && elaborateStoryButton) {
        elaborateStoryButton.disabled = false;
        elaborateStoryButton.classList.remove('hidden'); 
    } else if (elaborateStoryButton) {
        elaborateStoryButton.disabled = true;
        // elaborateStoryButton.classList.add('hidden'); // Visibility handled by display functions
    }
    // Font buttons visibility is also handled by displayFinalStoryOutput/displayErrorInStoryOutput
}

// New function to apply font size to the story output
export function applyStoryFontSize(newSizeRem) {
    if (storyOutputDiv && typeof newSizeRem === 'number' && newSizeRem > 0) {
        storyOutputDiv.style.fontSize = `${newSizeRem}rem`;
    }
}

// New generic function to populate dropdowns
export function populateDropdown(selectElement, optionsObject, capitalize = true) {
    if (!selectElement || !optionsObject) return;
    selectElement.innerHTML = '';
    for (const key in optionsObject) {
        const option = document.createElement('option');
        option.value = key;
        let textContent = key.replace(/_/g, ' ');
        if (capitalize) {
            textContent = textContent.charAt(0).toUpperCase() + textContent.slice(1);
        }
        option.textContent = textContent;
        selectElement.appendChild(option);
    }
}

/**
 * Formats story text as HTML with proper paragraphs and typography
 * @param {string} text - Raw story text
 * @returns {string} HTML formatted story
 */
function formatStoryAsHtml(text) {
    if (!text) return '';

    // Split text into paragraphs (double newlines or single newlines followed by a capital letter paragraph start)
    const paragraphs = text
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
    
    // Process each paragraph
    const formattedParagraphs = paragraphs.map((para, index) => {
        // Handle chapter headers or section breaks (lines starting with # or all caps short lines)
        if (para.startsWith('#')) {
            const headerText = formatParagraphForAssist(para.replace(/^#+\s*/, ''));
            return `<h3 class="story-chapter">${headerText}</h3>`;
        }
        
        // Check if it's a scene break indicator
        if (para === '***' || para === '---' || para === '* * *') {
            return `<div class="story-break" aria-hidden="true">✦</div>`;
        }
        
        // Regular paragraph - wrap in <p> tag
        const escapedPara = formatParagraphForAssist(para);
        
        return `<p class="story-paragraph">${escapedPara}</p>`;
    });
    
    return formattedParagraphs.join('\n');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatParagraphForAssist(paragraphText) {
    const WORD_TOKEN_REGEX = /\p{L}+(?:[’'-]\p{L}+)*/gu;
    let html = '';
    let cursor = 0;

    for (const match of paragraphText.matchAll(WORD_TOKEN_REGEX)) {
        const word = match[0];
        const start = match.index ?? 0;

        if (start > cursor) {
            html += escapeHtml(paragraphText.slice(cursor, start));
        }

        const normalizedWord = normalizeVocabularyWord(word);
        const escapedWord = escapeHtml(word);
        const escapedNormalizedWord = escapeHtml(normalizedWord);
        html += `<span class="story-word" data-story-word="${escapedWord}" data-word-normalized="${escapedNormalizedWord}">${escapedWord}</span>`;

        cursor = start + word.length;
    }

    if (cursor < paragraphText.length) {
        html += escapeHtml(paragraphText.slice(cursor));
    }

    return html;
}
