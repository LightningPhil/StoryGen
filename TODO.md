# StoryGen Development TODO

> **Purpose:** This document outlines the implementation plan for three major enhancements to the Story Generator application: (1) Fable Framework, (2) Bedtime Story Mode, and (3) Narrative Voice Consistency features.
>
> **Target Audience:** Developers and technical contributors
>
> **Last Updated:** February 16, 2026

---

## 🎯 Overview of Planned Features

### 1. Fable Framework
A new story structure specifically designed for short, moralistic tales featuring animal characters with human traits, following classical fable traditions (Aesop, La Fontaine).

### 2. Bedtime Story Mode
A quick-select preset that automatically configures optimal settings for sleep-time storytelling, with enhanced linguistic guidance for calming narrative.

### 3. Narrative Voice Consistency
Enhanced validation and guidance to ensure the narrator's tone remains consistent throughout the story, preventing jarring shifts in style or register.

---

## 📋 Feature 1: Fable Framework

### Background & Research

Classical fables have distinct characteristics:
- **Brevity:** Typically 300-600 words
- **Animal Protagonists:** Anthropomorphized animals representing human traits/vices
- **Clear Moral Lesson:** Explicitly stated or strongly implied
- **Simple Plot:** Single conflict, straightforward resolution
- **Universal Themes:** Honesty, humility, wisdom, consequences of pride/greed
- **Timeless Quality:** No specific time period or modern references
- **Binary Outcomes:** Clear winners/losers representing virtue/vice

**Sources:** Aesop's Fables, Jean de La Fontaine, Panchatantra

---

### Implementation Steps

#### Step 1.1: Define Fable Structure in `story_crafting_guides.js`

**File:** `src/prompts/story_crafting_guides.js`

**Action:** Add a new `FABLE_GUIDE` constant with the following structure:

```javascript
const FABLE_GUIDE = `
**Instructions for Story Creation using the Classical Fable Framework:**

Your story MUST follow this structure optimized for teaching a moral lesson through animal characters:

## STRUCTURE

1. **Opening Scene (The Setup):** 
   - Introduce 1-3 animal characters in a simple, natural setting
   - Each character represents a clear trait: wisdom, greed, pride, cleverness, etc.
   - Show their contrasting personalities through ONE brief action or statement
   - Word budget: 80-120 words

2. **The Conflict (The Test):**
   - Present a simple problem, challenge, or temptation
   - The conflict should directly test the characters' defining traits
   - Make the stakes clear but proportionate (food, safety, status, not life/death)
   - Word budget: 100-150 words

3. **The Choice & Consequence:**
   - Characters choose different approaches based on their nature
   - Show immediate, direct consequences of each choice
   - Use cause-and-effect clearly: "Because X did Y, Z happened"
   - Word budget: 100-150 words

4. **The Resolution & Moral:**
   - Conclude the story with clear outcomes for each character
   - State the moral lesson in the final 1-2 sentences, beginning with "And so..." or "Thus..."
   - The moral should feel earned by the preceding action, not tacked on
   - Word budget: 50-100 words

## CRAFT GUIDE (MUST-FOLLOW)

1. **Target Length:** 400-500 words maximum. Fables must be concise.

2. **Character Naming:** Use species names with simple descriptors:
   - GOOD: "The Clever Fox", "A Proud Peacock", "The Humble Mouse"
   - AVOID: "Fennec the Firetail", "Sir Reginald Fluffington III"

3. **Language Register:** 
   - Use clear, timeless language (avoid modern slang or references)
   - Sentence structure should be declarative and direct
   - Dialogue should be minimal and purposeful

4. **Anthropomorphism Balance:**
   - Animals think/speak like humans but retain their physical nature
   - A mouse can be clever but remains small; an elephant remains strong
   - Use each animal's natural traits meaningfully

5. **Moral Clarity:**
   - The lesson must be universal and applicable to children's lives
   - Acceptable themes: sharing, honesty, humility, wisdom, patience, kindness
   - Frame positively when possible: "Hard work brings reward" vs. "Laziness leads to failure"

6. **No Excessive Description:**
   - Describe only what advances the moral point
   - Skip weather, elaborate scenery, internal monologues
   - Every sentence must earn its place

7. **Dialogue Tags:** Use only "said" or no tag at all when clear from context.

8. **Binary Outcome Structure:**
   - One character's approach succeeds; another's fails (or succeeds less)
   - This contrast reinforces the moral lesson

## STYLE NOTES

- **Tone:** Earnest, straightforward, gently didactic
- **Pacing:** Steady and efficient; no meandering
- **Perspective:** Typically third-person omniscient narrator
- **Ending:** Must feel conclusive and satisfying within moral framework

## EXAMPLE OPENING

"A Crow sat upon a branch, holding a large piece of cheese in her beak. Along came a Fox, and he saw the cheese. 'What a beautiful bird you are,' said the Fox. 'Surely your voice must be as lovely as your feathers.'"

This opening immediately shows who, what, where, and the Fox's manipulative nature—all in three sentences.
`;
```

**Register this in exports:**
```javascript
export const STORY_CRAFTING_GUIDES = {
    // ... existing frameworks
    "Fable (Aesop Style)": FABLE_GUIDE,
};

export const STORY_FRAMEWORK_SUMMARIES = {
    // ... existing summaries
    "Fable (Aesop Style)": "A short, moral tale with animal characters. Features a clear conflict and an explicit lesson. (~400-500 words)",
};
```

#### Step 1.2: Update UI to Include Fable Option

**File:** `src/script.js`

**Action:** No code changes needed—the framework will automatically populate in the `#craftingFrameworkSelect` dropdown from the `STORY_CRAFTING_GUIDES` object.

**Verification:** After implementing Step 1.1, reload the app and confirm "Fable (Aesop Style)" appears in the dropdown.

#### Step 1.3: Create Fable-Optimized Prompting

**File:** `src/prompts/agent_prompts.js`

**Action:** Review how the Crafter agent assembles prompts. Ensure that when "Fable" is selected:
- Target word count adjusts to 400-500 (rather than 800-1200)
- Language register emphasizes brevity and clarity
- The final "Moral" step is clearly communicated to the agent

**Specific Addition:** In the section where word count guidance is provided, add conditional logic:

```javascript
// Pseudocode example for agent_prompts.js
if (selectedFramework === "Fable (Aesop Style)") {
    wordCountGuidance = "Target length: 400-500 words. Fables must be concise.";
} else {
    wordCountGuidance = "Maximum word count guidance: 800-1200 words.";
}
```

#### Step 1.4: Test Fable Generation

**Testing Checklist:**
- [ ] Generate at least 5 fables with different moral themes
- [ ] Verify word count stays within 350-550 range
- [ ] Confirm animal characters are used appropriately
- [ ] Check that moral lesson is present and clear
- [ ] Ensure tone is timeless (no modern slang)
- [ ] Validate that story follows 4-part structure

**Test Scenarios:**
1. "A greedy crow and a clever fox" → Test: Pride / Flattery lesson
2. "A slow tortoise and a fast rabbit" → Test: Persistence lesson
3. "A mouse and a lion" → Test: Kindness/reciprocity lesson
4. "A dog with a bone crossing a bridge" → Test: Greed lesson

---

## 📋 Feature 2: Bedtime Story Mode

### Background & Research

Bedtime stories serve a specific psychological function: transitioning children from active/alert states to calm/sleepy states. Effective bedtime narratives share characteristics:

**Linguistic Features:**
- Predominance of soft consonants: L, M, N, W, R (avoid hard K, T, P sounds)
- Longer, flowing sentences that mimic breath patterns
- Repetitive, rhythmic phrases (lullaby quality)
- Warm, reassuring vocabulary (cozy, soft, gentle, warm, safe, snuggle)

**Structural Features:**
- Low-stakes conflict (no villains, danger, or fear)
- Predictable, circular narrative (return to starting point)
- Gradual energy reduction toward ending
- Explicit "safe and sleepy" conclusion

**Emotional Goals:**
- Comfort and security
- Gentle wonder (not excitement)
- Parent-child connection points
- Ending that invites sleep

**Sources:** Research on bedtime routines, Judith Kerr, Michael Bond, Margaret Wise Brown (*Goodnight Moon*)

---

### Implementation Steps

#### Step 2.1: Define Bedtime Mode Configuration Preset

**File:** `src/appState.js` (or create new `src/presets.js`)

**Action:** Define a `BEDTIME_MODE_PRESET` object that encapsulates all optimal settings:

```javascript
export const BEDTIME_MODE_PRESET = {
    framework: "Story Circle", // Circular journey fits bedtime well
    authorStyle: "Gentle & Reassuring (Kerr/Bond)",
    adjustments: {
        tone: "calm_bedtime",
        pacing: "slow_soothing",
        humor: "none", // Avoid excitement
        emotion: "heartwarming"
    },
    consolidator: false, // Keep natural length for pacing
    readingAge: 5, // Younger audience
    // Future: Could include word count caps, specific sensory guidance
};
```

#### Step 2.2: Add Enhanced Bedtime Linguistic Guidance

**File:** `src/prompts/adjustment_modules.js`

**Action:** Expand the `calm_bedtime` tone module with specific linguistic instructions:

```javascript
tone: {
    'none': '',
    'calm_bedtime': `**Tone: Calm & Bedtime Mode (Enhanced)**

Use gentle, soothing language with a lullaby-like rhythm to help listeners transition toward sleep.

**Linguistic Guidance:**
- **Soft Consonants:** Favor words with L, M, N, W, R sounds. Minimize hard consonants (K, T, P, D, G).
  - GOOD: "The little lamb lay down in the meadow, warm and drowsy."
  - AVOID: "The cat kicked the gate and dashed past the park."
  
- **Sentence Flow:** Use longer, flowing sentences that mimic natural breathing patterns. Avoid choppy or staccato rhythm.
  
- **Calming Vocabulary:** Emphasize words like: soft, gentle, warm, cozy, quiet, peaceful, safe, snuggle, dream, moonlight, yawn, sleepy, rest.

- **Imagery:** Focus on peaceful, comforting scenes:
  - Moonlight through windows
  - Soft blankets and pillows
  - Gentle night sounds (crickets, distant owls)
  - Warm drinks (milk, cocoa)
  - Stars, twilight, lullabies
  
**Conflict Resolution:**
- Any conflict must be very mild (a small worry, a gentle misunderstanding)
- Resolve with kindness, reassurance, and safety
- NO villains, danger, scary creatures, or loud surprises

**Story Arc:**
- Begin with gentle activity or exploration
- Middle: A small, solvable challenge or quiet discovery
- Ending: Explicit return to safety, comfort, and rest
  - Final paragraph should include sleepy/rest imagery
  - Consider ending with character going to bed, looking at stars, or feeling safe

**Narrative Voice:**
- Speak as a warm, gentle storyteller
- Use a slower, softer tone in word choice
- Occasional direct address ("And so, our little friend..." or "Just like you...")

**Pacing:** Gradually slow down as story progresses. The final third should feel like winding down.`,
    // ... other tone options
},
```

#### Step 2.3: Create UI Toggle for Bedtime Mode

**File:** `index.html`

