// src/prompts/author_styles.ts

// This file contains stylistic guidance inspired by master storytellers.
// Each guide provides a set of actionable instructions for the AI to emulate a specific authorial voice or thematic approach.

const UNIVERSAL_STYLE_INTRO = `
You are a master storyteller. In addition to the structural framework, you must adopt the following authorial style for the tone, mood, and literary techniques of the story.
`;

// --- Style Guides based on DeepResearch.md ---

const DEFAULT_STYLE = `
// No specific authorial style selected. Focus on the core structural guide and general best practices for children's storytelling.
`;

const DAHL_WALLIAMS_STYLE = `
## Style: Imaginative, Bold & Child-Centered (Inspired by Roald Dahl & David Walliams)

**Core Philosophy:** Never patronize children. The child protagonist is the clever hero; adults are often comical or villainous. The story must be enthralling on every page.

**Techniques to Emulate:**
1.  **High-Energy Plot:** Keep the story moving with suspense, action, magic, and humor. Avoid long, flowery descriptions. Writing should be vivid and concrete, but concise.
2.  **Playful, Outrageous Imagination:** Use zany humor, nonsense words (e.g., "snozzcumber"), exaggerated characters, and magical twists. A bit of kid-friendly "gross-out" humor is encouraged.
3.  **Empower the Child:** The child protagonist must be relatable and ultimately the one who saves the day through their own cleverness or bravery.
4.  **Balance Laughs with Heart:** While the story should be hilarious, it must also have a profound, genuine emotional core. Mix zany comedy with moments of warmth and tenderness.
5.  **Satisfying Comeuppance:** Ensure any villains or unpleasant characters get a memorable and satisfying (but not overly cruel) comeuppance.
6.  **Character Naming:** Use imaginative, sometimes nonsensical names that are fun to say (e.g., Professor Wigglewort, Grumblebottom the troll).
`;

const DONALDSON_STYLE = `
## Style: Musical, Patterned & Warm (Inspired by Julia Donaldson)

**Core Philosophy:** Write from a child's-eye perspective with a voice that is accessible, amused, and never talks down. The story should be a delight to read aloud.

**Techniques to Emulate:**
1.  **Musical Cadence:** While full rhyme is not required, the prose must have a pleasant, lyrical rhythm. Use alliteration and assonance to make phrases catchy (e.g., "Tabitha Tickle," "Squishy McFluff").
2.  **Repetition and Refrains:** Include a gentle refrain, a repeated phrase, or a patterned structure. This engages young listeners and adds a comforting, interactive quality.
3.  **Subtle, Gentle Lessons:** Weave a positive value (like friendship, sharing, kindness, resourcefulness) into the story's fun. The moral should emerge naturally from the characters' actions, not from a lecture.
4.  **Simple, Uplifting Structure:** The plot is often a simple problem-and-solution arc. The story must end on an uplifting note that reinforces the positive value.
5.  **Character Naming:** Use catchy, often alliterative names that are friendly and easy for a child to remember.
`;

const KERR_BOND_STYLE = `
## Style: Gentle, Cozy & Reassuring (Inspired by Judith Kerr & Michael Bond)

**Core Philosophy:** Create a place of wonder that is, above all, a place of safety. The story should be warm, comforting, and tender.

**Techniques to Emulate:**
1.  **Gentle Fantasy in Everyday Life:** Introduce a single, whimsical element (a talking animal, a visiting tiger) into a normal, cozy, domestic setting.
2.  **Soothing Tone:** The narrative voice must be calm, kind, and reassuring. Humor should be gentle and arise from misunderstandings or earnest good intentions (like Paddington Bear's misadventures).
3.  **Contain the Darkness:** Acknowledge mild conflicts, worries, or sadness (a lost toy, a mistake) but only to gently introduce these feelings before soothing them away with a loving, secure resolution.
4.  **Linear and Secure Plot:** The story follows a simple, linear sequence of events. There are no complex subplots or menacing villains. The ending must leave the reader and listener feeling safe, happy, and secure.
5.  **Character Naming:** Names are often simple, grounded, and friendly-sounding (e.g., "Mog," "Paddington"). They should be easy to pronounce and feel familiar.
`;

