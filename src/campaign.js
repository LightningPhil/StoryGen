// src/campaign.js
// Multi-Part Story Campaign Manager

/**
 * CampaignManager
 * Manages multi-episode story arcs with persistent state, character development,
 * and narrative continuity across sessions.
 */

import { saveToLocalStorage, loadFromLocalStorage } from './localStorage.js';

// LocalStorage keys for campaigns
const LS_CAMPAIGNS = 'storyGen_campaigns';
const LS_ACTIVE_CAMPAIGN = 'storyGen_activeCampaign';

// Campaign arc templates
export const CAMPAIGN_ARCS = {
    'three_part': {
        name: '3-Part Mini-Series',
        episodes: 3,
        structure: [
            { episode: 1, focus: 'Introduction & Inciting Incident', guidance: 'Establish the world, introduce the main characters, and present the central challenge or goal that will span all episodes. End with a hook that makes the child want to hear more.' },
            { episode: 2, focus: 'Rising Action & Complications', guidance: 'Deepen the challenge. Characters face setbacks and learn important lessons. Build toward the climax. End on a cliffhanger or moment of decision.' },
            { episode: 3, focus: 'Climax & Resolution', guidance: 'The grand finale! Characters use everything they\'ve learned to overcome the final challenge. Wrap up all storylines and celebrate the victory. Leave room for fond memories of the adventure.' }
        ]
    },
    'five_part': {
        name: '5-Part Adventure',
        episodes: 5,
        structure: [
            { episode: 1, focus: 'The Call to Adventure', guidance: 'Introduce the hero\'s ordinary world, then present the challenge that will change everything. End with the decision to embark on the journey.' },
            { episode: 2, focus: 'Gathering Allies', guidance: 'The hero meets friends who will help on the journey. Each friend brings a unique skill. Small challenges test the group.' },
            { episode: 3, focus: 'The First Major Trial', guidance: 'A significant challenge that requires the team to work together. They succeed but realize the true challenge is bigger than expected.' },
            { episode: 4, focus: 'Darkest Hour', guidance: 'Things go wrong. The team is separated or faces their biggest fear. But through courage and friendship, they find a way forward.' },
            { episode: 5, focus: 'The Triumphant Return', guidance: 'The final battle. Using all their skills and lessons learned, the heroes triumph. They return home changed for the better, with a gift to share.' }
        ]
    },
    'seven_part': {
        name: '7-Night Epic Journey',
        episodes: 7,
        structure: [
            { episode: 1, focus: 'Once Upon a Time', guidance: 'Establish a rich, inviting world. Introduce the hero and their heart\'s desire. Plant seeds for the journey ahead.' },
            { episode: 2, focus: 'The Threshold', guidance: 'The hero leaves their comfort zone. They encounter their first challenge and first helper. The adventure truly begins.' },
            { episode: 3, focus: 'Trials Begin', guidance: 'A series of tests that reveal the hero\'s strengths and weaknesses. New friends and enemies appear.' },
            { episode: 4, focus: 'The Heart of the Story', guidance: 'The midpoint. A revelation changes everything. The hero understands what they truly seek. The stakes become personal.' },
            { episode: 5, focus: 'The Ordeal', guidance: 'The hero faces their greatest fear. They may fail, but learn something crucial. Allies prove their worth.' },
            { episode: 6, focus: 'The Race to Victory', guidance: 'Armed with new knowledge, the hero pushes toward the goal. Obstacles fall one by one. The finale approaches.' },
            { episode: 7, focus: 'Happily Ever After', guidance: 'The ultimate challenge. Victory! The hero returns transformed, ready to share what they\'ve learned. The world is better for their journey.' }
        ]
    }
};

/**
 * Campaign data structure
 * @typedef {Object} Campaign
 * @property {string} id - Unique campaign identifier
 * @property {string} title - Campaign title
 * @property {string} arcType - Key from CAMPAIGN_ARCS
 * @property {number} currentEpisode - Current episode number (1-indexed)
 * @property {number} totalEpisodes - Total episodes in campaign
 * @property {Array<Episode>} episodes - Array of episode data
 * @property {Object} characters - Character tracking
 * @property {string} overarchingGoal - The main story goal
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

/**
 * Episode data structure
 * @typedef {Object} Episode
 * @property {number} number - Episode number
 * @property {string} title - Episode title
 * @property {string} summary - AI-generated summary for continuity
 * @property {string} fullText - Complete story text
 * @property {Array<string>} keyEvents - Important events for continuity
 * @property {Object} characterDevelopment - Character changes/growth
 * @property {string} cliffhanger - If any, the cliffhanger for next episode
 * @property {string} generatedAt - ISO timestamp
 */