**Action:** Add a prominent "Bedtime Mode" toggle button in the controls panel, preferably near the top for easy access:

```html
<!-- Add after the panel header, before form-section -->
<div class="bedtime-mode-toggle-container">
    <button id="bedtimeModeToggle" class="button-bedtime-mode" aria-pressed="false">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span>Bedtime Mode</span>
    </button>
</div>
```

**File:** `src/style.css`

**Action:** Add styling for the bedtime mode button:

```css
.bedtime-mode-toggle-container {
    margin: 1rem 0;
    padding: 0.75rem;
    background: linear-gradient(135deg, #2d1b4e 0%, #1a1035 100%);
    border-radius: 8px;
    border: 1px solid rgba(147, 112, 219, 0.3);
}

.button-bedtime-mode {
    width: 100%;
    padding: 0.75rem;
    background: rgba(147, 112, 219, 0.2);
    border: 1px solid rgba(147, 112, 219, 0.4);
    border-radius: 6px;
    color: #e0d4f7;
    font-size: 1rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.button-bedtime-mode:hover {
    background: rgba(147, 112, 219, 0.3);
    border-color: rgba(147, 112, 219, 0.6);
}

.button-bedtime-mode[aria-pressed="true"] {
    background: rgba(147, 112, 219, 0.5);
    border-color: #9370db;
    box-shadow: 0 0 12px rgba(147, 112, 219, 0.4);
}

.button-bedtime-mode svg {
    flex-shrink: 0;
}
```

#### Step 2.4: Implement Bedtime Mode Logic

**File:** `src/script.js`

**Action:** Add event listener and state management for bedtime mode:

```javascript
// Import the preset
import { BEDTIME_MODE_PRESET } from './presets.js'; // or from appState.js

// In initUIElements or similar initialization function:
const bedtimeModeToggle = document.getElementById('bedtimeModeToggle');

bedtimeModeToggle.addEventListener('click', () => {
    const isActive = bedtimeModeToggle.getAttribute('aria-pressed') === 'true';
    
    if (!isActive) {
        // Activate Bedtime Mode
        activateBedtimeMode();
        bedtimeModeToggle.setAttribute('aria-pressed', 'true');
        showTemporaryToast('Bedtime Mode activated 🌙 Settings optimized for calm stories.');
    } else {
        // Deactivate Bedtime Mode
        bedtimeModeToggle.setAttribute('aria-pressed', 'false');
        showTemporaryToast('Bedtime Mode deactivated');
    }
});

function activateBedtimeMode() {
    // Apply preset values to UI controls
    const frameworkSelect = document.getElementById('craftingFrameworkSelect');
    const styleSelect = document.getElementById('authorStyleSelect');
    
    // Set framework
    frameworkSelect.value = BEDTIME_MODE_PRESET.framework;
    updateFrameworkSummaryDisplay(); // Refresh summary
    
    // Set author style
    styleSelect.value = BEDTIME_MODE_PRESET.authorStyle;
    updateAuthorStyleSummaryDisplay(); // Refresh summary
    
    // Set adjustments (tone, pacing, humor, emotion)
    // This requires storing current adjustment state and UI
    // Assuming you have adjustment state management:
    appState.adjustmentModules.tone = BEDTIME_MODE_PRESET.adjustments.tone;
    appState.adjustmentModules.pacing = BEDTIME_MODE_PRESET.adjustments.pacing;
    appState.adjustmentModules.humor = BEDTIME_MODE_PRESET.adjustments.humor;
    appState.adjustmentModules.emotion = BEDTIME_MODE_PRESET.adjustments.emotion;
    
    // Set reading age
    const ageSlider = document.getElementById('targetReadingAgeSlider');
    const ageCheckbox = document.getElementById('enableReadingAgeAdjustmentCheckbox');
    ageCheckbox.checked = true;
    ageSlider.value = BEDTIME_MODE_PRESET.readingAge;
    
    // Disable consolidator
    const consolidatorCheckbox = document.getElementById('enableConsolidatorCheckbox');
    consolidatorCheckbox.checked = BEDTIME_MODE_PRESET.consolidator;
    
    // Save to localStorage
    saveAllSettingsToLocalStorage();
}
```

#### Step 2.5: Add Bedtime-Specific Framework Modifications

**File:** `src/prompts/story_crafting_guides.js`

**Action:** Consider adding a "Bedtime Story Circle" variant that explicitly includes cooldown guidance:

```javascript
const BEDTIME_STORY_CIRCLE = `
${STORY_CIRCLE_GUIDE}

### ⭐ BEDTIME ENHANCEMENT

Because this is a bedtime story, additional requirements apply:

**Step 8 (Change) - Extended Closing:**
After showing the character's change, add a dedicated cooldown paragraph (40-60 words):
- The character settles into a safe, comfortable place (bed, nest, cozy spot)
- Use sleepy vocabulary: yawned, drowsy, peaceful, tucked in, closing their eyes
- Include one final comforting image (stars, moonlight, gentle breathing)
- Consider a final line like "And soon, they drifted off to sleep" or "Everything was just right"

This cooldown helps the listener transition toward their own sleep.
`;
```

**Alternative:** Inject this guidance dynamically when both Story Circle + Bedtime Mode are active.

#### Step 2.6: Testing & Refinement

**Testing Checklist:**
- [ ] Activate Bedtime Mode and verify all settings auto-configure
- [ ] Generate 3-5 bedtime stories with different characters
- [ ] Analyze linguistic patterns (soft consonant prevalence)
- [ ] Read stories aloud—do they SOUND calming?
- [ ] Verify endings explicitly invoke sleep/rest/safety
- [ ] Test with actual children (if possible) for effectiveness

**Metrics to Track:**
- Average word count for bedtime stories
- Ratio of soft to hard consonants
- Presence of "sleep" vocabulary in final paragraph
- Parental feedback on story effectiveness

---

## 📋 Feature 3: Narrative Voice Consistency

### Background & Research

"Narrative voice" refers to the persona/style of the narrator telling the story. Inconsistencies break immersion:

**Common Issues:**
- Switching from whimsical to serious mid-story
- Starting conversational, ending formal
- Mixing child-appropriate language with academic vocabulary
- Narrator suddenly becoming preachy or didactic
- Tonal whiplash (silly joke right after emotional moment)

**Goal:** Ensure the narrator's register, vocabulary level, sentence structure, and personality remain stable from beginning to end.

---

### Implementation Steps

#### Step 3.1: Define Voice Consistency Principles

**File:** `src/prompts/story_crafting_guides.js`

**Action:** Add a UNIVERSAL_VOICE_CONSISTENCY section to `UNIVERSAL_CRAFT_STANDARDS`:

```javascript
const UNIVERSAL_CRAFT_STANDARDS = `
## ✨ Universal Craft Standards (apply no matter which framework you choose)

1. **Show, *then* name** every key emotion or object...
2. **Sensory Trios:** When stakes peak...
3. **Limit exclamation marks** to **≤ 8** per story.
4. Avoid generic adjectives...
5. Keep dialogue tags simple...
6. Maximum word count guidance for short stories...

### 🎭 Narrative Voice Consistency (NEW)

Your narrator is a CHARACTER with a consistent personality. Maintain this voice throughout:

**Before you begin writing:**
- Decide: Is your narrator warm and grandfatherly? Playful and silly? Calm and gentle? Epic and grand?
- This decision should align with the chosen authorial style and tone adjustments.

**Throughout the story:**
- **Vocabulary Level:** If you start with simple words, don't suddenly use "precipitous" or "contemplated."
- **Sentence Structure:** If you begin with short, punchy sentences, don't shift to long, flowing paragraphs (unless intentionally pacing down for bedtime).
- **Direct Address:** If you address the reader ("Dear listener..."), continue occasionally; don't drop it entirely.
- **Formality:** Maintain consistent register:
  - Conversational: contractions (it's, they're), casual tone
  - Storybook: more flowing, slightly formal but warm ("And so it was that...")
  - Epic: elevated language, grander vocabulary
- **Humor Consistency:** If you start with jokes and wordplay, don't become suddenly serious without narrative reason (like a character learning a lesson).

**Red Flags to Avoid:**
- ❌ Starting whimsical, ending preachy
- ❌ Mixing slang with archaic language ("totally cool" + "thou shalt")
- ❌ Narrator becoming a moral lecturer in the last paragraph
- ❌ Jokes that clash with emotional beats (silly one-liner during sad moment)

**Self-Check (for AI):**
After drafting, mentally reread:
- Could the same person have narrated every paragraph?
- Does the VOICE feel like one storyteller throughout?
`;
```

#### Step 3.2: Add Voice Consistency to Reviewer Agent

**File:** `src/prompts/agent_prompts.js`

**Action:** Enhance the Agent 3 (Reviewer) prompt to specifically check for voice consistency:

```javascript
// In the section defining reviewerAgentPrompt or similar:

export function getReviewerAgentPrompt(storyDraft, framework, style) {
    return `
You are Agent 3: Story Reviewer. Your job is to review the drafted story and provide specific, actionable feedback.

**Story Draft:**
${storyDraft}

**Review Checklist:**

1. **Narrative Voice Consistency**
   - Read through the story and identify the narrator's voice in the opening paragraph.
   - Check: Does this voice remain consistent in tone, vocabulary level, and personality throughout?
   - Flag any paragraphs where the voice shifts unexpectedly (e.g., from playful to preachy, from casual to formal).
   - Note specific examples of inconsistency.

2. **Structural Adherence**
   - Does the story follow the required framework (${framework})?
   - Are all key beats/steps present?

3. **Authorial Style Match**
   - Does the story embody the chosen style (${style})?
   - Are the specific techniques listed in the style guide applied?

4. **Craft Standards**
   - Sensory details present in key scenes?
   - Exclamation marks ≤ 8?
   - Dialogue tags simple and appropriate?
   - Word count within target range?

5. **Emotional Arc**
   - Does the story have a clear emotional journey?
   - Is the resolution satisfying and age-appropriate?

**Output Format:**
Provide your review as a bulleted list with sections:
- Voice Consistency Issues (if any)
- Structural Issues (if any)
- Style Match Issues (if any)
- Craft Issues (if any)
- Emotional Arc Issues (if any)
- Overall Assessment: [PASS / NEEDS REVISION]

If PASS: The story is ready for polishing.
If NEEDS REVISION: Specify which sections need rework and why.
`;
}
```

#### Step 3.3: Create a Voice Consistency Post-Check

**File:** `src/utils.js` (or new `src/validators.js`)

**Action:** Implement a lightweight heuristic check for obvious voice breaks:

