import type { UIElements } from './types.js';
export declare function initUIElements(elements: UIElements): void;
export declare function clearStoryOutput(): void;
export declare function updateStatusInStoryOutput(message: string): void;
export declare function displayFinalStoryOutput(title: string, storyText: string, isElaboration?: boolean): void;
export declare function displayErrorInStoryOutput(errorMessage: string): void;
export declare function showTemporaryToast(message: string, type?: string, duration?: number): void;
export declare function updateFrameworkSummaryDisplay(STORY_FRAMEWORK_SUMMARIES_DATA: Record<string, string>): void;
export declare function updateAuthorStyleSummaryDisplay(STORY_STYLE_SUMMARIES_DATA: Record<string, string>): void;
export declare function disableMainControls(): void;
export declare function enableMainControls(): void;
export declare function applyStoryFontSize(newSizeRem: number): void;
export declare function populateDropdown(selectElement: HTMLSelectElement, optionsObject: Record<string, unknown>, capitalize?: boolean): void;
/**
 * Formats story text as HTML with proper paragraphs, typography, and markdown
 * rendering.
 *
 * Supported markdown features:
 *   - Headings:          # H1 … ###### H6
 *   - Bold:              **text**
 *   - Italic:            *text*
 *   - Strikethrough:     ~~text~~
 *   - Inline code:       `code`
 *   - Fenced code blocks: ```lang … ```
 *   - Horizontal rules:  ---, ***, ___
 *   - Unordered lists:   lines starting with - or * (nested via indentation)
 *   - Ordered lists:     lines starting with 1. 2. etc. (nested via indentation)
 *   - Blockquotes:       > text  (nesting via >>)
 *   - Tables:            | col | col | with optional alignment row
 *   - Scene breaks:      * * *  (decorative variant)
 *
 * @param {string} text - Raw story / markdown text
 * @returns {string} HTML formatted story
 */
export declare function formatStoryAsHtml(text: string): string;