class CampaignManager {
    constructor() {
        this.campaigns = this.loadCampaigns();
        this.activeCampaignId = loadFromLocalStorage(LS_ACTIVE_CAMPAIGN) || null;
    }

    /**
     * Load all campaigns from localStorage
     */
    loadCampaigns() {
        const data = loadFromLocalStorage(LS_CAMPAIGNS);
        if (!data) return {};
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse campaigns:', e);
            return {};
        }
    }

    /**
     * Save all campaigns to localStorage
     */
    saveCampaigns() {
        saveToLocalStorage(LS_CAMPAIGNS, JSON.stringify(this.campaigns));
    }

    /**
     * Create a new campaign
     * @param {Object} options - Campaign options
     * @returns {Campaign} The new campaign
     */
    createCampaign({ title, arcType, characters, overarchingGoal }) {
        const arc = CAMPAIGN_ARCS[arcType];
        if (!arc) {
            throw new Error(`Unknown arc type: ${arcType}`);
        }

        const id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const campaign = {
            id,
            title,
            arcType,
            currentEpisode: 1,
            totalEpisodes: arc.episodes,
            episodes: [],
            characters: characters || {},
            overarchingGoal: overarchingGoal || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.campaigns[id] = campaign;
        this.saveCampaigns();
        
        return campaign;
    }

    /**
     * Get a campaign by ID
     */
    getCampaign(id) {
        return this.campaigns[id] || null;
    }

    /**
     * Get the active campaign
     */
    getActiveCampaign() {
        if (!this.activeCampaignId) return null;
        return this.getCampaign(this.activeCampaignId);
    }

    /**
     * Set the active campaign
     */
    setActiveCampaign(id) {
        this.activeCampaignId = id;
        saveToLocalStorage(LS_ACTIVE_CAMPAIGN, id);
    }

    /**
     * Clear the active campaign
     */
    clearActiveCampaign() {
        this.activeCampaignId = null;
        saveToLocalStorage(LS_ACTIVE_CAMPAIGN, '');
    }

    /**
     * Get all campaigns
     */
    getAllCampaigns() {
        return Object.values(this.campaigns).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Complete an episode and advance the campaign
     * @param {string} campaignId - Campaign ID
     * @param {Object} episodeData - Episode data to save
     */
    completeEpisode(campaignId, episodeData) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return null;

        const episode = {
            number: campaign.currentEpisode,
            title: episodeData.title || `Episode ${campaign.currentEpisode}`,
            summary: episodeData.summary || '',
            fullText: episodeData.fullText || '',
            keyEvents: episodeData.keyEvents || [],
            characterDevelopment: episodeData.characterDevelopment || {},
            cliffhanger: episodeData.cliffhanger || '',
            generatedAt: new Date().toISOString()
        };

        campaign.episodes.push(episode);
        
        // Advance to next episode if not complete
        if (campaign.currentEpisode < campaign.totalEpisodes) {
            campaign.currentEpisode++;
        }
        
        campaign.updatedAt = new Date().toISOString();
        this.saveCampaigns();
        
        return campaign;
    }

    /**
     * Delete a campaign
     */
    deleteCampaign(id) {
        if (this.activeCampaignId === id) {
            this.clearActiveCampaign();
        }
        delete this.campaigns[id];
        this.saveCampaigns();
    }

    /**
     * Get current episode info with arc guidance
     */
    getCurrentEpisodeInfo(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return null;

        const arc = CAMPAIGN_ARCS[campaign.arcType];
        if (!arc) return null;

        const structureInfo = arc.structure[campaign.currentEpisode - 1];
        
        return {
            episodeNumber: campaign.currentEpisode,
            totalEpisodes: campaign.totalEpisodes,
            focus: structureInfo?.focus || '',
            guidance: structureInfo?.guidance || '',
            isFirstEpisode: campaign.currentEpisode === 1,
            isFinalEpisode: campaign.currentEpisode === campaign.totalEpisodes,
            previousEpisodes: campaign.episodes
        };
    }

    /**
     * Build continuity summary from previous episodes
     */
    buildContinuitySummary(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign || campaign.episodes.length === 0) return '';

        const parts = ['## 📚 STORY SO FAR (Previous Episodes Summary)\n'];
        
        campaign.episodes.forEach((ep, index) => {
            parts.push(`### Episode ${index + 1}: "${ep.title}"`);
            parts.push(ep.summary || '(Summary not available)');
            
            if (ep.keyEvents && ep.keyEvents.length > 0) {
                parts.push('\n**Key Events:**');
                ep.keyEvents.forEach(event => parts.push(`- ${event}`));
            }
            
            if (ep.cliffhanger) {
                parts.push(`\n**Ended with:** ${ep.cliffhanger}`);
            }
            
            parts.push(''); // Empty line between episodes
        });

        return parts.join('\n');
    }

    /**
     * Generate prompt guidance for the current episode
     */
    generateEpisodePromptGuidance(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return '';

        const episodeInfo = this.getCurrentEpisodeInfo(campaignId);
        if (!episodeInfo) return '';

        const arc = CAMPAIGN_ARCS[campaign.arcType];
        const parts = [];

        parts.push(`## 🎬 MULTI-PART CAMPAIGN: "${campaign.title}"`);
        parts.push(`**Arc:** ${arc.name}`);
        parts.push(`**Episode:** ${episodeInfo.episodeNumber} of ${episodeInfo.totalEpisodes}`);
        parts.push(`**Episode Focus:** ${episodeInfo.focus}`);
        parts.push('');
        
        if (campaign.overarchingGoal) {
            parts.push(`**Series Goal:** ${campaign.overarchingGoal}`);
            parts.push('');
        }

        parts.push('### Episode-Specific Guidance');
        parts.push(episodeInfo.guidance);
        parts.push('');

        // Add continuity from previous episodes
        if (episodeInfo.previousEpisodes.length > 0) {
            parts.push(this.buildContinuitySummary(campaignId));
        }

        // Add special instructions based on episode position
        if (episodeInfo.isFirstEpisode) {
            parts.push('### First Episode Requirements');
            parts.push('- Establish all main characters clearly');
            parts.push('- Create a sense of the world and its rules');
            parts.push('- Plant seeds for the overall journey');
            parts.push('- End with a hook that creates anticipation');
        } else if (episodeInfo.isFinalEpisode) {
            parts.push('### Final Episode Requirements');
            parts.push('- Reference and resolve threads from earlier episodes');
            parts.push('- Give each character a moment to shine');
            parts.push('- Provide a satisfying, complete ending');
            parts.push('- Consider callbacks to the first episode');
        } else {
            parts.push('### Continuing Episode Requirements');
            parts.push('- Reference events from previous episodes naturally');
            parts.push('- Show character growth and development');
            parts.push('- Maintain consistent character voices');
            parts.push('- End with anticipation for the next episode');
        }

        return parts.join('\n');
    }

    /**
     * Check if a campaign is complete
     */
    isCampaignComplete(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return false;
        return campaign.episodes.length >= campaign.totalEpisodes;
    }

    /**
     * Get campaign progress percentage
     */
    getCampaignProgress(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return 0;
        return Math.round((campaign.episodes.length / campaign.totalEpisodes) * 100);
    }
}