```javascript
/**
 * Analyzes a story for potential narrative voice consistency issues.
 * Returns an array of warnings (empty if no issues detected).
 * 
 * This is a heuristic check, not perfect, but catches obvious problems.
 */
export function checkNarrativeVoiceConsistency(storyText) {
    const warnings = [];
    const paragraphs = storyText.split('\n\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length < 3) {
        return warnings; // Too short to meaningfully check
    }
    
    // Heuristic 1: Check for sudden formality shift
    // Count contractions (informal) vs. full forms
    const firstThirdContractions = countContractions(paragraphs.slice(0, Math.floor(paragraphs.length / 3)).join(' '));
    const lastThirdContractions = countContractions(paragraphs.slice(-Math.floor(paragraphs.length / 3)).join(' '));
    
    if (firstThirdContractions > 3 && lastThirdContractions === 0) {
        warnings.push("Voice may shift from casual to formal. Check narrative consistency.");
    }
    
    // Heuristic 2: Check for sudden vocabulary complexity shift
    const firstThirdAvgWordLength = getAverageWordLength(paragraphs.slice(0, Math.floor(paragraphs.length / 3)).join(' '));
    const lastThirdAvgWordLength = getAverageWordLength(paragraphs.slice(-Math.floor(paragraphs.length / 3)).join(' '));
    
    if (lastThirdAvgWordLength - firstThirdAvgWordLength > 1.5) {
        warnings.push("Vocabulary complexity increases significantly toward the end. Check if narrator voice remains consistent.");
    }
    
    // Heuristic 3: Detect preachy ending (moral keywords in last paragraph)
    const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
    const preachyWords = ['always remember', 'the moral', 'the lesson', 'we should', 'you must', 'never forget'];
    
    if (preachyWords.some(word => lastParagraph.includes(word))) {
        warnings.push("Final paragraph may be overly didactic. Ensure moral emerges naturally.");
    }
    
    return warnings;
}

function countContractions(text) {
    const contractionPatterns = /\b\w+'\w+\b/g;
    const matches = text.match(contractionPatterns);
    return matches ? matches.length : 0;
}

function getAverageWordLength(text) {
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    if (words.length === 0) return 0;
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
}
```

#### Step 3.4: Integrate Voice Check into Story Pipeline

**File:** `src/pipeline.js`

**Action:** After Reviewer agent but before Polisher, run voice consistency check and log results:

```javascript
// In your story generation pipeline, after Agent 3 (Reviewer):

import { checkNarrativeVoiceConsistency } from './utils.js';

// ... inside your pipeline function ...

// After drafting/elaborating stages:
const voiceWarnings = checkNarrativeVoiceConsistency(storyDraft);

if (voiceWarnings.length > 0) {
    console.warn('Narrative Voice Consistency Warnings:', voiceWarnings);
    
    // Optionally: Add to chat log
    if (appState.lastRunChatLog) {
        appState.lastRunChatLog.push({
            agentName: 'Voice Validator',
            type: 'warning',
            content: `Potential voice issues detected:\n${voiceWarnings.join('\n')}`,
            timestamp: new Date().toISOString()
        });
    }
    
    // Optionally: Display to user (non-blocking)
    showTemporaryToast('Voice consistency check complete. See log for details.', 3000);
}
```

#### Step 3.5: User-Facing Voice Consistency Guidance

**File:** `README.md` or in-app help section

**Action:** Add a section explaining narrative voice to users:

```markdown
## 📖 Understanding Narrative Voice

The **narrative voice** is the personality of the storyteller. Think of it as the "who" is telling the story to your child.

**Examples:**
- A warm, grandfatherly voice (like in classic fairy tales)
- A playful, silly voice (like in Roald Dahl stories)
- A calm, gentle voice (perfect for bedtime)
- An epic, grand voice (like in fantasy adventures)

**Why it matters:**
Children notice when the storyteller suddenly sounds different. It can break the magic of the story.

**What the app does:**
- Checks that vocabulary, tone, and style stay consistent
- Ensures the narrator doesn't become preachy at the end
- Balances humor and emotion appropriately

**What you can do:**
- Choose an authorial style that matches your desired voice
- Use tone/emotion adjustments to reinforce consistency
- Review generated stories for natural flow
```

#### Step 3.6: Testing & Validation

**Testing Checklist:**
- [ ] Generate stories with drastically different styles (Dahl vs. Kerr vs. Ghibli)
- [ ] Manually check if voice remains consistent within each
- [ ] Run voice consistency validator on known-good stories (should have 0 warnings)
- [ ] Run voice consistency validator on intentionally broken stories (should flag issues)
- [ ] Verify Reviewer agent's feedback addresses voice when issues exist

**Test Scenarios:**
1. Generate whimsical story, check for inappropriate "the moral is..." ending
2. Generate bedtime story with epic_grand tone (should detect mismatch)
3. Generate fable (should allow didactic ending as it's expected)

---

## 🔗 Implementation Sequence & Dependencies

### Phase 1: Foundation (Week 1)
**Priority: High**
1. Implement Fable Framework (Step 1.1 - 1.3)
2. Define Bedtime Mode Preset (Step 2.1)
3. Add Voice Consistency Standards (Step 3.1)

**Rationale:** These are pure content additions with no complex UI work.

### Phase 2: Bedtime UI & Logic (Week 2)
**Priority: High**
4. Create Bedtime Mode UI Toggle (Step 2.3)
5. Implement Bedtime Mode Logic (Step 2.4)
6. Enhance Bedtime Linguistic Guidance (Step 2.2)

**Rationale:** Bedtime Mode is a high-value user-facing feature.

### Phase 3: Voice Consistency Validation (Week 2-3)
**Priority: Medium**
7. Create Voice Consistency Validator Utility (Step 3.3)
8. Integrate into Pipeline (Step 3.4)
9. Enhance Reviewer Agent (Step 3.2)

**Rationale:** Validation features improve quality but are not blocking for basic functionality.

### Phase 4: Testing & Refinement (Week 3-4)
**Priority: Ongoing**
10. Test all features according to checklists
11. Gather user feedback (if possible)
12. Iterate on prompt wording and heuristics

**Rationale:** Real-world testing reveals edge cases and UX improvements.

### Phase 5: Documentation & Polish (Week 4)
**Priority: Low**
13. Update README with feature descriptions
14. Add in-app help/tooltips for Bedtime Mode
15. Create example stories for each new feature
16. Document voice consistency guidelines (Step 3.5)

---

## 📊 Success Metrics

### Fable Framework
- [ ] Users can select "Fable" from dropdown
- [ ] Generated fables consistently stay under 550 words
- [ ] 90%+ of fables include a clear moral statement
- [ ] Animal characters appropriately anthropomorphized
- [ ] Stories follow 4-part fable structure

### Bedtime Story Mode
- [ ] One-click activation applies all correct settings
- [ ] Generated bedtime stories use predominantly soft consonants
- [ ] 100% of bedtime stories end with explicit sleep/rest/safety imagery
- [ ] User feedback indicates stories are effective for bedtime routine
- [ ] No instances of exciting/scary content in bedtime mode

### Narrative Voice Consistency
- [ ] Reviewer agent flags voice shifts in test stories
- [ ] Voice validator produces <10% false positives
- [ ] <5% of generated stories have obvious voice breaks (manual review)
- [ ] User complaints about "sudden tone changes" decrease

---

## 🛠️ Technical Considerations

### Performance
- Voice consistency heuristics should run in <50ms (client-side check)
- Bedtime Mode toggle should feel instant (synchronous UI update)
- No impact on story generation time (server-side same duration)

### Accessibility
- Bedtime Mode button must have proper ARIA labels
- Voice warnings should appear in accessible format (not just console)
- Consider high-contrast moon icon for bedtime mode

### Mobile Responsiveness
- Bedtime Mode button should remain prominent on small screens
- Consider making it a floating toggle for quick access

### Data Persistence
- Bedtime Mode state should NOT persist across sessions (deliberate choice each time)
- Voice consistency warnings could be saved in chat log (already structured for this)

### API Considerations
- Fable target length (400-500 words) may generate faster → less API cost
- Bedtime enhanced guidance adds ~200 tokens to prompt → minor cost increase
- Voice validator is client-side → no API impact

---

## 🎓 Expert Insights & Best Practices

### On Fables (Storytelling Perspective)
> "A fable's power lies in its brevity and universality. Every element must serve the moral. Any scene, character, or detail that doesn't advance the lesson should be cut ruthlessly."

**Implication:** The AI must be strongly discouraged from elaborating or adding subplots in fable mode. The framework's word count constraint is critical.

### On Bedtime Stories (Child Development Perspective)
> "The transition to sleep is physiological. Bedtime stories should mirror the body's natural wind-down: starting with gentle engagement, gradually reducing stimulation, ending with security and stillness."

**Implication:** Bedtime Mode isn't just about word choice—it's about narrative arc energy. The story structure itself should de-escalate.

**Recommendation:** Consider adding an "Energy Level" visualization in future versions:
```
Story Energy Level:
[■■■□□□□□□□] Start
[■■■■□□□□□□] Middle
[■■□□□□□□□□] End (Bedtime ideal)
```

### On Narrative Voice (Software Architecture Perspective)
> "Voice consistency is a stylistic constraint that should be enforced early (during drafting) rather than fixed late (during polishing). Prevention over correction."

**Implication:** The voice guidance should be prominent in Agent 1 (Crafter) prompt, not just checked by Agent 3 (Reviewer).

**Recommendation:** Add a "Voice Declaration" step where the Crafter explicitly states: "I will narrate this story in a [warm/playful/calm/epic] voice using [simple/flowing/elevated] language."

---

## 📚 References & Further Reading

### Fables
- *Aesop's Fables*, trans. Laura Gibbs (Oxford World's Classics)
- *The Complete Fables* by Jean de La Fontaine
- Perry Index (comprehensive fable catalog)

### Bedtime Stories & Sleep Psychology
- *The Going to Bed Book* by Sandra Boynton (example)
- *Goodnight Moon* by Margaret Wise Brown (classic example)
- Research: "Bedtime Routines and Child Sleep" (Journal of Sleep Research)

### Narrative Voice & Style
- *The Art of Fiction* by John Gardner (Chapter 3: Voice)
- *Writing Picture Books* by Ann Whitford Paul (consistency in short-form)
- *Self-Editing for Fiction Writers* by Browne & King (voice techniques)

### Children's Literature Craft
- *Writing for Young Children* by Claudia Lewis
- *Wild Mind* by Natalie Goldberg (section on maintaining voice)

---

## ✅ Quick Start Checklist

For a developer picking up this TODO for the first time:

1. [x] Read through all three feature background sections
2. [x] Review existing codebase structure (`src/prompts/`, `src/script.js`, `src/pipeline.js`)
3. [x] Start with Phase 1, Step 1.1 (Fable Framework—easiest to implement)
4. [x] Test after each step completion using provided test scenarios
5. [ ] Commit changes incrementally with clear messages
6. [x] Update this TODO by checking off completed items

---

## ✅ Implementation Status (Updated February 16, 2026)

### Phase 1: Foundation ✅ COMPLETE
- [x] Fable Framework added to `story_crafting_guides.js`
- [x] Voice Consistency standards added to Universal Craft Standards
- [x] Bedtime Mode Preset defined in `appState.js`

### Phase 2: Bedtime UI & Logic ✅ COMPLETE
- [x] Bedtime Mode UI toggle added to `index.html`
- [x] Bedtime Mode button styling added to `style.css`
- [x] Bedtime Mode logic implemented in `script.js`
- [x] Enhanced `calm_bedtime` tone module with full linguistic guidance

