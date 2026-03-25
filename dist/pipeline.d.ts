import type { AgentDefinition, PipelineData, CommonInputs } from './types.js';
export declare function getStoryGenerationPipelineConfig(enableConsolidator: boolean): AgentDefinition[];
export declare function getElaborationPipelineConfig(enableConsolidator: boolean): AgentDefinition[];
/**
 * Executes a sequence of agent calls to generate or modify a story.
 * @param {Array<Object>} pipelineConfig - The array of agent definitions for the pipeline.
 * @param {Object} pipelineData - The initial data for the pipeline (e.g., charactersList).
 * @param {Object} commonInputs - The common data available to all agents (API key, guides, etc.).
 * @param {HTMLElement} storyOutputDiv - The DOM element to display status updates.
 * @returns {Promise<Object>} A promise that resolves with the final data object from the pipeline.
 */
export declare function runPipeline(pipelineConfig: AgentDefinition[], pipelineData: PipelineData, commonInputs: CommonInputs, storyOutputDiv: HTMLElement): Promise<PipelineData>;