// Export singleton instance
export const campaignManager = new CampaignManager();

// Export for extraction of episode summaries
export function extractEpisodeSummary(storyText,  maxLength = 200) {
    // Simple extraction: take first few sentences
    const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let summary = sentences.slice(0, 3).join('. ').trim();
    
    if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary + '.';
}

export function extractKeyEvents(storyText) {
    // Simple extraction: look for action indicators
    const events = [];
    const actionIndicators = [
        /discovered\s+[^.!?]+/gi,
        /found\s+[^.!?]+/gi,
        /learned\s+[^.!?]+/gi,
        /met\s+[^.!?]+/gi,
        /decided\s+[^.!?]+/gi,
        /helped\s+[^.!?]+/gi,
        /saved\s+[^.!?]+/gi,
        /escaped\s+[^.!?]+/gi,
        /reached\s+[^.!?]+/gi,
        /solved\s+[^.!?]+/gi
    ];

    actionIndicators.forEach(pattern => {
        const matches = storyText.match(pattern);
        if (matches) {
            matches.slice(0, 2).forEach(match => {
                const event = match.trim();
                if (event.length > 10 && event.length < 100 && !events.includes(event)) {
                    events.push(event.charAt(0).toUpperCase() + event.slice(1));
                }
            });
        }
    });

    return events.slice(0, 5); // Return top 5 events
}

export function detectCliffhanger(storyText) {
    // Look for cliffhanger indicators in the last paragraph
    const paragraphs = storyText.split(/\n\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length === 0) return '';
    
    const lastParagraph = paragraphs[paragraphs.length - 1];
    
    const cliffhangerIndicators = [
        'to be continued',
        'what would happen next',
        'tomorrow',
        'next time',
        'but that\'s a story for another',
        'little did they know',
        'something was about to',
        'just then',
        'suddenly'
    ];

    const lowerLast = lastParagraph.toLowerCase();
    for (const indicator of cliffhangerIndicators) {
        if (lowerLast.includes(indicator)) {
            // Return the last sentence or two
            const sentences = lastParagraph.split(/[.!?]+/).filter(s => s.trim());
            return sentences.slice(-2).join('. ').trim() + '.';
        }
    }

    return '';
}
