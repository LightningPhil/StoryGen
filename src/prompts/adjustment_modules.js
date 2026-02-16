// src/prompts/adjustment_modules.js

// This file contains modular, directive strings for fine-tuning the AI's output.
// These modules control specific aspects of narrative style like tone, pacing, humor, and theme.
// Each key (e.g., 'calm_bedtime') maps to a specific instruction for the agent.
// A selection of 'none' or 'default' will result in an empty string, applying no specific directive for that module.

export const ADJUSTMENT_MODULES = {
    tone: {
        'none': '',
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
        'calm_bedtime': `**Tone: Calm & Bedtime Mode (Enhanced)**

Use gentle, soothing language with a lullaby-like rhythm to help listeners transition toward sleep.

**Linguistic Guidance:**
- **Soft Consonants:** Favor words with L, M, N, W, R sounds. Minimize hard consonants (K, T, P, D, G).
  - GOOD: "The little lamb lay down in the meadow, warm and drowsy."
  - AVOID: "The cat kicked the gate and dashed past the park."
  
- **Sentence Flow:** Use longer, flowing sentences that mimic natural breathing patterns. Avoid choppy or staccato rhythm.
  
- **Calming Vocabulary:** Emphasize words like: soft, gentle, warm, cozy, quiet, peaceful, safe, snuggle, dream, moonlight, yawn, sleepy, rest, hush, lullaby, slumber.

- **Imagery:** Focus on peaceful, comforting scenes:
  - Moonlight through windows, stars twinkling
  - Soft blankets, warm pillows, cozy nests
  - Gentle night sounds (crickets, distant owls, rain on roof)
  - Warm drinks (milk, cocoa, honey tea)
  - Twilight colors, fireflies, gentle breezes
  
**Conflict Resolution:**
- Any conflict must be very mild (a small worry, a gentle misunderstanding)
- Resolve with kindness, reassurance, and safety
- NO villains, danger, scary creatures, or loud surprises
- NO exciting action sequences or suspenseful moments

**Story Arc (Energy De-escalation):**
- Beginning: Gentle activity or exploration (moderate energy)
- Middle: A small, solvable challenge or quiet discovery (slightly lower)
- Ending: Explicit return to safety, comfort, and rest (lowest energy)
  - Final paragraph MUST include sleepy/rest imagery
  - End with character settling down, looking at stars, or feeling safe
  - Consider endings like: "And soon, they drifted off to sleep" or "Everything was just right"

**Narrative Voice:**
- Speak as a warm, gentle storyteller
- Use a slower, softer tone in word choice
- Occasional direct address ("And so, our little friend..." or "Just like you...")
- Grandfatherly or motherly warmth

**Pacing:** Gradually slow down as story progresses. The final third should feel like winding down, with longer sentences and more pauses.`,
        'whimsical_playful': '**Tone: Whimsical & Playful.** Adopt a lighthearted, fantastical tone filled with wonder and giggles. Use expressive interjections and a narrative voice that is excited and warm.',
        'epic_grand': '**Tone: Epic & Grand.** Use elevated, magical language. The narrative voice should be grand and adventurous, as if narrating a classic myth or fantasy tale, suitable for slightly older children.',
    },
    pacing: {
        'default': '',
        'slow_soothing': '**Pacing: Slow & Soothing.** Unfold the story with a measured, gentle rhythm. Incorporate moments of quiet reflection or sensory observation (the "Ma" concept of a pause for breath).',
        'fast_exciting': '**Pacing: Fast & Exciting.** Keep the story moving quickly with shorter sentences and snappy transitions. Build momentum and a page-turning feel, especially during action sequences.',
        'moderate_balanced': '**Pacing: Moderate & Balanced.** Blend descriptive, slower moments with faster-paced action scenes to create a classic, balanced story arc with natural rise and fall.',
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
    humor: {
        'none': '',
        'light_silly': '**Humor: Light & Silly.** Include gentle, silly jokes, wordplay, and funny surprises. The humor should be warm-hearted and age-appropriate.',
        'wacky_slapstick': '**Humor: Wacky & Slapstick.** Use physical comedy, exaggerated situations, and comically clumsy moments for big laughs. Kid-safe "gross" humor (like a friendly monster with smelly socks) is acceptable.',
        'witty_dry': '**Humor: Witty & Dry.** Include a few tongue-in-cheek asides, clever observations, or puns that an attentive parent might chuckle at, while still being understandable to a child.',
    },
    emotion: {
        'default': '',
        'heartwarming': '**Emotional Journey: Heartwarming.** Center the story on friendship, kindness, and family love. The conflict should resolve through an act of compassion or understanding, leaving the reader feeling warm and fuzzy.',
        'empowering': '**Emotional Journey: Empowering.** The protagonist must overcome a personal fear or weakness. The story should end with them feeling brave and confident, reinforcing a message of self-belief.',
        'wonder_curiosity': '**Emotional Journey: Wonder & Curiosity.** The focus is on awe, discovery, and imagination. The joy of exploring or learning something new is the primary emotional reward.',
        'laughs_and_fun': '**Emotional Journey: Laughs & Fun.** Prioritize happiness and laughter. Any conflict should be a light misunderstanding that resolves in a fun, joyful finale.',
        'bittersweet_reflective': '**Emotional Journey: Bittersweet & Reflective.** For older children. The ending can be gently sad or nostalgic, but must remain hopeful. This could involve saying a fond goodbye or reflecting on growth.',
    }
};

// --- Sensitivity Guidance System ---
// These settings allow parents to control the intensity of various story elements.

/**
 * SENSITIVITY_SETTINGS
 * Each category has levels from 0 (none) to 3 (full)
 * - 0: Extra Gentle - Avoid entirely
 * - 1: Gentle - Minimal, resolved quickly
 * - 2: Standard - Age-appropriate challenges
 * - 3: Adventurous - Fuller exploration of themes
 */

const SENSITIVITY_GUIDANCE_TEMPLATES = {
    conflict: {
        0: `**Conflict Level: Extra Gentle**
AVOID all forms of conflict, disagreement, or adversarial situations.
- NO villains or antagonists
- NO arguments between characters
- NO characters being mean, even temporarily
- Stories should be purely positive journeys of discovery
- Any "challenge" is environmental (e.g., "how do we build this?") not interpersonal`,

        1: `**Conflict Level: Gentle**
Include only MINOR, quickly-resolved conflicts:
- Small misunderstandings that clear up within a paragraph
- Friendly disagreements about simple things (which game to play)
- NO villains—just puzzles or gentle obstacles
- Any tension must resolve within 2-3 sentences
- Characters should apologize quickly and genuinely if anyone's feelings are hurt`,

        2: `**Conflict Level: Standard**
Age-appropriate conflicts are allowed:
- Traditional story antagonists (tricky fox, grumpy troll) are fine
- Characters can disagree and work through problems
- Mild competition or rivalry that teaches good sportsmanship
- Conflicts should resolve through positive values (kindness, teamwork)
- Brief moments of characters being inconsiderate, followed by growth`,

        3: `**Conflict Level: Adventurous**
Fuller exploration of conflict themes:
- Clear villains or antagonists with understandable motives
- Characters can face real obstacles and setbacks
- Moral complexity: antagonists might have reasons for their behavior
- Extended conflict arcs that build across the story
- Consequences for actions are explored
- Resolution still reinforces positive values`
    },
    
    scary: {
        0: `**Scary Elements: None**
AVOID anything potentially scary or unsettling:
- NO darkness as a story element
- NO loud sounds, surprises, or startling moments
- NO mention of creatures typically seen as scary (wolves, monsters, witches)
- NO getting lost or separated
- Keep everything sunny, bright, and explicitly safe
- Characters should NEVER express fear`,

        1: `**Scary Elements: Extra Gentle**
Only the mildest tension is allowed:
- Characters can feel "a little nervous" but always have immediate comfort
- Dark places must have stars, moonlight, or friendly glowing things
- Any potentially scary creature must be immediately revealed as friendly
- Getting lost = an adventure that ends quickly and safely
- An adult/helper is always nearby if needed
- Resolution comes FAST—don't let tension build`,

        2: `**Scary Elements: Gentle**
Mild scary moments that resolve positively:
- Characters can face fears (the dark, thunder, new situations)
- Traditional "scary" characters (witches, wolves) can appear but must be nuanced
- Brief tension is okay—character overcomes fear through bravery
- The lesson that scary things aren't so scary after all
- Comfort and safety are restored within the scene`,

        3: `**Scary Elements: Standard Adventure**
Age-appropriate suspense and tension:
- Traditional fairy tale-level scary moments are allowed
- Characters can experience genuine fear before overcoming it
- Villains can be somewhat intimidating
- Dark settings, storms, or ominous atmospheres are okay
- Suspense can build across scenes
- Cathartic resolution where fear is conquered`
    },
    
    sadness: {
        0: `**Sad Elements: None**
AVOID all sad, melancholy, or emotionally heavy content:
- NO loss, saying goodbye, or missing someone
- NO characters feeling lonely, left out, or sad
- NO failure or disappointment
- NO sick or injured characters (even minor scrapes)
- Only positive emotions throughout
- If a character faces a setback, immediately pivot to success`,

        1: `**Sad Elements: Minimal**
Only brief, immediately-resolved sad moments:
- A character can feel "a little sad" but MUST be comforted within the same paragraph
- NO prolonged sadness—quick hugs and everything's better
- Saying goodbye is only allowed if reunion is explicitly shown
- Missing someone = they arrive or call immediately
- Any disappointment transforms to excitement within sentences`,

        2: `**Sad Elements: Gentle**
Some emotional depth is allowed:
- Characters can experience sadness as part of their emotional journey
- Loss can be mentioned if handled gently and with hope
- Saying goodbye can be bittersweet (but still hopeful)
- Characters can feel left out but then find belonging
- Sad moments lead to growth, connection, or understanding
- Comfort is provided—no character is left alone in sadness`,

        3: `**Sad Elements: Standard**
Age-appropriate emotional depth:
- Full emotional journeys including sad moments
- Loss can be explored (pet, moving away, friend leaving)
- Characters can sit with their feelings before resolution
- Bittersweet endings are acceptable if ultimately hopeful
- Growth through difficult emotions
- The value of all feelings is acknowledged`
    },
    
    complexity: {
        0: `**Complexity Level: Simple**
Keep stories extremely simple:
- ONE main character with ONE problem
- Linear plot: beginning → one event → happy end
- Maximum 3 named characters
- Single, simple setting
- NO subplots or secondary storylines
- Crystal-clear cause and effect
- ONE simple, obvious lesson`,

        1: `**Complexity Level: Easy**
Simple but with some depth:
- Main character with a clear goal
- 2-3 scenes that build logically
- 3-4 characters maximum
- ONE helper or friend can assist
- Setting can change once
- One small twist or surprise is okay
- Clear, stated moral at the end`,

        2: `**Complexity Level: Standard**
Age-appropriate narrative complexity:
- Multiple characters with distinct roles
- 3-4 connected scenes
- Setting can change as story requires
- Simple cause-and-effect chains
- Minor characters can have small arcs
- Gentle twists and surprises
- Themes are shown through story, not just stated`,

        3: `**Complexity Level: Rich**
Fuller narrative possibilities:
- Multiple interweaving character arcs
- 4-6 scenes with purposeful structure
- Multiple settings that contribute to story
- Parallel storylines that connect
- Nuanced character motivations
- Plot twists and reveals
- Layered themes for different comprehension levels`
    }
};

/**
 * Generates sensitivity guidance text based on current settings
 * @param {Object} settings - Object with conflict, scary, sadness, complexity levels (0-3)
 * @returns {string} Combined sensitivity guidance text
 */
export function getSensitivityGuidance(settings) {
    if (!settings) return '';
    
    const parts = [];
    
    if (settings.conflict !== undefined && settings.conflict !== 2) {
        parts.push(SENSITIVITY_GUIDANCE_TEMPLATES.conflict[settings.conflict] || '');
    }
    
    if (settings.scary !== undefined && settings.scary !== 2) {
        parts.push(SENSITIVITY_GUIDANCE_TEMPLATES.scary[settings.scary] || '');
    }
    
    if (settings.sadness !== undefined && settings.sadness !== 2) {
        parts.push(SENSITIVITY_GUIDANCE_TEMPLATES.sadness[settings.sadness] || '');
    }
    
    if (settings.complexity !== undefined && settings.complexity !== 2) {
        parts.push(SENSITIVITY_GUIDANCE_TEMPLATES.complexity[settings.complexity] || '');
    }
    
    if (parts.length === 0) return '';
    
    return `
## 🛡️ PARENTAL CONTENT GUIDANCE
The following sensitivity settings have been specified. These take PRIORITY over default story conventions.

${parts.filter(Boolean).join('\n\n')}
`;
}