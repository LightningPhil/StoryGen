export declare const ADJUSTMENT_MODULES: Record<string, Record<string, string>>;
/**
 * Generates sensitivity guidance text based on current settings
 * @param {Object} settings - Object with conflict, scary, sadness, complexity levels (0-3)
 * @returns {string} Combined sensitivity guidance text
 */
export declare function getSensitivityGuidance(settings: {
    conflict?: number;
    scary?: number;
    sadness?: number;
    complexity?: number;
} | null): string;