### Phase 3: Voice Consistency Validation ✅ COMPLETE
- [x] Voice Consistency validator added to `utils.js`
- [x] Integrated into pipeline (logs warnings after story generation)
- [x] Reviewer agent enhanced with voice consistency checklist

---

## 🎯 Vision & Long-Term Goals

These three features represent a strategic enhancement toward making StoryGen the definitive AI storytelling tool for families:

1. **Fable Framework** → Expands genre coverage, appeals to educators
2. **Bedtime Story Mode** → Solves a specific, high-value use case (parents' nightly routine)
3. **Narrative Voice Consistency** → Raises overall quality, differentiates from generic AI story tools

**Future Expansions (Now Scheduled for Implementation):**
- "Morning Energizer" mode (opposite of bedtime—exciting wakeup stories) → **Phase 6**
- "Learning Fable" sub-mode (STEM concepts taught via fable structure) → **Phase 7**
- Voice consistency "personality presets" (choose from 5 narrator personas) → **Phase 8**
- Parental controls for content sensitivity → **Phase 9**
- Multi-part story campaigns (serialized bedtime tales) → **Phase 10**

---

## 📋 Feature 4: Morning Energizer Mode

### Background & Research

Morning routines are as important as bedtime routines for children. The "Morning Energizer" mode is the energetic counterpart to Bedtime Mode—designed to help children wake up with enthusiasm, creativity, and positive energy.

**Psychological Goals:**
- Transition from sleepy/groggy to alert/engaged
- Create excitement for the day ahead
- Build positive associations with morning routines
- Encourage imagination and active thinking

**Linguistic Features (Opposite of Bedtime):**
- **Dynamic Consonants:** Emphasize hard, energetic sounds: K, T, P, D, G, B
- **Short, Punchy Sentences:** Quick rhythm that builds momentum
- **Active Verbs:** Jump, dash, zoom, burst, spring, bounce, race
- **Exciting Vocabulary:** Adventure, discover, explore, surprise, magic, amazing
- **Exclamation Points:** Permitted liberally (up to 15 per story)

**Structural Features:**
- **Rising Energy Arc:** Story starts calm, builds to exciting climax
- **Call-to-Action Endings:** Story ends with character setting off on adventure or beginning their day with purpose
- **Sensory Wake-Up:** Bright colors, morning sounds (birds, sunshine), energizing smells (breakfast, flowers)
- **High Stakes (Age-Appropriate):** Small adventures, discoveries, challenges to overcome

**Target Scenarios:**
- Weekend morning adventures
- School-day motivation
- "Let's go!" energy boost
- Rainy day imagination spark

**Sources:** Research on morning circadian rhythms, Mo Willems' energy, Dr. Seuss pacing

---

### Implementation Steps

#### Step 4.1: Define Morning Energizer Mode Configuration Preset

**File:** `src/appState.js`

**Action:** Add a `MORNING_ENERGIZER_PRESET` object:

```javascript
export const MORNING_ENERGIZER_PRESET = {
    framework: "Three-Act Adventure", // Action-oriented structure
    authorStyle: "Playful & Energetic (Willems/Seuss)",
    adjustments: {
        tone: "energetic_morning",
        pacing: "fast_dynamic",
        humor: "witty_playful",
        emotion: "joyful_exciting"
    },
    consolidator: false, // Preserve natural energy
    readingAge: 6, // Slightly higher for comprehension
    energyLevel: "high", // New metadata
};
```

#### Step 4.2: Add Energetic Morning Linguistic Guidance

**File:** `src/prompts/adjustment_modules.js`

**Action:** Add `energetic_morning` tone module:

```javascript
'energetic_morning': `**Tone: Energetic Morning Mode**

Create stories that WAKE UP the listener with excitement, wonder, and momentum!

**Linguistic Guidance:**
- **Dynamic Consonants:** Favor words with K, T, P, D, G, B sounds. These create energy!
  - GOOD: "The rabbit bounded through the gate and BURST into the garden!"
  - AVOID: "The bunny slowly moved through the meadow..."
  
- **Sentence Rhythm:** Short, punchy sentences that build momentum. Use fragments for emphasis.
  - "Dawn broke. Colors exploded. Today was THE day."
  
- **Energizing Vocabulary:** 
  - Actions: jump, dash, zoom, burst, spring, bounce, race, leap, spin, twirl
  - Descriptions: brilliant, amazing, spectacular, incredible, fantastic, mighty
  - Emotions: excited, thrilled, eager, curious, determined, brave
  
- **Sensory Morning Imagery:**
  - Bright sunshine streaming through windows
  - Birdsong and morning sounds
  - Smell of breakfast cooking
  - Cool morning air
  - Dewdrops sparkling like diamonds
  - Colors appearing as sun rises
  
**Story Arc:**
- **Opening (Low Energy → Building):** Character wakes up, senses day is special
- **Rising Action (Medium → High):** Discovery, challenge, or adventure begins
- **Climax (Peak Energy):** Exciting moment, triumph, or revelation
- **Resolution (High Energy → Sustained):** Character sets off for the day, full of purpose

DO NOT wind down at the end. Leave the listener energized and ready to start THEIR day!

**Ending Patterns:**
- "And with a grin, [Character] raced out the door, ready for whatever came next!"
- "Today," [Character] declared, "is going to be AMAZING!"
- "The adventure was just beginning..."

**Narrative Voice:**
- Enthusiastic, like an excited friend sharing news
- Use exclamations naturally (up to 15 permitted)
- Fast-paced but clear
- Occasional direct address: "Can you imagine?" "What do YOU think happened?"

**Dialogue:** Quick, snappy exchanges. Characters interrupt each other with excitement.`,
```

#### Step 4.3: Add Fast/Dynamic Pacing Module

**File:** `src/prompts/adjustment_modules.js`

**Action:** Add or enhance `fast_dynamic` pacing:

```javascript
pacing: {
    // ... existing options
    'fast_dynamic': `**Pacing: Fast & Dynamic**
    
Keep the story moving at HIGH SPEED:
- Scene transitions are quick: "Meanwhile..." "Suddenly..." "In a flash..."
- No lingering descriptions—establish setting in ONE sentence, then ACTION
- Dialogue moves plot forward—no small talk
- Each paragraph introduces new development or raises stakes
- Think "movie trailer" energy—every moment matters
- Use white space between paragraphs to create visual speed
- Sentence lengths vary: long-short-short-PUNCH creates rhythm

**Word Economy:** If a scene can be told in 50 words, don't use 100.`,
},
```

#### Step 4.4: Create UI Toggle for Morning Energizer Mode

**File:** `index.html`

**Action:** Add button alongside Bedtime Mode:

```html
<div class="story-mode-container">
    <button id="bedtimeModeToggle" class="button-story-mode button-bedtime-mode" aria-pressed="false">
        <svg><!-- moon icon --></svg>
        <span>Bedtime Mode</span>
    </button>
    <button id="morningModeToggle" class="button-story-mode button-morning-mode" aria-pressed="false">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <span>Morning Mode</span>
    </button>
</div>
```

**File:** `src/style.css`

**Action:** Add morning mode styling:

```css
.story-mode-container {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
    padding: 0.75rem;
    background: var(--panel-bg);
    border-radius: 8px;
}

.button-morning-mode {
    /* Base styling shared with bedtime */
    flex: 1;
    padding: 0.75rem;
    border-radius: 6px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    
    /* Morning-specific colors */
    background: rgba(255, 183, 77, 0.15);
    border: 1px solid rgba(255, 183, 77, 0.3);
    color: #ffe4b5;
}

.button-morning-mode:hover {
    background: rgba(255, 183, 77, 0.25);
    border-color: rgba(255, 183, 77, 0.5);
}

