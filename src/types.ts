// src/types.ts — Shared type definitions for StoryGen

// ─── Chat Log ────────────────────────────────────────────────────────────────

export interface ChatLogEntry {
    agentName: string;
    type: string;
    content: string;
    timestamp: string;
    details?: string;
    stack?: string;
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface AgentDefinition {
    name: string;
    promptTemplate: string;
    dataKeys: string[];
    outputKey: string;
    step?: string;
}

export interface PipelineData {
    [key: string]: string;
}

export interface CommonInputs {
    apiKey: string;
    modelId: string;
    minApiIntervalMs: number;
    audience: string;
    CRAFT_GUIDE_TEXT: string;
    READING_AGE_NOTE: string;
    USER_SUGGESTIONS_TEXT: string;
    enableConsolidator: boolean;
    AUTHOR_STYLE_GUIDE: string;
    ADJUSTMENT_MODULES_TEXT: string;
    NARRATOR_PERSONA_TEXT: string;
    SENSITIVITY_GUIDANCE_TEXT: string;
    agentThinkingConfig: Record<string, boolean>;
    abortSignal?: AbortSignal;
}

// ─── Dictionary / Wiktionary ─────────────────────────────────────────────────

export interface DictionaryDefinition {
    partOfSpeech: string;
    glosses: string[];
}

export interface AssistData {
    word: string;
    definitions: DictionaryDefinition[];
    ipa: string;
    ipaDialect: string;
    audioUrl: string;
    synonyms: string[];
    antonyms: string[];
    etymology: string;
    source: 'freedict' | 'wiktionary' | 'cache';
}

// ─── Phonics ─────────────────────────────────────────────────────────────────

export interface GraphemeMapEntry {
    g: string;
    p: string[];
}

export interface AlignedChunk {
    grapheme: string;
    phoneme: string;
}

export interface PhonicsChunk {
    grapheme: string;
    phoneme: string;
    ttsHint: string;
}

export interface PhonicsAssist {
    word: string;
    fallback: boolean;
    chunks: PhonicsChunk[];
    phones: string[];
    phonemes: string[];
    confidence: number;
}

// ─── Sensitivity ─────────────────────────────────────────────────────────────

export interface SensitivitySettings {
    conflict: number;
    scary: number;
    sadness: number;
    complexity: number;
}

export interface SensitivityPreset extends SensitivitySettings {
    label?: string;
    description?: string;
}

// ─── Help Content ────────────────────────────────────────────────────────────

export interface HelpTopic {
    title: string;
    content: string;
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export interface VocabularyEntry {
    firstSeen: string;
    lookupCount: number;
}

export type VocabularyLookupData = Record<string, VocabularyEntry>;

// ─── Model Config ────────────────────────────────────────────────────────────

export interface ModelConfig {
    name: string;
    supportsThinking: boolean;
}

export interface StoryMetadata {
    title: string;
    date: string;
    characters?: string;
    audience?: string;
    ageGroup?: string;
    framework?: string;
    style?: string;
    narrator?: string;
    tone?: string;
    pacing?: string;
    humor?: string;
    emotion?: string;
    model?: string;
    readingAge?: number | null;
    consolidator?: boolean;
    wordCount?: number;
    plotPoints?: string;
    author?: string;
    tags?: string[];
}

// ─── STEM Concept ────────────────────────────────────────────────────────────

export interface STEMConceptData {
    hint: string;
    example: string;
    animal: string;
}

export interface SelectedSTEMConcept extends STEMConceptData {
    key: string;
}

// ─── Window augmentation (RiTa, phonics helpers) ─────────────────────────────

declare global {
    interface Window {
        RiTa?: {
            phones(word: string): string;
        };
        __phonicsHelpers?: {
            ttsHintForPhoneme: (p: string) => string;
        };
    }
}
