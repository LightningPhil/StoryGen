// src/utils.js

export function parseCharacters(characterString) {
    if (!characterString) return [];
    return characterString.split(',').map(char => char.trim()).filter(char => char.length > 0);
}

export function constructAgentPrompt(basePromptTemplate, dataObject) {
    let prompt = basePromptTemplate;
    for (const key in dataObject) {
        // Ensure value is a string; if not, use empty string to avoid "undefined" in prompt
        const value = typeof dataObject[key] === 'string' ? dataObject[key] : '';
        // Use a regex that is more robust for global replacement of ${KEY}
        const placeholder = new RegExp(`\\$\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
        prompt = prompt.replace(placeholder, value);
    }
    return prompt;
}

export function countWords(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return 0;
    }
    // Match sequences of non-whitespace characters. This is a common way to count words.
    // It handles multiple spaces between words and leading/trailing spaces correctly after trim.
    // More sophisticated counting might handle hyphens, contractions, etc., differently,
    // but this is a good general approach.
    const words = text.trim().split(/\s+/);
    return words.length;
}

/**
 * Normalizes a vocabulary word for stable local storage keys.
 * Keeps letters, apostrophes, and hyphens; lowercases everything.
 */
export function normalizeVocabularyWord(word) {
    if (!word || typeof word !== 'string') {
        return '';
    }

    return word
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[’]/g, "'")
        .replace(/[^\p{L}'-]+/gu, '')
        .replace(/^['-]+|['-]+$/g, '')
        .trim();
}

/**
 * Analyzes a story for potential narrative voice consistency issues.
 * Returns an array of warnings (empty if no issues detected).
 * 
 * This is a heuristic check - not perfect, but catches obvious problems.
 */
export function checkNarrativeVoiceConsistency(storyText) {
    const warnings = [];
    
    if (!storyText || typeof storyText !== 'string') {
        return warnings;
    }
    
    const paragraphs = storyText.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length < 3) {
        return warnings; // Too short to meaningfully check
    }
    
    const thirdLen = Math.floor(paragraphs.length / 3);
    const firstThird = paragraphs.slice(0, thirdLen).join(' ');
    const lastThird = paragraphs.slice(-thirdLen).join(' ');
    
    // Heuristic 1: Check for sudden formality shift (contractions)
    const firstThirdContractions = countContractions(firstThird);
    const lastThirdContractions = countContractions(lastThird);
    
    if (firstThirdContractions > 3 && lastThirdContractions === 0) {
        warnings.push("Voice may shift from casual to formal toward the end. Check narrative consistency.");
    }
    
    // Heuristic 2: Check for sudden vocabulary complexity shift
    const firstThirdAvgWordLength = getAverageWordLength(firstThird);
    const lastThirdAvgWordLength = getAverageWordLength(lastThird);
    
    if (lastThirdAvgWordLength - firstThirdAvgWordLength > 1.2) {
        warnings.push("Vocabulary complexity increases significantly toward the end. Check narrator voice consistency.");
    }
    
    // Heuristic 3: Detect preachy ending (moral keywords in last paragraph)
    const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
    const preachyPatterns = [
        'always remember',
        'the moral of',
        'the lesson is',
        'we should all',
        'you must always',
        'never forget that',
        'and that is why',
        'this teaches us'
    ];
    
    const foundPreachyPattern = preachyPatterns.find(pattern => lastParagraph.includes(pattern));
    if (foundPreachyPattern) {
        warnings.push(`Final paragraph may be overly didactic ("${foundPreachyPattern}"). Ensure moral emerges naturally from story events.`);
    }
    
    // Heuristic 4: Exclamation mark consistency
    const firstThirdExclamations = (firstThird.match(/!/g) || []).length;
    const lastThirdExclamations = (lastThird.match(/!/g) || []).length;
    
    if (firstThirdExclamations > 4 && lastThirdExclamations === 0) {
        warnings.push("Story starts with high energy (many exclamations) but ends flat. Consider evening out the tone.");
    }
    
    return warnings;
}

/**
 * Count contractions in text (informal language indicator)
 */
function countContractions(text) {
    const contractionPatterns = /\b\w+'\w+\b/g;
    const matches = text.match(contractionPatterns);
    return matches ? matches.length : 0;
}

/**
 * Calculate average word length (vocabulary complexity indicator)
 */
function getAverageWordLength(text) {
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    if (words.length === 0) return 0;
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
}