.button-morning-mode[aria-pressed="true"] {
    background: linear-gradient(135deg, #ffb74d 0%, #ff9800 100%);
    border-color: #ffc107;
    color: #1a1a2e;
    box-shadow: 0 0 15px rgba(255, 183, 77, 0.5);
}
```

#### Step 4.5: Implement Morning Mode Logic

**File:** `src/script.js`

**Action:** Add event listener and activation function:

```javascript
import { MORNING_ENERGIZER_PRESET } from './appState.js';

const morningModeToggle = document.getElementById('morningModeToggle');

morningModeToggle.addEventListener('click', () => {
    const isActive = morningModeToggle.getAttribute('aria-pressed') === 'true';
    
    if (!isActive) {
        // Deactivate bedtime mode if active
        bedtimeModeToggle.setAttribute('aria-pressed', 'false');
        
        activateMorningMode();
        morningModeToggle.setAttribute('aria-pressed', 'true');
        showTemporaryToast('Morning Energizer activated ☀️ Settings optimized for exciting stories!');
    } else {
        morningModeToggle.setAttribute('aria-pressed', 'false');
        showTemporaryToast('Morning Mode deactivated');
    }
});

function activateMorningMode() {
    const frameworkSelect = document.getElementById('craftingFrameworkSelect');
    const styleSelect = document.getElementById('authorStyleSelect');
    
    frameworkSelect.value = MORNING_ENERGIZER_PRESET.framework;
    updateFrameworkSummaryDisplay();
    
    styleSelect.value = MORNING_ENERGIZER_PRESET.authorStyle;
    updateAuthorStyleSummaryDisplay();
    
    appState.adjustmentModules.tone = MORNING_ENERGIZER_PRESET.adjustments.tone;
    appState.adjustmentModules.pacing = MORNING_ENERGIZER_PRESET.adjustments.pacing;
    appState.adjustmentModules.humor = MORNING_ENERGIZER_PRESET.adjustments.humor;
    appState.adjustmentModules.emotion = MORNING_ENERGIZER_PRESET.adjustments.emotion;
    
    const ageSlider = document.getElementById('targetReadingAgeSlider');
    const ageCheckbox = document.getElementById('enableReadingAgeAdjustmentCheckbox');
    ageCheckbox.checked = true;
    ageSlider.value = MORNING_ENERGIZER_PRESET.readingAge;
    
    saveAllSettingsToLocalStorage();
}
```

#### Step 4.6: Mutual Exclusivity Logic

**Action:** Ensure only one mode (Bedtime OR Morning) can be active at a time. Modify both toggle handlers to deactivate the other.

---

### Testing Checklist

- [ ] Morning Mode toggle appears alongside Bedtime Mode
- [ ] Activating Morning Mode deactivates Bedtime Mode (and vice versa)
- [ ] Generated stories have high-energy vocabulary
- [ ] Stories end with call-to-action, not wind-down
- [ ] Read stories aloud—do they create excitement?
- [ ] Hard consonant sounds are prevalent
- [ ] Test 5 different morning story scenarios

---

## 📋 Feature 5: Learning Fable Sub-Mode

### Background & Research

"Learning Fables" combine the moral structure of classical fables with STEM education concepts. Instead of purely behavioral lessons (honesty, humility), these fables teach scientific principles, mathematical concepts, or engineering thinking through animal characters.

**Educational Goals:**
- Introduce STEM concepts in age-appropriate, memorable ways
- Use narrative to make abstract concepts concrete
- Leverage animal characteristics to demonstrate scientific principles
- Create "aha moments" where the moral IS the learning

**Example Concepts by Category:**

**Physics/Science:**
- "The Tortoise and the Ball" → Momentum and mass
- "The Ant and the Lever" → Simple machines
- "The Bird and the Wind" → Aerodynamics basics
- "The Fish and the Pressure" → Water pressure concepts

**Mathematics:**
- "The Squirrel's Acorns" → Counting and division
- "The Spider's Web" → Patterns and geometry
- "The Bees and the Hexagon" → Why hexagons are efficient
- "The Rabbit's Multiplication" → Exponential growth

**Engineering/Logic:**
- "The Beaver's Dam" → Problem-solving iteration
- "The Three Little Pigs: Engineering Edition" → Material science
- "The Crow and the Pitcher" → Displacement and problem-solving

**Nature/Biology:**
- "The Caterpillar's Change" → Metamorphosis
- "The Salmon's Journey" → Life cycles
- "The Tree and the Seasons" → Cyclical patterns

---

### Implementation Steps

#### Step 5.1: Define Learning Fable Structure

**File:** `src/prompts/story_crafting_guides.js`

**Action:** Add `LEARNING_FABLE_GUIDE`:

```javascript
const LEARNING_FABLE_GUIDE = `
**Instructions for Story Creation using the Learning Fable Framework:**

This is a HYBRID framework combining classical fable structure with STEM education. The "moral" is a learning principle.

## STRUCTURE

1. **The Setup (Introduce the "Problem"):** (80-120 words)
   - Introduce 1-2 animal characters facing a practical challenge
   - The challenge MUST be solvable using a specific STEM concept
   - Show initial failed attempts that don't use the concept
   - Make the stakes clear: food, shelter, safety, helping a friend

2. **The Discovery (Introduce the Concept):** (100-150 words)
   - Character observes something in nature or tries a new approach
   - The STEM concept is DEMONSTRATED through action, not explained
   - Use sensory, concrete details: "The water ROSE as each pebble dropped"
   - Character notices the pattern or principle

3. **The Application (Using the Knowledge):** (100-150 words)
   - Character applies the discovered principle to solve the original problem
   - Show cause-and-effect clearly
   - Celebrate the success with appropriate excitement
   - Other characters may react with wonder: "How did you do that?"

4. **The Lesson (Naming the Principle):** (50-80 words)
   - Character (or wise elder) names the principle in simple terms
   - Connect it to the broader world: "This is why [real-world example]..."
   - End with curiosity invitation: "I wonder what else works this way?"

## CRAFT GUIDE

1. **Target Length:** 400-550 words (slightly longer than pure fable for explanation)

2. **STEM Accuracy:** The science/math MUST be correct. Simplify, but don't falsify.

3. **Concept Introduction:**
   - SHOW before you TELL
   - Use animal's natural abilities to demonstrate (crow's beak, ant's strength, spider's web)
   - Avoid textbook language; use action and observation

4. **Age-Appropriate Vocabulary:**
   - Ages 4-6: Use analogies and comparisons ("as heavy as...")
   - Ages 7-9: Introduce simple technical terms with immediate context
   - Ages 10+: Can use more precise terminology

5. **The "Aha" Moment:**
   - There MUST be a clear moment where character (and listener) "gets it"
   - Use language like: "Suddenly, [Character] understood!" or "That's when it clicked."

6. **Avoid:**
   - Lecture-style explanations
   - Characters who already know the answer
   - Concepts that require prior knowledge
   - Incorrect or misleading science

7. **Ending:** Unlike behavioral fables, Learning Fables end with CURIOSITY, not conclusion.
   - "And [Character] couldn't wait to discover what else the world could teach."
   - "What other secrets were hiding in plain sight?"

## STEM CONCEPT CATEGORIES

When prompted with a concept, match to appropriate animal:

| Concept | Best Animal Match | Why |
|---------|------------------|-----|
| Leverage/Levers | Ant, Monkey | Lifting, swinging |
| Displacement | Crow, Beaver | Water interaction |
| Aerodynamics | Bird, Bat, Flying Squirrel | Flight |
| Geometry | Spider, Bee | Web patterns, hive structure |
| Counting/Math | Squirrel, Ant | Storing, organizing |
| Camouflage | Chameleon, Octopus, Moth | Adaptation |
| Buoyancy | Duck, Otter | Floating |
| Magnetism | Migratory Bird | Navigation |
| Sound Waves | Bat, Dolphin | Echolocation |
| Friction | Snake, Snail | Movement |

## EXAMPLE OPENING

"Crow was thirsty. So, so thirsty. She found a tall pitcher with water at the bottom, but her beak couldn't reach. She tried tipping it—too heavy. She tried breaking it—too hard. Then she noticed the pebbles by the road..."

This sets up the problem (thirst), shows failed attempts, and hints at the solution (displacement).
`;

// Add to exports
export const STORY_CRAFTING_GUIDES = {
    // ... existing
    "Learning Fable (STEM)": LEARNING_FABLE_GUIDE,
};

export const STORY_FRAMEWORK_SUMMARIES = {
    // ... existing
    "Learning Fable (STEM)": "A fable where the moral is a science/math concept. Animal characters discover and apply STEM principles. (~400-550 words)",
};
```

#### Step 5.2: Create STEM Concept Selector UI

**File:** `index.html`

**Action:** Add conditional STEM concept selector that appears when Learning Fable is chosen:

```html
<div id="stemConceptSection" class="form-section" style="display: none;">
    <label for="stemConceptSelect">STEM Concept:</label>
    <select id="stemConceptSelect">
        <option value="">-- Select a concept to teach --</option>
        <optgroup label="Physics">
            <option value="displacement">Displacement (Crow & Pitcher)</option>
            <option value="leverage">Leverage & Simple Machines</option>
            <option value="momentum">Momentum & Mass</option>
            <option value="buoyancy">Buoyancy & Floating</option>
            <option value="friction">Friction & Movement</option>
        </optgroup>
        <optgroup label="Mathematics">
            <option value="counting">Counting & Division</option>
            <option value="patterns">Patterns & Sequences</option>
            <option value="geometry">Shapes & Geometry</option>
            <option value="estimation">Estimation & Measurement</option>
        </optgroup>
        <optgroup label="Biology/Nature">
            <option value="metamorphosis">Metamorphosis & Change</option>
            <option value="camouflage">Camouflage & Adaptation</option>
            <option value="ecosystems">Ecosystems & Interdependence</option>
            <option value="lifecycles">Life Cycles</option>
        </optgroup>
        <optgroup label="Engineering">
            <option value="problem_solving">Iterative Problem Solving</option>
            <option value="materials">Material Properties</option>
            <option value="structures">Strong Structures</option>
        </optgroup>
    </select>
    <p class="concept-hint" id="stemConceptHint"></p>
</div>
```

#### Step 5.3: Wire STEM Concept to Prompt

**File:** `src/script.js`

**Action:** Show/hide STEM section based on framework selection, and include concept in character/setting prompt:

```javascript
const frameworkSelect = document.getElementById('craftingFrameworkSelect');
const stemSection = document.getElementById('stemConceptSection');
const stemSelect = document.getElementById('stemConceptSelect');

frameworkSelect.addEventListener('change', () => {
    if (frameworkSelect.value === 'Learning Fable (STEM)') {
        stemSection.style.display = 'block';
    } else {
        stemSection.style.display = 'none';
    }
});

// When generating story, include STEM concept:
function getSTEMConceptGuidance() {
    const concept = stemSelect.value;
    const conceptData = {
        displacement: {
            hint: "Water rises when objects are added",
            example: "Crow drops pebbles into pitcher",
            principle: "When you put something in water, the water moves out of the way"
        },
        leverage: {
            hint: "Small force + long lever = big lift",
            example: "Ant uses a stick to move a rock",
            principle: "A lever helps you lift heavy things with less effort"
        },
        // ... other concepts with age-appropriate explanations
    };
    
    if (conceptData[concept]) {
        return `
**STEM Concept to Teach:** ${concept}
**Core Principle:** ${conceptData[concept].principle}
**Example Scenario:** ${conceptData[concept].example}

The story MUST demonstrate this concept through character action.`;
    }
    return '';
}
```

#### Step 5.4: Age-Adaptive STEM Language

**File:** `src/prompts/agent_prompts.js`

**Action:** Modify prompts to adjust STEM vocabulary based on reading age:

```javascript
function getSTEMVocabularyGuidance(readingAge, concept) {
    if (readingAge <= 5) {
        return `Use only simple words. No technical terms. Use "pushes the water up" not "displacement."`;
    } else if (readingAge <= 8) {
        return `Introduce one technical term with immediate explanation: "This is called displacement—it means the water has to make room."`;
    } else {
        return `Use proper terminology naturally: "The pebbles displaced the water, raising its level."`;
    }
}
```

---

### Testing Checklist

- [ ] STEM concept selector appears when "Learning Fable" framework chosen
- [ ] Selector hidden for other frameworks
- [ ] Generated stories accurately demonstrate chosen concept
- [ ] Science is correct (verify with reference)
- [ ] Stories end with curiosity, not lecture
- [ ] Age-appropriate vocabulary is used
- [ ] Test at least 2 concepts from each category

---

## 📋 Feature 6: Voice Consistency Personality Presets

### Background & Research

Building on the Narrative Voice Consistency feature, this enhancement provides users with **pre-defined narrator personalities** they can select. Instead of relying only on authorial styles, users can choose a specific "narrator persona" that the AI will maintain throughout.

**Why Personality Presets?**
- Makes voice consistency tangible and selectable
- Appeals to repeat users who find a favorite narrator
- Creates differentiation ("Only StoryGen has The Grandfather narrator!")
- Simplifies complex style decisions into intuitive choices

**Proposed Narrator Personas:**

1. **The Grandfather** — Warm, wise, reassuring. Perfect for bedtime. Uses "my dear" and gentle asides.
2. **The Adventurer** — Excited, discovery-focused; perfect for Morning Mode. Uses "Imagine this!" and dramatic pauses.
3. **The Silly Friend** — Playful, pun-loving, breaks fourth wall. Uses "Wait, that's not right..." and goofy asides.
4. **The Wise Owl** — Calm, educational, gentle curiosity. Perfect for Learning Fables. Uses "Did you know..." and wonder.
5. **The Epic Bard** — Grand, formal, mythic. Perfect for adventures. Uses "Long ago..." and dramatic foreshadowing.

---

### Implementation Steps

#### Step 6.1: Define Narrator Persona Constants

**File:** `src/prompts/narrator_personas.js` (new file)

**Action:** Create detailed persona definitions:

```javascript
export const NARRATOR_PERSONAS = {
    "The Grandfather": {
        id: "grandfather",
        icon: "👴",
        description: "Warm, wise, and reassuring. Like a beloved grandparent telling stories by the fire.",
        bestFor: ["Bedtime Mode", "Fables", "Heartwarming stories"],
        voiceGuide: `
**Narrator Persona: The Grandfather**

You are a warm, wise grandparent sharing a beloved story with a child.

**Speech Patterns:**
- Use gentle endearments: "my dear," "little one," "now then..."
- Occasional asides to the listener: "And do you know what happened next?"
- Reassuring phrases: "Don't worry," "All will be well," "As it should be"
- Pacing: Unhurried, with natural pauses for effect

**Vocabulary:**
- Warm, comforting words: cozy, snug, safe, gentle, kind
- Old-fashioned touches: "once upon a time," "in those days," "as the old tales say"
- Simple but evocative language

**Tone:**
- Never alarming or frightening
- Gentle humor, never sarcastic
- Endings that provide closure and comfort
- Implicit message: "The world is good, and you are safe"

**Signature Phrases:**
- "Now, settle in, and I'll tell you a story..."
- "And so, my dear, you see..."
- "Sleep well, little one, for tomorrow brings new adventures."
`,
    },
    
    "The Adventurer": {
        id: "adventurer",
        icon: "🧭",
        description: "Excited, discovery-focused, like an explorer sharing tales from faraway lands.",
        bestFor: ["Morning Mode", "Action stories", "Discovery narratives"],
        voiceGuide: `
**Narrator Persona: The Adventurer**

You are an enthusiastic explorer bursting with stories to tell!

**Speech Patterns:**
- Excited exclamations: "Can you believe it?!" "And THEN—!"
- Direct engagement: "Picture this!" "Imagine you were there!"
- Dramatic pauses: "And what they found was... incredible."
- Building anticipation: "But wait, it gets better!"

**Vocabulary:**
- Action words: discovered, explored, raced, leaped, soared
- Wonder words: amazing, incredible, spectacular, breathtaking
- Discovery language: "suddenly," "at last," "finally"

**Tone:**
- Contagious excitement
- Sensory-rich descriptions of places and experiences
- Stakes feel real but never truly scary
- Endings that leave doors open for more adventure

**Signature Phrases:**
- "Let me tell you about the time..."
- "You won't BELIEVE what happened next!"
- "And that, my friend, was only the beginning."
`,
    },
    
    "The Silly Friend": {
        id: "silly_friend",
        icon: "🤪",
        description: "Playful, pun-loving, occasionally breaks the fourth wall. Pure fun.",
        bestFor: ["Humor-focused stories", "Younger children", "Energy boost"],
        voiceGuide: `
**Narrator Persona: The Silly Friend**

You're the fun friend who makes EVERYTHING an adventure (and a joke).

**Speech Patterns:**
- Self-interruptions: "And then—wait, no, that's not right. Let me try again."
- Fourth-wall breaks: "Are you still listening? Good, because this part is BANANAS."
- Exaggerated reactions: "THE BIGGEST SANDWICH IN THE HISTORY OF SANDWICHES!"
- Purposeful mistakes (then corrections): "The elephant—I mean, the MOUSE—"

**Vocabulary:**
- Silly words: bonkers, kerfuffle, discombobulated, whatnot
- Sound effects: WHOOSH, SPLAT, BOING, KABOOM
- Made-up words are encouraged
- Playful exaggeration: "a million gazillion"

**Tone:**
- Never mean-spirited; silliness is warm
- Laughing WITH, never AT characters
- Chaos that always resolves happily
- Joy and absurdity over logic

**Signature Phrases:**
- "Okay okay okay, so HERE'S the deal..."
- "And THAT'S when things got weird."
- "The end! ...Or IS it? (It is. That's the end.)"
`,
    },
    
    "The Wise Owl": {
        id: "wise_owl",
        icon: "🦉",
        description: "Calm, educational, gentle curiosity. Perfect for Learning Fables.",
        bestFor: ["Learning Fables", "Nature stories", "Curious children"],
        voiceGuide: `
**Narrator Persona: The Wise Owl**

You are a patient, curious teacher who finds wonder in understanding.

**Speech Patterns:**
- Questions that invite thinking: "Have you ever wondered why...?"
- Gentle explanations: "You see, what happened was..."
- Encouraging discovery: "And do you know what they learned?"
- Patient pacing: Never rushing through explanations

**Vocabulary:**
- Wonder words: fascinating, curious, remarkable, observe
- Gentle guidance: "Let's see," "Consider this," "Notice how"
- Age-appropriate science terms (with context)
- Nature vocabulary: seasons, creatures, patterns

**Tone:**
- Intellectual curiosity without being dry
- Gentle delight in "aha" moments
- Patient with complexity
- Endings that open doors to more learning

**Signature Phrases:**
- "Now, isn't that interesting?"
- "And that's how [concept] works in our world."
- "What other wonders might we discover?"
`,
    },
    
    "The Epic Bard": {
        id: "epic_bard",
        icon: "📜",
        description: "Grand, formal, mythic. For sweeping adventures and timeless tales.",
        bestFor: ["Hero's Journey", "Fantasy", "Older children"],
        voiceGuide: `
**Narrator Persona: The Epic Bard**

You speak as the ancient storytellers did—with gravity, beauty, and drama.

**Speech Patterns:**
- Formal openings: "In an age before ages," "When the world was young"
- Dramatic foreshadowing: "Little did they know..."
- Repetition for emphasis: "Three days they walked. Three nights they rested."
- Grand declarations: "And so it was that [Character] became legend."

**Vocabulary:**
- Elevated language: brave, noble, perilous, triumphant
- Mythic terms: quest, destiny, prophecy, ancient
- Poetic structures: alliteration, rhythm, cadence
- Nature as metaphor: storms = conflict, dawn = hope

**Tone:**
- Serious but not grim
- Stakes feel significant
- Heroes earn their victories
- Endings feel conclusive and resonant

**Signature Phrases:**
- "And so our tale begins..."
- "But darkness, as it always does, crept in..."
- "And their names were remembered forevermore."
`,
    },
};
```

#### Step 6.2: Create UI for Persona Selection

**File:** `index.html`

**Action:** Add narrator persona selector in controls panel:

```html
<div class="form-section">
    <label for="narratorPersonaSelect">Narrator Persona:</label>
    <div class="persona-selector">
        <select id="narratorPersonaSelect">
            <option value="">-- Auto (based on style) --</option>
            <option value="grandfather">👴 The Grandfather</option>
            <option value="adventurer">🧭 The Adventurer</option>
            <option value="silly_friend">🤪 The Silly Friend</option>
            <option value="wise_owl">🦉 The Wise Owl</option>
            <option value="epic_bard">📜 The Epic Bard</option>
        </select>
    </div>
    <p id="personaSummary" class="style-summary"></p>
</div>
```

**File:** `src/style.css`

**Action:** Style the persona selector with visual distinction:

```css
.persona-selector select {
    background: var(--input-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 1rem;
    width: 100%;
}

.persona-selector select option {
    padding: 0.5rem;
}
```

#### Step 6.3: Integrate Persona into Prompt Assembly

**File:** `src/prompts/agent_prompts.js`

**Action:** Inject persona voice guide into agent prompts:

```javascript
import { NARRATOR_PERSONAS } from './narrator_personas.js';

export function assembleStoryPrompt(settings) {
    let personaGuidance = '';
    
    if (settings.narratorPersona && NARRATOR_PERSONAS[settings.narratorPersona]) {
        personaGuidance = NARRATOR_PERSONAS[settings.narratorPersona].voiceGuide;
    }
    
    return `
${frameworkGuidance}
${styleGuidance}
${personaGuidance}  // <-- Narrator persona injected here
${adjustmentGuidance}
${characterPrompt}
`;
}
```

#### Step 6.4: Persona + Mode Auto-Suggestion

**Action:** When Bedtime Mode activates, suggest "The Grandfather." When Morning Mode activates, suggest "The Adventurer."

```javascript
function activateBedtimeMode() {
    // ... existing code
    
    // Suggest appropriate persona
    const personaSelect = document.getElementById('narratorPersonaSelect');
    personaSelect.value = 'grandfather';
    updatePersonaSummary();
    showTemporaryToast('Bedtime Mode activated 🌙 Narrator set to The Grandfather.');
}

function activateMorningMode() {
    // ... existing code
    
    const personaSelect = document.getElementById('narratorPersonaSelect');
    personaSelect.value = 'adventurer';
    updatePersonaSummary();
    showTemporaryToast('Morning Mode activated ☀️ Narrator set to The Adventurer.');
}
```

---

### Testing Checklist

- [ ] All 5 personas appear in dropdown
- [ ] Selecting persona shows appropriate summary
- [ ] Generated stories reflect chosen persona's voice
- [ ] Personas maintain consistency throughout story
- [ ] Mode presets auto-select appropriate persona
- [ ] Test each persona with different story types

---

## 📋 Feature 7: Parental Controls for Content Sensitivity

### Background & Research

Parents need confidence that generated stories are appropriate for their children. This feature provides granular control over content elements that might be concerning:

**Content Sensitivity Categories:**

1. **Conflict/Violence:** 
   - Level 0: No conflict at all (very young, sensitive)
   - Level 1: Mild verbal disagreements, resolved quickly
   - Level 2: Physical challenges (chasing, escaping) with no harm
   - Level 3: Standard adventure conflict (age 7+)

2. **Scary Elements:**
   - Level 0: Nothing scary whatsoever
   - Level 1: Mild suspense, always resolved quickly
   - Level 2: Spooky atmosphere (haunted house) but benign outcomes
   - Level 3: Real (mild) stakes, appropriate fears

3. **Loss/Sadness:**
   - Level 0: Only positive emotions
   - Level 1: Temporary sadness, quickly comforted
   - Level 2: Meaningful emotional beats, always resolved
   - Level 3: Deeper themes (appropriate for older children)

4. **Complexity:**
   - Level 0: Very simple, linear
   - Level 1: Simple with one twist
   - Level 2: Standard narrative complexity
   - Level 3: More sophisticated plots

---

### Implementation Steps

#### Step 7.1: Define Sensitivity Presets

**File:** `src/appState.js`

**Action:** Add sensitivity configuration:

```javascript
export const SENSITIVITY_LEVELS = {
    'extra_gentle': {
        label: 'Extra Gentle (Ages 2-4)',
        conflict: 0,
        scary: 0,
        sadness: 0,
        complexity: 0,
        description: 'No conflict, no scary elements, only positive emotions. Perfect for toddlers.'
    },
    'gentle': {
        label: 'Gentle (Ages 4-6)',
        conflict: 1,
        scary: 0,
        sadness: 1,
        complexity: 1,
        description: 'Mild, quickly-resolved challenges. Brief moments of worry always comforted.'
    },
    'standard': {
        label: 'Standard (Ages 6-9)',
        conflict: 2,
        scary: 1,
        sadness: 2,
        complexity: 2,
        description: 'Age-appropriate adventure with real but manageable stakes.'
    },
    'adventurous': {
        label: 'Adventurous (Ages 9+)',
        conflict: 3,
        scary: 2,
        sadness: 2,
        complexity: 3,
        description: 'More sophisticated stories with deeper themes and more excitement.'
    },
    'custom': {
        label: 'Custom Settings',
        description: 'Configure each category individually.'
    }
};
```

#### Step 7.2: Create Parental Controls UI

**File:** `index.html`

**Action:** Add expandable parental controls section:

```html
<details class="parental-controls-section">
    <summary>
        <span class="section-icon">🛡️</span>
        <span>Parental Controls</span>
        <span class="current-level" id="currentSensitivityLabel">Standard</span>
    </summary>
    
    <div class="controls-content">
        <div class="preset-selector">
            <label for="sensitivityPreset">Content Level:</label>
            <select id="sensitivityPreset">
                <option value="extra_gentle">Extra Gentle (Ages 2-4)</option>
                <option value="gentle">Gentle (Ages 4-6)</option>
                <option value="standard" selected>Standard (Ages 6-9)</option>
                <option value="adventurous">Adventurous (Ages 9+)</option>
                <option value="custom">Custom...</option>
            </select>
        </div>
        
        <div id="customSensitivityControls" style="display: none;">
            <div class="sensitivity-slider">
                <label>Conflict Level:</label>
                <input type="range" id="conflictLevel" min="0" max="3" value="2">
                <span class="level-label" id="conflictLevelLabel">Standard</span>
            </div>
            <div class="sensitivity-slider">
                <label>Scary Elements:</label>
                <input type="range" id="scaryLevel" min="0" max="3" value="1">
                <span class="level-label" id="scaryLevelLabel">Mild</span>
            </div>
            <div class="sensitivity-slider">
                <label>Emotional Depth:</label>
                <input type="range" id="sadnessLevel" min="0" max="3" value="2">
                <span class="level-label" id="sadnessLevelLabel">Meaningful</span>
            </div>
            <div class="sensitivity-slider">
                <label>Story Complexity:</label>
                <input type="range" id="complexityLevel" min="0" max="3" value="2">
                <span class="level-label" id="complexityLevelLabel">Standard</span>
            </div>
        </div>
        
        <p class="preset-description" id="sensitivityDescription"></p>
    </div>
</details>
```

#### Step 7.3: Generate Sensitivity Guidance for Prompts

**File:** `src/prompts/adjustment_modules.js`

**Action:** Add function to generate sensitivity instructions:

```javascript
export function getSensitivityGuidance(settings) {
    const levels = ['None', 'Minimal', 'Moderate', 'Standard'];
    
    return `
## 🛡️ CONTENT SENSITIVITY REQUIREMENTS (MUST FOLLOW)

**Conflict Level: ${levels[settings.conflict]}**
${settings.conflict === 0 ? '- NO conflict whatsoever. Characters cooperate, help each other, face no opposition.' : ''}
${settings.conflict === 1 ? '- Only mild verbal disagreements. Resolve within 2-3 sentences. No physical confrontation.' : ''}
${settings.conflict === 2 ? '- Challenges involve chasing, escaping, competing. No physical harm depicted.' : ''}
${settings.conflict === 3 ? '- Standard adventure conflict appropriate for ages 9+.' : ''}

**Scary Elements: ${levels[settings.scary]}**
${settings.scary === 0 ? '- NOTHING scary. No dark places, no surprises from shadows, no tension.' : ''}
${settings.scary === 1 ? '- Mild suspense only (will they be on time?). Resolve quickly. No scary creatures.' : ''}
${settings.scary === 2 ? '- Spooky atmosphere permitted (haunted house) but outcomes always benign and friendly.' : ''}
${settings.scary === 3 ? '- Real but mild stakes. Fears appropriate for ages 9+.' : ''}

**Emotional Content: ${levels[settings.sadness]}**
${settings.sadness === 0 ? '- ONLY positive emotions. No sadness, loneliness, fear, or worry.' : ''}
${settings.sadness === 1 ? '- Brief moments of worry or sadness, immediately comforted by friend/parent figure.' : ''}
${settings.sadness === 2 ? '- Meaningful emotional beats that are fully resolved by story end.' : ''}
${settings.sadness === 3 ? '- Deeper themes appropriate for older children. Still ends hopefully.' : ''}

**Complexity: ${levels[settings.complexity]}**
${settings.complexity === 0 ? '- Very simple, linear story. One event after another. No surprises.' : ''}
${settings.complexity === 1 ? '- Simple plot with one small twist or reveal.' : ''}
${settings.complexity === 2 ? '- Standard narrative structure with beginning tension, climax, resolution.' : ''}
${settings.complexity === 3 ? '- More sophisticated plotting, subplots, or layered themes permitted.' : ''}

VIOLATING THESE REQUIREMENTS IS NOT ACCEPTABLE. When in doubt, err toward LESS intense content.
`;
}
```

#### Step 7.4: Integrate Sensitivity into Pipeline

**File:** `src/pipeline.js`

**Action:** Include sensitivity guidance in prompt assembly:

```javascript
import { getSensitivityGuidance } from './prompts/adjustment_modules.js';

function assemblePromptForAgent(agentRole, context) {
    const sensitivitySettings = appState.sensitivitySettings || {
        conflict: 2, scary: 1, sadness: 2, complexity: 2
    };
    
    const sensitivityGuidance = getSensitivityGuidance(sensitivitySettings);
    
    // Include in all agent prompts
    return `${sensitivityGuidance}\n\n${agentPrompt}`;
}
```

#### Step 7.5: Add Post-Generation Content Check

**File:** `src/utils.js`

**Action:** Add function to flag potentially concerning content:

```javascript
export function checkContentSensitivity(storyText, settings) {
    const warnings = [];
    
    // Check for violence keywords at low conflict setting
    if (settings.conflict <= 1) {
        const violenceWords = /\b(fight|hit|punch|attack|hurt|kill|destroy|smash)\b/gi;
        if (violenceWords.test(storyText)) {
            warnings.push('Story may contain conflict language inconsistent with sensitivity settings.');
        }
    }
    
    // Check for scary keywords at low scary setting
    if (settings.scary <= 1) {
        const scaryWords = /\b(monster|scary|terrified|horrified|dark cave|shadows lurk|creature)\b/gi;
        if (scaryWords.test(storyText)) {
            warnings.push('Story may contain scary elements inconsistent with sensitivity settings.');
        }
    }
    
    // Check for sad keywords at low sadness setting
    if (settings.sadness === 0) {
        const sadWords = /\b(sad|cried|tears|lonely|lost|miss you|gone forever)\b/gi;
        if (sadWords.test(storyText)) {
            warnings.push('Story may contain emotional content inconsistent with sensitivity settings.');
        }
    }
    
    return warnings;
}
```

---

### Testing Checklist

- [ ] Sensitivity preset dropdown functions correctly
- [ ] "Custom" reveals individual sliders
- [ ] Preset labels update in collapsed header
- [ ] Generated stories at "Extra Gentle" have no conflict
- [ ] Generated stories at "Adventurous" have appropriate complexity
- [ ] Content check flags violations
- [ ] Settings persist in localStorage
- [ ] Works correctly with all story modes (Bedtime, Morning, Standard)

---

## 📋 Feature 8: Multi-Part Story Campaigns

### Background & Research

Some families want serialized stories—continuing adventures told across multiple nights. This feature enables "story campaigns" where:
- Characters persist across episodes
- Plot builds over multiple sessions
- Each episode has standalone satisfaction but connects to a larger arc
- "Previously on..." recaps keep listeners oriented

**Use Cases:**
- Nightly bedtime serialization (5-part bedtime saga)
- Character attachment (same hero across weeks)
- Teaching long-form narrative appreciation
- Creating family "lore" and inside references

**Technical Challenges:**
- State persistence across sessions
- Recap generation
- Arc planning for coherent multi-part structure
- Preventing conflicts between episodes

---

### Implementation Steps

#### Step 8.1: Define Campaign Data Structure

**File:** `src/campaign.js` (new file)

**Action:** Create campaign state management:

```javascript
export const CampaignManager = {
    campaigns: [], // Array of campaign objects
    activeCampaign: null,
    
    createCampaign(config) {
        const campaign = {
            id: generateUUID(),
            title: config.title || 'Untitled Campaign',
            totalEpisodes: config.totalEpisodes || 5,
            currentEpisode: 0,
            episodes: [],
            characters: config.characters || [],
            setting: config.setting || '',
            overarchingGoal: config.overarchingGoal || '',
            arcStructure: this.generateArcStructure(config.totalEpisodes),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };
        
        this.campaigns.push(campaign);
        this.saveCampaigns();
        return campaign;
    },
    
    generateArcStructure(episodeCount) {
        // Three-act structure distributed across episodes
        if (episodeCount <= 3) {
            return ['Setup', 'Confrontation', 'Resolution'];
        } else if (episodeCount === 5) {
            return ['Introduction', 'Rising Action', 'Midpoint Twist', 'Climax Build', 'Resolution'];
        } else {
            // Generalized structure
            const structure = ['Introduction'];
            for (let i = 1; i < episodeCount - 1; i++) {
                structure.push(`Episode ${i + 1}: Rising Action`);
            }
            structure.push('Resolution');
            return structure;
        }
    },
    
    addEpisode(campaignId, episode) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (campaign) {
            campaign.episodes.push({
                number: campaign.episodes.length + 1,
                title: episode.title,
                summary: episode.summary,
                fullText: episode.fullText,
                keyEvents: episode.keyEvents,
                characterDevelopments: episode.characterDevelopments,
                cliffhanger: episode.cliffhanger,
                createdAt: new Date().toISOString(),
            });
            campaign.currentEpisode = campaign.episodes.length;
            campaign.lastUpdated = new Date().toISOString();
            this.saveCampaigns();
        }
    },
    
    generateRecap(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign || campaign.episodes.length === 0) return '';
        
        const lastEpisode = campaign.episodes[campaign.episodes.length - 1];
        const recapLines = [
            `"Previously on ${campaign.title}..."`,
            '',
            lastEpisode.summary,
            '',
            `And that's where we left off. Ready for Episode ${campaign.episodes.length + 1}?`
        ];
        
        return recapLines.join('\n');
    },
    
    getCampaignContext(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return null;
        
        return {
            title: campaign.title,
            episodeNumber: campaign.currentEpisode + 1,
            totalEpisodes: campaign.totalEpisodes,
            arcPosition: campaign.arcStructure[campaign.currentEpisode],
            previousEpisodes: campaign.episodes.map(ep => ({
                number: ep.number,
                summary: ep.summary,
                keyEvents: ep.keyEvents,
                cliffhanger: ep.cliffhanger
            })),
            characters: campaign.characters,
            setting: campaign.setting,
            overarchingGoal: campaign.overarchingGoal,
        };
    },
    
    saveCampaigns() {
        localStorage.setItem('storyGenCampaigns', JSON.stringify(this.campaigns));
    },
    
    loadCampaigns() {
        const saved = localStorage.getItem('storyGenCampaigns');
        if (saved) {
            this.campaigns = JSON.parse(saved);
        }
    },
};
```

#### Step 8.2: Create Campaign Setup UI

**File:** `index.html`

**Action:** Add campaign management interface:

```html
<details class="campaign-section">
    <summary>
        <span class="section-icon">📚</span>
        <span>Story Campaigns</span>
        <span class="campaign-badge" id="activeCampaignBadge" style="display: none;">Active</span>
    </summary>
    
    <div class="campaign-content">
        <div id="noCampaignView">
            <p>Create a multi-part story adventure that continues across sessions!</p>
            <button id="createCampaignBtn" class="button-primary">
                <span>+ New Campaign</span>
            </button>
            
            <div id="existingCampaigns" class="campaign-list">
                <!-- Populated dynamically -->
            </div>
        </div>
        
        <div id="activeCampaignView" style="display: none;">
            <div class="campaign-header">
                <h4 id="campaignTitle">Campaign Title</h4>
                <span id="campaignProgress">Episode 1 of 5</span>
            </div>
            
            <div class="episode-tracker">
                <!-- Visual progress dots -->
                <div class="episode-dots" id="episodeDots"></div>
            </div>
            
            <div id="campaignRecap" class="recap-box" style="display: none;">
                <h5>📖 Previously...</h5>
                <p id="recapText"></p>
            </div>
            
            <div class="campaign-actions">
                <button id="continueStoryBtn" class="button-primary">Continue Story</button>
                <button id="endCampaignBtn" class="button-secondary">End Campaign</button>
            </div>
        </div>
    </div>
