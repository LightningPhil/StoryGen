// src/prompts/adjustment_modules.js

// This file contains modular, directive strings for fine-tuning the AI's output.
// These modules control specific aspects of narrative style like tone, pacing, humor, and theme.
// Each key (e.g., 'calm_bedtime') maps to a specific instruction for the agent.
// A selection of 'none' or 'default' will result in an empty string, applying no specific directive for that module.

export const ADJUSTMENT_MODULES = {
    tone: {
        'none': '',
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