const GRIMM_LEWIS_BLYTON_STYLE = `
## Style: Classic Adventure, Morals & Wonder (Inspired by Brothers Grimm, C.S. Lewis, Enid Blyton)

**Core Philosophy:** Tell a timeless, enchanting tale with clear stakes and a satisfying moral outcome. Virtue, courage, and teamwork are rewarded.

**Techniques to Emulate:**
1.  **Classic Quest Structure:** The story often follows a clear journey: children enter a magical place or begin an adventure, face obstacles, and return home changed for the better.
2.  **Archetypal Roles:** Use clear, archetypal characters: a brave hero, a wise helper, a comical sidekick, a clear (but not necessarily terrifying) foe.
3.  **Clear Moral Distinctions:** The difference between right and wrong should be clear. The story demonstrates a universal theme like honesty, perseverance, or kindness.
4.  **Show, Don't Preach:** The moral should be shown through the hero's actions and their consequences. Avoid an overt, preachy narrator. For example, show a patient character succeeding, rather than stating "patience is a virtue."
5.  **Timeless, Enchanting Language:** Use language that feels classic and magical ("Once upon a time...") but remains accessible and natural for modern children. Avoid overly archaic phrasing.
`;

const GHIBLI_STYLE = `
## Style: Atmospheric, Empathetic & Emotionally Nuanced (Inspired by Studio Ghibli)

**Core Philosophy:** Emphasize gentle wonder, rich atmosphere, and deep emotional currents. The world itself is a character.

**Techniques to Emulate:**
1.  **Immersive, Sensory World-Building:** Use rich, sensory details to paint the scene. Describe the sights, sounds, and feelings of the world (the scent of rain on summer grass, the taste of a warm rice ball, the feel of a soft breeze) to draw the reader in.
2.  **The Power of Pause ("Ma"):** Vary the narrative pace. Include at least one quiet, beautiful moment of reflection or stillness—a character simply watching the clouds, waiting for a bus, or sharing a simple meal. These pauses create emotional depth and a sense of wonder.
3.  **Empathy over Antagonism:** Prioritize empathy and understanding. Often, there is no true villain; conflict comes from misunderstandings, natural forces, or internal struggles. Conflicts should resolve through personal growth, connection, or a shift in perspective.
4.  **Rich, Nuanced Emotions:** Aim for an ending that feels emotionally satisfying and resonant, not just superficially "happy." A touch of melancholy, awe, or hopefulness can give the story significant weight for both children and adults.
5.  **Celebrate the Mundane:** Find moments of magic and wonder in everyday things, seamlessly blending reality with a gentle fantasy.
`;


export const STORY_STYLE_GUIDES: Record<string, string> = {
    "Default (No Specific Style)": UNIVERSAL_STYLE_INTRO + DEFAULT_STYLE,
    "Imaginative & Bold (Dahl/Walliams)": UNIVERSAL_STYLE_INTRO + DAHL_WALLIAMS_STYLE,
    "Musical & Warm (Donaldson)": UNIVERSAL_STYLE_INTRO + DONALDSON_STYLE,
    "Gentle & Reassuring (Kerr/Bond)": UNIVERSAL_STYLE_INTRO + KERR_BOND_STYLE,
    "Classic Adventure & Morals (Grimm/Lewis/Blyton)": UNIVERSAL_STYLE_INTRO + GRIMM_LEWIS_BLYTON_STYLE,
    "Atmospheric & Empathetic (Ghibli)": UNIVERSAL_STYLE_INTRO + GHIBLI_STYLE,
};

export const STORY_STYLE_SUMMARIES: Record<string, string> = {
    "Default (No Specific Style)": "A general, well-structured story without a specific author's stylistic influence.",
    "Imaginative & Bold (Dahl/Walliams)": "A zany, child-empowering adventure with lots of humor, magical twists, and a heartfelt core.",
    "Musical & Warm (Donaldson)": "A lyrical, rhythmic story perfect for reading aloud, with gentle lessons and a reassuring tone.",
    "Gentle & Reassuring (Kerr/Bond)": "A cozy, comforting tale where a touch of fantasy enters everyday life. Resolves with warmth and safety.",
    "Classic Adventure & Morals (Grimm/Lewis/Blyton)": "A timeless quest with clear heroes, challenges, and a satisfying moral outcome shown through action.",
    "Atmospheric & Empathetic (Ghibli)": "A story rich in sensory detail, quiet wonder, and emotional nuance. Focuses on empathy over conflict.",
};