</details>
```

#### Step 8.3: Create Campaign Setup Modal

**Action:** Design a modal for creating new campaigns:

```html
<dialog id="campaignSetupModal" class="modal">
    <div class="modal-content">
        <h3>🚀 Create Story Campaign</h3>
        
        <div class="form-group">
            <label for="campaignTitleInput">Campaign Title:</label>
            <input type="text" id="campaignTitleInput" placeholder="The Adventures of...">
        </div>
        
        <div class="form-group">
            <label for="campaignEpisodeCount">Number of Episodes:</label>
            <select id="campaignEpisodeCount">
                <option value="3">3-Part Mini-Series</option>
                <option value="5" selected>5-Part Adventure</option>
                <option value="7">7-Part Epic</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="campaignGoal">Overarching Goal:</label>
            <textarea id="campaignGoal" placeholder="What are the characters trying to achieve across the whole story? (e.g., 'Find the lost treasure', 'Save the forest kingdom')"></textarea>
        </div>
        
        <div class="form-group">
            <label>Characters (from your saved character prompts):</label>
            <div id="campaignCharacterSelect">
                <!-- Populated from existing character inputs -->
            </div>
        </div>
        
        <div class="modal-actions">
            <button id="cancelCampaignBtn" class="button-secondary">Cancel</button>
            <button id="startCampaignBtn" class="button-primary">Start Campaign</button>
        </div>
    </div>
