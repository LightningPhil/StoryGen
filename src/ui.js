// --- Global DOM Element Variables (assumed to be initialized in main script.js) ---
// This file will receive them as parameters or access them if they are truly global.
// For simplicity here, we'll assume they are accessible.
// A more robust approach might involve passing them or using a shared UI state object.

let statusMessageDiv, storyTitleDiv, storyOutputDiv, generateButton, elaborateStoryButton, copyStoryButton, saveStoryButton;
let craftingFrameworkSelect, frameworkSummaryDiv, useEngineSuggestionsCheckbox, userSuggestionsTextarea;

export function initUIElements(elements) {
    statusMessageDiv = elements.statusMessageDiv;
    storyTitleDiv = elements.storyTitleDiv;
    storyOutputDiv = elements.storyOutputDiv;
    generateButton = elements.generateButton;
    elaborateStoryButton = elements.elaborateStoryButton;
    copyStoryButton = elements.copyStoryButton;
    saveStoryButton = elements.saveStoryButton;
    craftingFrameworkSelect = elements.craftingFrameworkSelect;
    frameworkSummaryDiv = elements.frameworkSummaryDiv;
    useEngineSuggestionsCheckbox = elements.useEngineSuggestionsCheckbox;
    userSuggestionsTextarea = elements.userSuggestionsTextarea;
}


export function displayLoading(isLoading, message = '') {
    if (!statusMessageDiv) return; // Guard clause

    if (isLoading) {
        statusMessageDiv.textContent = message || 'Processing...';
        statusMessageDiv.className = 'loading';
        
        // Only clear fully for a brand new generation if not a retry/step message
        if (message && !message.toLowerCase().includes("elaborat") && !message.toLowerCase().includes("step") && !message.toLowerCase().includes("retry")) {
             if (storyTitleDiv) storyTitleDiv.textContent = '';
             if (storyOutputDiv) storyOutputDiv.textContent = 'Your story will appear here...';
        }
        if (generateButton) generateButton.disabled = true;
        if (elaborateStoryButton) elaborateStoryButton.disabled = true;
        if (copyStoryButton) copyStoryButton.style.display = 'none';
        if (saveStoryButton) saveStoryButton.style.display = 'none';
    } else {
        // Clear loading message only if it's not an error, success, or info message
        if (statusMessageDiv.classList.contains('loading')) {
            statusMessageDiv.textContent = '';
            statusMessageDiv.className = '';
        }
        if (generateButton) generateButton.disabled = false;
        // elaborateStoryButton enabled/disabled based on story presence in displayOutput/Error
    }
}

export function displayOutput(title, storyText, isElaboration = false) {
    if (storyTitleDiv) storyTitleDiv.textContent = title;
    if (storyOutputDiv) storyOutputDiv.textContent = storyText;
    
    const successMessage = isElaboration ? 'Story elaborated successfully!' : 'Story generated successfully!';
    showTemporaryStatus(successMessage, 'success', 4000);

    if (copyStoryButton) copyStoryButton.style.display = 'inline-block';
    if (saveStoryButton) saveStoryButton.style.display = 'inline-block';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'inline-block';
        elaborateStoryButton.disabled = false;
    }
}

export function displayError(errorMessage) {
    if (statusMessageDiv) {
        statusMessageDiv.textContent = `Error: ${errorMessage}`;
        statusMessageDiv.className = 'error';
    }
    if (storyTitleDiv) storyTitleDiv.textContent = '';

    if (copyStoryButton) copyStoryButton.style.display = 'none';
    if (saveStoryButton) saveStoryButton.style.display = 'none';
    if (elaborateStoryButton) {
        elaborateStoryButton.style.display = 'none';
        elaborateStoryButton.disabled = true;
    }
    console.error("Pipeline Error Details:", errorMessage); // Keep this critical console log
}

export function showTemporaryStatus(message, type = 'info', duration = 3000) {
    if (!statusMessageDiv) return;

    // If a more severe error is already showing, don't overwrite with info/success
    if (statusMessageDiv.classList.contains('error') && type !== 'error') {
        return; 
    }
    // If loading is active and this is not an error, let loading message persist
    if (statusMessageDiv.classList.contains('loading') && type !== 'error' && type !== 'info') { // Allow 'info' for retry updates
        // If the new message is different, update it, otherwise let loading animation/text persist
        if (statusMessageDiv.textContent !== message) {
            statusMessageDiv.textContent = message;
            statusMessageDiv.className = type;
        }
    } else {
        statusMessageDiv.textContent = message;
        statusMessageDiv.className = type;
    }
    
    setTimeout(() => {
        // Clear only if this specific temporary message is still showing
        if (statusMessageDiv.textContent === message && statusMessageDiv.className === type) {
            // If it was success/info, and loading is done, clear it.
            // If it was an error, it should persist until next action.
            if (type !== 'error') {
                statusMessageDiv.textContent = '';
                statusMessageDiv.className = '';
            }
        }
    }, duration);
}


export function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA) {
    if (!craftingFrameworkSelect || !frameworkSummaryDiv) return;

    const selectedFrameworkKey = craftingFrameworkSelect.value;
    const summary = STORY_FRAMEWORK_SUMMARIES_DATA[selectedFrameworkKey] || "No summary available for this framework.";
    frameworkSummaryDiv.textContent = summary;
}

export function updateSuggestionsTextareaStyle() {
    if (!userSuggestionsTextarea || !useEngineSuggestionsCheckbox) return;

    if (useEngineSuggestionsCheckbox.checked) {
        userSuggestionsTextarea.classList.remove('suggestions-used');
        userSuggestionsTextarea.classList.add('suggestions-not-used');
        userSuggestionsTextarea.disabled = true;
    } else {
        userSuggestionsTextarea.classList.remove('suggestions-not-used');
        userSuggestionsTextarea.classList.add('suggestions-used');
        userSuggestionsTextarea.disabled = false;
    }
}