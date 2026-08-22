// src/pipeline.ts

import { callAgentAPI } from './api';
import { constructAgentPrompt, checkNarrativeVoiceConsistency, sanitizeGeneratedTitle } from './utils';
import type { AgentDefinition, PipelineData, CommonInputs } from './types';
import {
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
    PROMPT_AGENT_3_REVIEWER_TEMPLATE,
    PROMPT_AGENT_4_POLISHER_TEMPLATE,
    PROMPT_AGENT_5_CLEANER_TEMPLATE,
    PROMPT_AGENT_6_TITLER_TEMPLATE,
    PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE,
    PROMPT_EXPERIMENTAL_FAST_STORY_TEMPLATE,
} from './prompts/agent_prompts';
import { FAST_STORY_SYSTEM_INSTRUCTION, STORY_SYSTEM_INSTRUCTION } from './prompts/system_policy';
import appState from './appState';

// --- Agent Definitions ---
const AGENT_1_CRAFTER_DEF: AgentDefinition = { name: "Agent 1: Story Crafter", promptTemplate: PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, dataKeys: ['charactersList', 'audience', 'USER_SUGGESTIONS_TEXT', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_2_ELABORATOR_DEF: AgentDefinition = { name: "Agent 2: Elaborator", promptTemplate: PROMPT_AGENT_2_ELABORATOR_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'FRAMEWORK_SUMMARY_TEXT', 'AUTHOR_STYLE_SUMMARY_TEXT', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_SUMMARY_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_C_CONSOLIDATOR_DEF: AgentDefinition = { name: "Agent C: Consolidator", promptTemplate: PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'FRAMEWORK_SUMMARY_TEXT', 'AUTHOR_STYLE_SUMMARY_TEXT', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_SUMMARY_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_3_REVIEWER_DEF: AgentDefinition = { name: "Agent 3: Reviewer", promptTemplate: PROMPT_AGENT_3_REVIEWER_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'reviewText' };
const AGENT_4_POLISHER_DEF: AgentDefinition = { name: "Agent 4: Polisher", promptTemplate: PROMPT_AGENT_4_POLISHER_TEMPLATE, dataKeys: ['storyText', 'reviewText', 'audience', 'READING_AGE_NOTE', 'FRAMEWORK_SUMMARY_TEXT', 'AUTHOR_STYLE_SUMMARY_TEXT', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_SUMMARY_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_5_CLEANER_DEF: AgentDefinition = { name: "Agent 5: Cleaner", promptTemplate: PROMPT_AGENT_5_CLEANER_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE'], outputKey: 'storyText' };
const AGENT_6_TITLER_DEF: AgentDefinition = { name: "Agent 6: Titler", promptTemplate: PROMPT_AGENT_6_TITLER_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE'], outputKey: 'titleText' };

export const FAST_STORY_AGENT_NAME = 'Agent F: Experimental Fast Generator';

const FAST_STORY_DATA_KEYS = [
    'charactersList',
    'audience',
    'USER_SUGGESTIONS_TEXT',
    'READING_AGE_NOTE',
    'CRAFT_GUIDE_TEXT',
    'FRAMEWORK_SUMMARY_TEXT',
    'AUTHOR_STYLE_GUIDE',
    'ADJUSTMENT_MODULES_TEXT',
    'NARRATOR_PERSONA_TEXT',
    'SENSITIVITY_GUIDANCE_TEXT',
    'CONSOLIDATION_GUIDANCE_TEXT',
    'FAST_ENRICHMENT_GUIDANCE_TEXT',
];

const FAST_STORY_RESPONSE_SCHEMA: Record<string, unknown> = {
    type: 'OBJECT',
    properties: {
        title: {
            type: 'STRING',
            description: 'A distinctive 2-8 word children’s-story title without quotation marks or markup, unless clarity requires another length.',
        },
        story: {
            type: 'STRING',
            description: 'The complete publication-ready plain-text story body, without its title.',
        },
    },
    required: ['title', 'story'],
    propertyOrdering: ['title', 'story'],
};

const CONCISE_FRAMEWORKS = new Set([
    'Fable (Aesop Style)',
    'Learning Fable (STEM)',
]);

export function frameworkUsesConcisePipeline(frameworkKey: string): boolean {
    return CONCISE_FRAMEWORKS.has(frameworkKey);
}

// --- Dynamic Pipeline Configuration Functions ---
export function getStoryGenerationPipelineConfig(enableConsolidator: boolean, frameworkKey: string = ''): AgentDefinition[] {
    const pipeline: AgentDefinition[] = [
        AGENT_1_CRAFTER_DEF,
    ];

    if (!frameworkUsesConcisePipeline(frameworkKey)) {
        pipeline.push(AGENT_2_ELABORATOR_DEF);
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

export function getElaborationPipelineConfig(enableConsolidator: boolean): AgentDefinition[] {
    const pipeline: AgentDefinition[] = [
        AGENT_2_ELABORATOR_DEF,
        AGENT_3_REVIEWER_DEF,
        AGENT_4_POLISHER_DEF,
    ];
    if (enableConsolidator) {
        pipeline.push(AGENT_C_CONSOLIDATOR_DEF);
    }
    pipeline.push(AGENT_5_CLEANER_DEF);

    return pipeline.map((agent, index) => ({ ...agent, step: `${index + 1}/${pipeline.length}` }));
}

function collectPromptData(
    dataKeys: string[],
    pipelineData: PipelineData,
    commonInputs: CommonInputs,
    agentName: string,
): Record<string, string> {
    const data: Record<string, string> = {};
    const commonRecord = commonInputs as unknown as Record<string, unknown>;

    dataKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(commonInputs, key)) {
            const value = commonRecord[key];
            data[key] = typeof value === 'string' ? value : '';
        } else if (Object.prototype.hasOwnProperty.call(pipelineData, key)) {
            data[key] = pipelineData[key] || '';
        } else {
            console.warn(`Data key "${key}" for agent "${agentName}" not found in commonInputs or pipelineData. Using empty string.`);
            data[key] = '';
        }
    });

    return data;
}

export function buildFastStoryPrompt(pipelineData: PipelineData, commonInputs: CommonInputs): string {
    const promptData = collectPromptData(
        FAST_STORY_DATA_KEYS,
        pipelineData,
        commonInputs,
        FAST_STORY_AGENT_NAME,
    );
    return constructAgentPrompt(PROMPT_EXPERIMENTAL_FAST_STORY_TEMPLATE, promptData);
}

export function parseFastStoryResponse(rawOutput: string): Pick<PipelineData, 'storyText' | 'titleText'> {
    const withoutFence = rawOutput
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    const candidates = [
        withoutFence,
        firstBrace >= 0 && lastBrace > firstBrace
            ? withoutFence.slice(firstBrace, lastBrace + 1)
            : '',
    ].filter(Boolean);

    let parsed: Record<string, unknown> | null = null;
    for (const candidate of candidates) {
        try {
            const value = JSON.parse(candidate) as unknown;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                parsed = value as Record<string, unknown>;
                break;
            }
        } catch {
            // Try the next safe JSON candidate before reporting a useful error.
        }
    }

    if (!parsed) {
        throw new Error('Fast mode returned invalid JSON. Please retry or disable Experimental Fast Mode.');
    }

    const storyValue = typeof parsed.story === 'string'
        ? parsed.story
        : (typeof parsed.storyText === 'string' ? parsed.storyText : '');
    const storyText = storyValue.trim();
    if (storyText.length < 100) {
        throw new Error('Fast mode returned an empty or unusually short story. Please retry or disable Experimental Fast Mode.');
    }

    const titleValue = typeof parsed.title === 'string'
        ? parsed.title
        : (typeof parsed.titleText === 'string' ? parsed.titleText : '');
    const titleText = sanitizeGeneratedTitle(titleValue);
    if (!titleText) {
        throw new Error('Fast mode returned a story without a valid title. Please retry or disable Experimental Fast Mode.');
    }

    return { storyText, titleText };
}

export async function runFastStoryGeneration(
    pipelineData: PipelineData,
    commonInputs: CommonInputs,
    statusCallback: ((msg: string) => void) | null,
    agentCaller: typeof callAgentAPI = callAgentAPI,
): Promise<PipelineData> {
    if (commonInputs.abortSignal?.aborted) {
        throw new DOMException('Story generation was cancelled.', 'AbortError');
    }

    if (statusCallback) {
        statusCallback('Experimental Fast Mode: drafting, reviewing, polishing, cleaning, and titling in one request...\n');
    }

    const prompt = buildFastStoryPrompt(pipelineData, commonInputs);
    const enableThinking = commonInputs.agentThinkingConfig[FAST_STORY_AGENT_NAME] || false;
    const rawOutput = await agentCaller(
        prompt,
        commonInputs.apiKey,
        commonInputs.modelId,
        FAST_STORY_AGENT_NAME,
        0,
        appState.lastRunChatLog,
        statusCallback,
        commonInputs.minApiIntervalMs,
        enableThinking,
        'application/json',
        commonInputs.abortSignal,
        FAST_STORY_SYSTEM_INSTRUCTION,
        enableThinking ? undefined : FAST_STORY_RESPONSE_SCHEMA,
    );

    try {
        const parsed = parseFastStoryResponse(rawOutput);
        const result = { ...pipelineData, ...parsed };
        logVoiceConsistencyWarnings(result.storyText);
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appState.addLogEntry({
            agentName: FAST_STORY_AGENT_NAME,
            type: 'fast-mode-parse-error',
            content: message,
            timestamp: new Date().toISOString(),
        });
        throw error;
    }
}

/**
 * Executes a sequence of agent calls to generate or modify a story.
 * @param {Array<Object>} pipelineConfig - The array of agent definitions for the pipeline.
 * @param {Object} pipelineData - The initial data for the pipeline (e.g., charactersList).
 * @param {Object} commonInputs - The common data available to all agents (API key, guides, etc.).
 * @param statusCallback - Receives progress messages for the UI.
 * @returns The final data object from the pipeline.
 */
export async function runPipeline(pipelineConfig: AgentDefinition[], pipelineData: PipelineData, commonInputs: CommonInputs, statusCallback: ((msg: string) => void) | null): Promise<PipelineData> {
    let currentPipelineData: PipelineData = { ...pipelineData };

    for (const agentDef of pipelineConfig) {
        if (commonInputs.abortSignal?.aborted) {
            throw new DOMException('Story generation was cancelled.', 'AbortError');
        }

        if (statusCallback) statusCallback(`Step ${agentDef.step}: ${agentDef.name.substring(agentDef.name.indexOf(':') + 2).replace('(Elaboration Cycle)', '').trim().replace('Story ', '')}...\n`);
        
        const agentDataObject = collectPromptData(
            agentDef.dataKeys,
            currentPipelineData,
            commonInputs,
            agentDef.name,
        );
        const currentPrompt = constructAgentPrompt(agentDef.promptTemplate, agentDataObject);

        // Determine if this specific agent should use thinking
        const enableThinking = commonInputs.agentThinkingConfig[agentDef.name] || false;
        
        const agentOutput = await callAgentAPI(
            currentPrompt, 
            commonInputs.apiKey, 
            commonInputs.modelId, 
            agentDef.name, 
            0, 
            appState.lastRunChatLog, 
            statusCallback, 
            commonInputs.minApiIntervalMs,
            enableThinking,
            '',
            commonInputs.abortSignal,
            STORY_SYSTEM_INSTRUCTION
        );

        if (agentDef.outputKey) {
            currentPipelineData[agentDef.outputKey] = agentOutput;
        } else {
            // Default to storyText if no specific output key is defined
            currentPipelineData.storyText = agentOutput; 
        }
    }
    
    logVoiceConsistencyWarnings(currentPipelineData.storyText);
    
    return currentPipelineData;
}

function logVoiceConsistencyWarnings(storyText: string): void {
    if (!storyText) return;

    const voiceWarnings = checkNarrativeVoiceConsistency(storyText);
    if (voiceWarnings.length === 0) return;

    console.warn('Narrative Voice Consistency Warnings:', voiceWarnings);
    appState.addLogEntry({
        agentName: 'Voice Validator',
        type: 'warning',
        content: `Potential voice consistency issues detected:\n• ${voiceWarnings.join('\n• ')}`,
        timestamp: new Date().toISOString()
    });
}