</dialog>
```

#### Step 8.4: Add Campaign-Aware Prompting

**File:** `src/prompts/agent_prompts.js`

**Action:** Create campaign-specific prompt guidance:

```javascript
export function getCampaignPromptGuidance(campaignContext) {
    if (!campaignContext) return '';
    
    const { episodeNumber, totalEpisodes, arcPosition, previousEpisodes, overarchingGoal } = campaignContext;
    
    let previousSummary = '';
    if (previousEpisodes && previousEpisodes.length > 0) {
        const lastTwo = previousEpisodes.slice(-2);
        previousSummary = lastTwo.map(ep => 
            `Episode ${ep.number}: ${ep.summary}${ep.cliffhanger ? ` (Cliffhanger: ${ep.cliffhanger})` : ''}`
        ).join('\n');
    }
    
    return `
## 📚 MULTI-PART CAMPAIGN CONTEXT

This is **Episode ${episodeNumber} of ${totalEpisodes}** in an ongoing story campaign.

**Campaign Goal:** ${overarchingGoal}

**Arc Position:** ${arcPosition}
${getArcPositionGuidance(arcPosition, episodeNumber, totalEpisodes)}

${previousSummary ? `**Previous Episode(s):**\n${previousSummary}` : '**This is the first episode.** Establish characters and world.'}

**Serialization Requirements:**

1. **Continuity:** Reference events/details from previous episodes naturally.
2. **Character Consistency:** Characters should behave consistently with their established personalities.
3. **Progress the Arc:** Move toward the overarching goal—don't spin wheels.
4. **Standalone Satisfaction:** This episode should have its own mini-arc (beginning, middle, end) while connecting to the larger story.
5. **Episode Ending:**
   ${episodeNumber < totalEpisodes 
     ? '- End with a cliffhanger, question, or anticipation for what comes next.\n   - "And as they looked to the horizon, they knew their journey had only just begun..."' 
     : '- This is the FINAL episode. Resolve the overarching goal. Tie up loose ends. Provide emotional closure.'}
`;
}

