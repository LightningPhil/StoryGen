// src/prompts/adjustment_modules.js

// This file contains modular, directive strings for fine-tuning the AI's output.
// These modules control specific aspects of narrative style like tone, pacing, humor, and theme.
// Each key (e.g., 'calm_bedtime') maps to a specific instruction for the agent.
// A selection of 'none' or 'default' will result in an empty string, applying no specific directive for that module.

export const ADJUSTMENT_MODULES = {
    tone: {
        'none': '',
        'calm_bedtime': '**Tone: Calm & Bedtime.** Use gentle, soothing language with a lullaby-like rhythm. Focus on cozy, peaceful images (e.g. moonlight, warm blankets). Resolve any conflict with quiet reassurance. The narrative voice should be soft and comforting.',
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