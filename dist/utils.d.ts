export declare function parseCharacters(characterString: string): string[];
export declare function constructAgentPrompt(basePromptTemplate: string, dataObject: Record<string, string>): string;
export declare function countWords(text: string): number;
/**
 * Normalizes a vocabulary word for stable local storage keys.
 * Keeps letters, apostrophes, and hyphens; lowercases everything.
 */
export declare function normalizeVocabularyWord(word: string): string;
/**
 * Analyzes a story for potential narrative voice consistency issues.
 * Returns an array of warnings (empty if no issues detected).
 *
 * This is a heuristic check - not perfect, but catches obvious problems.
 */
export declare function checkNarrativeVoiceConsistency(storyText: string): string[];