function getArcPositionGuidance(position, episode, total) {
    if (episode === 1) {
        return `
**First Episode Guidance:**
- Introduce characters and their world fully
- Establish the quest/goal clearly
- End with the adventure officially beginning
- Leave listeners excited for Episode 2`;
    } else if (episode === total) {
        return `
**Final Episode Guidance:**
- Resolve the main conflict/goal
- Show character growth from Episode 1
- Provide emotional closure
- Optional: Hint at future adventures (for potential sequels)`;
    } else if (episode === Math.ceil(total / 2)) {
        return `
**Midpoint Episode Guidance:**
- Major twist or revelation
- Raise the stakes significantly
- Characters face a new challenge or perspective
- "Nothing will be the same after this moment"`;
    } else {
        return `
**Rising Action Guidance:**
- Build on previous events
- Deepen character relationships
- Encounter obstacles toward the goal
- Each episode should feel like meaningful progress`;
    }
}
```

#### Step 8.5: Add Post-Episode Summary Generation

**File:** `src/pipeline.js`

**Action:** After generating a campaign episode, extract summary information:

```javascript
async function extractEpisodeSummary(storyText, campaignContext) {
    // Use AI to generate summary for continuity
    const summaryPrompt = `
You just wrote Episode ${campaignContext.episodeNumber} of a story campaign.

Story text:
${storyText}

Please provide:
1. A 2-3 sentence summary of this episode (for recap next time)
2. Key events that should be remembered
3. Any character developments
4. The cliffhanger or hook for next episode (if applicable)

Format as JSON:
{
    "summary": "...",
    "keyEvents": ["event1", "event2"],
    "characterDevelopments": ["Character learned X", "Character showed Y"],
    "cliffhanger": "..." (or null if final episode)
}
`;
    
    const response = await callGeminiAPI(summaryPrompt);
    return JSON.parse(response);
}
```

---

### Testing Checklist

- [ ] Can create new campaign with title, episode count, goal
- [ ] Campaign appears in list after creation
- [ ] Can select and activate existing campaign
- [ ] Episode progress tracker updates correctly
- [ ] Recap displays before Episode 2+
- [ ] Generated episodes reference previous events
- [ ] Final episode provides closure
- [ ] Campaigns persist across browser sessions
- [ ] Can end/archive campaign
- [ ] Works with all story frameworks and modes

---

## 🔗 Updated Implementation Sequence

### Completed Phases (1-5) ✅

Phases 1-5 covered the initial three features: Fable Framework, Bedtime Mode, and Voice Consistency.

### Phase 6: Morning Energizer Mode (Week 5-6)
**Priority: High** — Natural complement to Bedtime Mode

1. Define Morning Energizer Preset (Step 4.1)
2. Add energetic_morning tone module (Step 4.2)
3. Add fast_dynamic pacing module (Step 4.3)
4. Create Morning Mode UI toggle (Step 4.4)
5. Implement Morning Mode logic (Step 4.5)
6. Add mutual exclusivity with Bedtime Mode (Step 4.6)

### Phase 7: Learning Fable Sub-Mode (Week 6-7)
**Priority: High** — Extends completed Fable Framework

1. Define Learning Fable structure (Step 5.1)
2. Create STEM concept selector UI (Step 5.2)
3. Wire concept selection to prompts (Step 5.3)
4. Add age-adaptive STEM vocabulary (Step 5.4)

### Phase 8: Narrator Personality Presets (Week 7-8)
**Priority: Medium** — Enhances completed Voice Consistency

1. Define 5 narrator personas (Step 6.1)
2. Create persona selector UI (Step 6.2)
3. Integrate personas into prompts (Step 6.3)
4. Add auto-suggestion with modes (Step 6.4)

### Phase 9: Parental Controls (Week 8-9)
**Priority: Medium-High** — Important for family trust

1. Define sensitivity level presets (Step 7.1)
2. Create parental controls UI (Step 7.2)
3. Generate sensitivity guidance (Step 7.3)
4. Integrate into pipeline (Step 7.4)
5. Add post-generation content check (Step 7.5)

### Phase 10: Multi-Part Story Campaigns (Week 9-11)
**Priority: Medium** — Complex feature, high value

1. Define campaign data structure (Step 8.1)
2. Create campaign setup UI (Step 8.2)
3. Create campaign setup modal (Step 8.3)
4. Add campaign-aware prompting (Step 8.4)
5. Add post-episode summary generation (Step 8.5)

### Phase 11: Testing & Polish (Week 11-12)
**Priority: Ongoing**

1. Integration testing across all new features
2. Performance optimization
3. Mobile responsiveness for new UI elements
4. Accessibility audit
5. User feedback collection

### Phase 12: Documentation & Launch (Week 12)
**Priority: Final**

1. Update README with all new features
2. Create feature showcase/demo
3. Write user guide for campaigns
4. Prepare changelog for release

---

## 📊 Success Metrics (Extended)

### Morning Energizer Mode
- [ ] Users can activate Morning Mode with one click
- [ ] Stories end with action, not wind-down
- [ ] Hard consonant ratio measurably higher
- [ ] User feedback: "Got my kids excited for the day"

### Learning Fable
- [ ] STEM concepts accurately represented
- [ ] Age-appropriate vocabulary adaptation works
- [ ] Educators find value for classroom use
- [ ] Parents report "sneaky learning" success

### Narrator Personas
- [ ] All 5 personas generate distinct voices
- [ ] Voice remains consistent throughout story
- [ ] Auto-suggestions match mode context
- [ ] Users develop "favorite" personas

### Parental Controls
- [ ] No content violations at strictest settings
- [ ] Settings persist correctly
- [ ] Content checker flags <5% false positives
- [ ] Parents report increased confidence

### Multi-Part Campaigns
- [ ] Campaigns persist across sessions
- [ ] Recaps are accurate and helpful
- [ ] Episode continuity is maintained
- [ ] Final episodes provide satisfying closure
- [ ] Users complete multi-episode campaigns

---

## 🎓 Expert Insights (Extended)

### On Morning Energy (Child Psychology)
> "Morning routines set the emotional tone for the entire day. Stories that build energy should mirror the natural awakening process: gentle stimulus → building engagement → peak energy → sustained alertness."

### On STEM Fables (Education)
> "The best science education happens when children don't realize they're learning. A fable about a crow discovering displacement teaches physics through empathy and narrative, not instruction."

### On Narrator Voice (Storytelling)
> "A narrator is not invisible. Every choice of word, every pause, every aside shapes the listener's experience. Giving users named personas turns an abstract concept (voice) into something tangible and lovable."

### On Parental Controls (Family Tech)
> "Trust is the foundation of family tech adoption. Parents who can't control content intensity will not recommend the tool. Granular controls show respect for diverse family values."

### On Serialized Stories (Narrative Design)
> "Serialization creates anticipation, deepens attachment, and teaches long-form narrative appreciation. The key is standalone satisfaction within each episode—never hold satisfaction hostage for the next installment."

---

**End of TODO Document**

*Last updated: February 16, 2026*
*Maintainer: StoryGen Development Team*
