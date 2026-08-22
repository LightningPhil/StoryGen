// src/pipeline.ts

import { callAgentAPI } from './api';
import { constructAgentPrompt, checkNarrativeVoiceConsistency } from './utils';
import type { AgentDefinition, PipelineData, CommonInputs } from './types';
import {
    PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE,
    PROMPT_AGENT_2_ELABORATOR_TEMPLATE,
    PROMPT_AGENT_3_REVIEWER_TEMPLATE,
    PROMPT_AGENT_4_POLISHER_TEMPLATE,
    PROMPT_AGENT_5_CLEANER_TEMPLATE,
    PROMPT_AGENT_6_TITLER_TEMPLATE,
    PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE,
} from './prompts/agent_prompts';
import appState from './appState';

// --- Agent Definitions ---
const AGENT_1_CRAFTER_DEF: AgentDefinition = { name: "Agent 1: Story Crafter", promptTemplate: PROMPT_AGENT_1_STORY_CRAFTER_TEMPLATE, dataKeys: ['charactersList', 'audience', 'USER_SUGGESTIONS_TEXT', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_2_ELABORATOR_DEF: AgentDefinition = { name: "Agent 2: Elaborator", promptTemplate: PROMPT_AGENT_2_ELABORATOR_TEMPLATE, dataKeys: ['storyText', 'audience', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_C_CONSOLIDATOR_DEF: AgentDefinition = { name: "Agent C: Consolidator", promptTemplate: PROMPT_AGENT_X_CONSOLIDATOR_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_3_REVIEWER_DEF: AgentDefinition = { name: "Agent 3: Reviewer", promptTemplate: PROMPT_AGENT_3_REVIEWER_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'reviewText' };
const AGENT_4_POLISHER_DEF: AgentDefinition = { name: "Agent 4: Polisher", promptTemplate: PROMPT_AGENT_4_POLISHER_TEMPLATE, dataKeys: ['storyText', 'reviewText', 'READING_AGE_NOTE', 'CRAFT_GUIDE_TEXT', 'AUTHOR_STYLE_GUIDE', 'ADJUSTMENT_MODULES_TEXT', 'NARRATOR_PERSONA_TEXT', 'SENSITIVITY_GUIDANCE_TEXT'], outputKey: 'storyText' };
const AGENT_5_CLEANER_DEF: AgentDefinition = { name: "Agent 5: Cleaner", promptTemplate: PROMPT_AGENT_5_CLEANER_TEMPLATE, dataKeys: ['storyText'], outputKey: 'storyText' };
const AGENT_6_TITLER_DEF: AgentDefinition = { name: "Agent 6: Titler", promptTemplate: PROMPT_AGENT_6_TITLER_TEMPLATE, dataKeys: ['storyText', 'READING_AGE_NOTE'], outputKey: 'titleText' };

// --- Dynamic Pipeline Configuration Functions ---
export function getStoryGenerationPipelineConfig(enableConsolidator: boolean): AgentDefinition[] {
    const pipeline: AgentDefinition[] = [
        AGENT_1_CRAFTER_DEF,
        AGENT_2_ELABORATOR_DEF,
    ];
    if (enableConsolidator) {
        pipeline.push(AGENT_C_CONSOLIDATOR_DEF);
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
    const commonRecord = commonInputs as unknown as Record<string, unknown>;

    for (const agentDef of pipelineConfig) {
        if (commonInputs.abortSignal?.aborted) {
            throw new DOMException('Story generation was cancelled.', 'AbortError');
        }

        if (statusCallback) statusCallback(`Step ${agentDef.step}: ${agentDef.name.substring(agentDef.name.indexOf(':') + 2).replace('(Elaboration Cycle)', '').trim().replace('Story ', '')}...\n`);
        
        const agentDataObject: Record<string, string> = {};

        agentDef.dataKeys.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(commonInputs, key)) {
                const value = commonRecord[key];
                agentDataObject[key] = typeof value === 'string' ? value : '';
            } else if (Object.prototype.hasOwnProperty.call(currentPipelineData, key)) {
                agentDataObject[key] = currentPipelineData[key] || '';
            } else {
                console.warn(`Data key "${key}" for agent "${agentDef.name}" not found in commonInputs or pipelineData. Using empty string.`);
                agentDataObject[key] = ''; 
            }
        });
        
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
            commonInputs.abortSignal
        );

        if (agentDef.outputKey) {
            currentPipelineData[agentDef.outputKey] = agentOutput;
        } else {
            // Default to storyText if no specific output key is defined
            currentPipelineData.storyText = agentOutput; 
        }
    }
    
    // Run voice consistency check on final story
    if (currentPipelineData.storyText) {
        const voiceWarnings = checkNarrativeVoiceConsistency(currentPipelineData.storyText);
        if (voiceWarnings.length > 0) {
            console.warn('Narrative Voice Consistency Warnings:', voiceWarnings);
            appState.addLogEntry({
                agentName: 'Voice Validator',
                type: 'warning',
                content: `Potential voice consistency issues detected:\n• ${voiceWarnings.join('\n• ')}`,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return currentPipelineData;
}