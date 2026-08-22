import { normalizeLookupKey } from '../lookupKeys';

const UNIVERSAL_CRAFT_STANDARDS = `
## ✨ Universal Craft Standards  (apply no matter which framework you choose)

1. **Show, *then* name** every key emotion or object. *(E.g., “A tremor rippled through Pika’s whiskers” → “*This is fear,* she realised.”)*
2. **Sensory Trios:** When stakes peak, layer **three** senses (sound • texture • smell/visual) in one sentence cluster.
3. **Limit exclamation marks** to **≤ 8** per story.
4. Avoid generic adjectives (e.g., *magical, glowing, scary*). Swap with precise verbs or concrete images.
5. Keep dialogue tags simple (*said, asked, whispered*), unless a vivid alternative truly adds colour.
6. Maximum word count guidance for short stories aimed at ages 5‑8: **800–1 200 words**.

---
### 🎭 Narrative Voice Consistency

Your narrator is a CHARACTER with a consistent personality. Maintain this voice throughout:

**Before writing:** Decide your narrator's persona—warm and grandfatherly? Playful and silly? Calm and gentle? Epic and grand? This should align with the chosen authorial style and tone adjustments.

**Throughout the story maintain:**
- **Vocabulary Level:** If you start with simple words, don't suddenly use "precipitous" or "contemplated."
- **Sentence Structure:** If you begin with short, punchy sentences, don't shift to long, flowing paragraphs mid-story (unless intentionally pacing down for bedtime).
- **Direct Address:** If you address the reader ("Dear listener..."), continue occasionally; don't drop it entirely.
- **Formality Register:** Keep consistent:
  - *Conversational:* contractions (it's, they're), casual tone
  - *Storybook:* flowing, slightly formal but warm ("And so it was that...")
  - *Epic:* elevated language, grander vocabulary
- **Humor Consistency:** If you start with jokes, don't become suddenly serious without narrative reason.

**Red Flags to Avoid:**
- ❌ Starting whimsical, ending preachy
- ❌ Mixing slang with archaic language ("totally cool" + "thou shalt")
- ❌ Narrator becoming a moral lecturer in the last paragraph
- ❌ Jokes that clash with emotional beats (silly one-liner during sad moment)

**Self-Check:** After drafting, ask: Could the same person have narrated every paragraph? Does the VOICE feel like one storyteller throughout?

---`;

// --- Original Frameworks ---

const STORY_CIRCLE_GUIDE = `
**Instructions for Story Creation using Dan Harmon's Story Circle:**

Your story MUST follow this 8-step structure:
1.  **You (Character in a comfort zone):** Introduce the main character(s) in their ordinary, comfortable world. Show what their everyday life is like.
2.  **Need (They want something):** Clearly establish a desire, goal, or problem that motivates the character(s) to act.
3.  **Go (Enter unfamiliar situation):** The character(s) cross a threshold, leaving their comfort zone to pursue their 'Need'. Describe this new, unfamiliar situation.
4.  **Search (Adapt to it):** The character(s) face challenges, obstacles, or trials in this new situation. They learn, adapt, and acquire new skills or understanding.
5.  **Find (Get what they wanted):** The character(s) achieve their initial goal or find what they were searching for. However, this success often comes with a complication or a 'catch'.
6.  **Take (Pay a heavy price for it):** The character(s) face the consequences, costs, or sacrifices associated with their achievement in step 5. This is often a difficult part of their journey.
7.  **Return (To their familiar situation):** The character(s) journey back towards their original world or a new state of normalcy, bringing with them what they've gained or learned.
8.  **Change (Having changed):** The character(s) are demonstrably transformed by their journey. Show how they have grown, what lessons they've learned, and how their perspective or life is different now.

**CRAFT GUIDE (must-follow):**

1.  After **Step 2** you MUST state the hero's **internal flaw/fear** in one line.  Introduce the protagonist's core fear or flaw **in scene**, not as an author aside. Show it with at least one physical cue (e.g., sweaty paws, quivering whiskers) *and* one anxious thought.
2.  Before **Step 3** add a clear **ticking clock or consequence** if the quest is ignored.  
3.  In **Step 4**: Include at least one obstacle that directly tests the flaw/fear.  Let that fear shape a choice or mistake. Include a brief beat where the hero almost turns back or freezes.  
4.  In **Step 6**: Show a *tangible sacrifice* in **3 or more sentences** (hesitation, then sensory detail, then immediate consequence).  During the sacrifice, amplify the fear: use **three sensory details** (sound, texture, smell, etc.) to make the cost visceral. Show a moment of doubt *before* the commitment.  
5.  In **Step 8**: Illustrate the transformed fear. The hero should respond to a small echo of the original trigger, but with new confidence or wisdom. This section should include a vivid sensory image (no moral summary).
6.  Style: less than 8 exclamation marks; replace generic adjectives such as ('magical', 'glowing') with precise verbs & fresh sense details.
`;

const THREE_ACT_STRUCTURE_GUIDE = `
## 1. Three‑Act Structure

### **Step Outline**

| Act | What to Hit |
|-----|-------------|
| **Act 1 – Setup** | Everyday life ⟶ *Inciting Incident* (no later than 15% in) |
| **Act 2 – Confrontation** | Rising conflict, *Midpoint Reversal* at 50%, stakes double |
| **Act 3 – Resolution** | Climax (inner + outer), immediate fallout, short denouement |

### **Craft Checklist (MUST‑FOLLOW)**  
1. **Internal Flaw Reveal** ⟶ Immediately *after* inciting incident, show the hero’s fear or flaw in **< 30 words** using one physical cue + one anxious thought.  
2. **Ticking Clock** ⟶ State or imply a consequence if goal isn’t met **before midpoint.**  
3. **Midpoint Mirror** ⟶ Present a choice that tempts the hero to repeat their old flaw; they must *fail or falter.*  
4. **Climactic Sacrifice** ⟶ Use **3+ sentences** of sensory detail as the hero willingly risks or gives up something dear.  
5. **Transformation Echo** ⟶ In the denouement, revisit the original trigger; hero responds with new confidence—*no moralising summary.*
`;

const KISHOTENKETSU_GUIDE = `
## 2. **Kishōtenketsu** (起承転結)

> *A harmony‑based structure that replaces direct conflict with contrast.*

### **Step Outline**
1. **Ki – Introduction**  
2. **Shō – Development**  
3. **Ten – Twist/Turn (contrast or surprise)**  
4. **Ketsu – Conclusion / Synthesis**

### **Craft Checklist (MUST‑FOLLOW)**
1. Use **visual motifs** (colours, weather, repeated object) in *Ki* & *Shō*; subvert it in *Ten*.  
2. *Ten*’s twist must arrive within **70%** of story length and be foreshadowed.  
3. No villain needed; tension arises from irony, perspective shift, or juxtaposition.  
4. In *Ketsu*, end on a lingering image that fuses the opening motif with new meaning—**do not** tack on a moral sentence.
`;

const FREYTAGS_PYRAMID_GUIDE = `
## 3. **Freytag’s Pyramid**

### **Step Outline**
1. Exposition  
2. Rising Action  
3. **Climax (Apex of tension)**  
4. Falling Action  
5. Denouement

### **Craft Checklist (MUST‑FOLLOW)**
1. Place the **climax at 60‑70 %** mark.  
2. Before the climax, include **two escalating hurdles** that specifically poke the protagonist’s flaw.  
3. Falling action should answer the *emotional* question first, plot question second.  
4. Denouement ≤ 3 paragraphs; finish on emotionally resonant image, not exposition.
`;

const HEROS_JOURNEY_GUIDE = `
## 4. **Hero’s Journey (Monomyth)**

> For grand or mythic arcs—condense stages for shorts.

### **Condensed 8‑Beat Short‑Story Map**
1. Ordinary World & Call  
2. Refusal + Mentor  
3. Crossing the Threshold  
4. Tests/Allies/Enemies  
5. **Ordeal**  
6. Reward  
7. Road Back  
8. Resurrection & Return

### **Craft Checklist (MUST‑FOLLOW)**
1. Combine **Refusal + Mentor** in one scene to save space.  
2. The **Ordeal** must force hero to confront flaw head‑on (sensory trio rule).  
3. Ensure **Reward** contains a *hidden cost* revealed during *Road Back*.  
4. Final “Return” scene must *show* changed behaviour in same location as opening.
`;

const BUT_THEREFORE_CHAIN_GUIDE = `
## 5. **“But, Therefore” Chain**

> A pacing algorithm rather than full structure—bolt onto any framework.

### **Usage**
- Replace “and then…” transitions with **“BUT…”** (obstacle) or **“THEREFORE…”** (consequence).

### **Craft Checklist**
1. Write outline as bullet chain; test every beat—if you can replace connector with “and then,” rewrite.  
2. Aim for **3–6** BUT/THEREFORE pairs in a short story.  
3. Final “THEREFORE” should trigger climax.
`;

const PIXAR_STORY_SPINE_GUIDE = `
## 6. **Pixar Story Spine**

### **Sentence Scaffold**
1. *Once upon a time …*  
2. *Every day …*  
3. *Until one day …*  
4. *Because of that …* (repeat 2‑3×)  
5. *Until finally …*  
6. *Ever since then …*

### **Craft Checklist (MUST‑FOLLOW)**
1. Opening two lines must spotlight hero’s routine **and** hint at flaw.  
2. Each “Because of that” must escalate stakes; last one pushes hero to toughest choice.  
3. “Until finally” = sacrifice moment; apply sensory trio.  
4. “Ever since then” = 1‑sentence echo of opening image, transformed.
`;

const CHEKHOVS_SKETCH_GUIDE = `
## 7. **Chekhov’s Sketch**

> Quiet, mood‑driven slice of life.

### **Core Elements**
- Inciting Impression (a fleeting moment)  
- Layered Reflection (memories, sensory flashes)  
- **Turn of Perception** (small internal shift)  
- Open‑Ended Fade

### **Craft Checklist (MUST‑FOLLOW)**
1. Keep plot minimal; tension lives in *implied* desire or regret.  
2. Use **specificity:** proper nouns, unique physical details.  
3. At the “Turn,” introduce a **single, concrete action** (e.g., closing a window) symbolising change.  
4. End with an *image,* not explanation—let reader infer meaning.
`;

// --- New Frameworks from .md file ---

const SAVE_THE_CAT_GUIDE = `
## Save the Cat! Beat Sheet

#### Step Outline (15 beats)
1. Opening Image  
2. Theme Stated  
3. Set-up  
4. Catalyst (≈ 12%)  
5. Debate  
6. Break into 2 (Act 2)  
7. B-Story  
8. Fun & Games  
9. Midpoint (50%)  
10. Bad Guys Close In  
11. All Is Lost (≈ 75%)  
12. Dark Night of the Soul  
13. Break into 3 (Act 3)  
14. Finale  
15. Final Image  

#### Craft Checklist (Must-Follow)
- State the **theme** in Beat 2 (≤ 15 words).  
- Provide three escalating **Fun & Games** set-pieces.  
- Include a **“whiff of death”** in All Is Lost.  
- Mirror the Opening Image in the Finale.
`;

const SEVEN_POINT_STRUCTURE_GUIDE = `
## Seven-Point Story Structure

#### Step Outline
1. Hook  
2. First Plot Point  
3. First Pinch (pressure)  
4. Midpoint (shift)  
5. Second Pinch (worst loss)  
6. Second Plot Point  
7. Resolution  

#### Craft Checklist (Must-Follow)
- Reveal protagonist’s **core flaw** in the Hook through action.  
- Each **Pinch** removes an ally or resource and doubles stakes.  
- Force an internal reversal at the **Midpoint**.  
- Echo the Hook image in the Resolution.
`;

const SNOWFLAKE_METHOD_GUIDE = `
## Snowflake Method (Iterative Expansion)

#### Step Outline (10 passes)
1. One-Sentence Summary  
2. One-Paragraph Blurb  
3. Character Summaries  
4. Expanded Synopsis (1 page)  
5. Character Deep-Dives (1 page each)  
6. Four-Page Story Synopsis  
7. Detailed Character Charts  
8. Scene-List Spreadsheet  
9. Full Narrative Description  
10. Draft Manuscript  

#### Craft Checklist (Must-Follow)
- Cap **Step 1** at 25 words: protagonist + conflict + hook.  
- After Step 4, add a **ticking clock** sentence.  
- Cut or merge scenes lacking conflict in Step 8.  
- Delay rich sensory detail until Step 9+.
`;

const FICHTEAN_CURVE_GUIDE = `
## Fichtean Curve (“Crisis Ladder”)

#### Step Outline
1. Inciting Incident  
2. Crisis 1  
3. Reflection / Mini-Resolution  
4. Crisis 2 (worse)  
5. Reflection  
6. Crisis 3 (worst)  
7. Climax  
8. Denouement  

#### Craft Checklist (Must-Follow)
- Begin **in medias res** within three paragraphs.  
- Each crisis **forces a new decision** that deepens the flaw.  
- Keep reflections under 150 words, ending on forward momentum.  
- Resolve the **emotional arc** before plot loose ends.
`;

const GRIMMS_FOREST_PATH_GUIDE = `
## Grimms’ Fairy-Tale Pattern (“Forest Path”)

#### Step Outline (12 beats)
1. Opening Formula (“Once upon a time…”)  
2. Protagonist’s Hardship or Desire  
3. Meeting the Supernatural  
4. Trial #1  
5. Trial #2  
6. Trial #3  
7. Descent / Darkest Peril  
8. Clever or Compassionate Act  
9. Magical Reward / Transformation  
10. Punishment of the Wrongdoer  
11. Moral Glimmer  
12. Closing Formula (“…and if they haven’t died…”)  

#### Craft Checklist (Must-Follow)
1. Add an archaic word every ~120 words (“thither”, “quoth”).  
2. Use the **rule of three** to escalate trials with a repeated motif.  
3. Hint at genuine peril—abandonment, dismemberment, or death.  
4. Give one line of dialogue to a **talking creature/object**.  
5. Describe the villain’s punishment in one vivid sentence.  
6. Finish with a moral ≤ 25 words.  
7. Target sentences ~15 % longer than default.
`;

const GRIMMS_WISH_MIRROR_GUIDE = `
## Grimms’ Wish-Mirror Pattern (“Rippled Lake”)

#### Step Outline (11 beats)
1. Opening Formula (“In days long vanished…”)  
2. Yearning Revealed  
3. Forbidden Bargain / Wish Granted  
4. First Boon  
5. Subtle Consequence  
6. Second Boon  
7. Dire Consequence (mirror twist)  
8. Third Boon  
9. Catastrophic Reversal  
10. Atonement or Cunning Escape  
11. Moral Echo  

#### Craft Checklist (Must-Follow)
1. Employ archaic verbs (“beseeched”, “abideth”).  
2. Reference **mirrors, water, or reflections** at least three times.  
3. Keep a triadic rhythm: three boons/wishes doubling stakes.  
4. Make final punishment the **inverse** of the desire.  
5. Let the granter speak one **rhymed couplet**.  
6. Include an unsettling tactile detail.  
7. Average sentence length ≈ 20 words.
`;

const GRIMMS_HIDDEN_BEAST_GUIDE = `
## Grimms’ Hidden-Beast Pattern (“Animal Bridegroom”)

#### Step Outline (12 beats)
1. Enchanted Beast Encounter  
2. Pact or Marriage under Condition  
3. Life with the Beast in Secrecy  
4. Forbidden Act / Broken Taboo  
5. Sudden Separation and Lament  
6. Quest for Lost Bridegroom  
7. Trio of Impossible Tasks  
8. Aid from Secret Helpers  
9. Disenchantment / True Form Revealed  
10. Reunion and Wedding Feast  
11. Humbling of Betrayer  
12. Moral of Constancy  

#### Craft Checklist (Must-Follow)
- Paint the beast in one vivid multi-sensory sentence.  
- Establish a strict **taboo** (no light, no questions, etc.).  
- Present exactly **three impossible tasks**, solved through kindness.  
- Transform the beast in a single, colorful paragraph.  
- Maintain romantic-gothic tone; no modern humor.  
- Close with a moral praising loyalty.
`;

const GRIMMS_SIBLING_QUEST_GUIDE = `
## Grimms’ Sibling-Quest Pattern (“Swans & Stars”)

#### Step Outline (12 beats)
1. Cursed Siblings Prologue  
2. Sole Survivor’s Rescue Vow  
3. Flight into the Wild Wood  
4. Meeting Benevolent Helper  
5. Gathering Painful Materials  
6. Silent Toil and Sacrifice  
7. Villain’s Interference  
8. Trial by Fire or Execution  
9. Final Moment of Transformation  
10. Liberation of Siblings  
11. Punishment of Malefactor  
12. Harmonious Reign  

#### Craft Checklist (Must-Follow)
- Repeat a sibling-bond phrase three times (“blood of my blood”).  
- Include one full scene of **silent suffering** (no dialogue).  
- Use vivid nature imagery: moonlit reeds, starlit wings.  
- Time the transformation with the execution stroke.  
- Mirror cruelty in the villain’s punishment.  
- End on a pastoral image of restored family.
`;

const GRIMMS_TRICKSTER_TRIUMPH_GUIDE = `
## Grimms’ Trickster-Triumph Pattern (“Clever Tailor”)

#### Step Outline (9 beats)
1. Humble Trickster Introduction  
2. Chance Boast or Deception  
3. Authority Imposes Task #1  
4. Wily Solution to Task #1  
5. Task #2 and Mischievous Fix  
6. Task #3 and Daring Bluff  
7. Rivals Turned on Each Other  
8. Reward (Marriage, Wealth, Kingdom)  
9. Winking Epilogue  

#### Craft Checklist (Must-Follow)
- Open with an archaic exclamation (“Gadzooks!”).  
- Ensure each trick fools both mighty and simple.  
- Use humorous hyperbole (“seven with one blow”).  
- Keep trickster’s methods mysterious.  
- Maintain brisk pace; no reflection > 100 words.  
- End on a playful wink to the reader.
`;

// --- Fable Framework (Aesop Style) ---
const FABLE_GUIDE = `
## Classical Fable Framework (Aesop Style)

> *A brief, moralistic tale with animal characters embodying human traits. Every element serves the lesson.*

### Structure (4 Beats)

1. **Opening Scene (The Setup)** — 80-120 words
   - Introduce 1-3 animal characters in a simple, natural setting
   - Each character represents a clear trait: wisdom, greed, pride, cleverness, humility
   - Show their contrasting personalities through ONE brief action or statement
   - Example: "A Crow sat upon a branch, holding cheese. A Fox saw and approached."

2. **The Conflict (The Test)** — 100-150 words
   - Present a simple problem, challenge, or temptation
   - The conflict directly tests the characters' defining traits
   - Stakes are proportionate: food, safety, status—not life or death
   - Make the test clear and immediate

3. **The Choice & Consequence** — 100-150 words
   - Characters choose different approaches based on their nature
   - Show immediate, direct consequences of each choice
   - Use explicit cause-and-effect: "Because X did Y, Z happened"
   - The virtuous choice leads to reward; the flawed choice leads to loss

4. **The Resolution & Moral** — 50-100 words
   - Conclude with clear outcomes for each character
   - State the moral lesson in final 1-2 sentences
   - Begin moral with "And so..." or "Thus..." or similar
   - The moral must feel earned by the preceding action

### Craft Checklist (MUST-FOLLOW)

1. **Target Length:** 400-500 words maximum. Fables must be concise—every sentence earns its place.

2. **Character Naming:** Use species with simple descriptors:
   - ✓ GOOD: "The Clever Fox", "A Proud Peacock", "The Humble Mouse"
   - ✗ AVOID: "Fennec the Firetail", "Sir Reginald Fluffington III"

3. **Language Register:**
   - Use clear, timeless language (no modern slang or references)
   - Sentence structure: declarative and direct
   - Dialogue: minimal and purposeful—only when advancing the moral point

4. **Anthropomorphism Balance:**
   - Animals think and speak like humans but retain physical nature
   - A mouse can be clever but remains small; an elephant remains strong
   - Use each animal's natural traits meaningfully (fox = cunning, ant = industrious)

5. **Moral Clarity:**
   - Lesson must be universal and applicable to children's lives
   - Themes: sharing, honesty, humility, wisdom, patience, kindness, hard work
   - Frame positively: "Hard work brings reward" over "Laziness leads to failure"

6. **Binary Outcome:** One character's approach succeeds; another's fails. This contrast reinforces the lesson.

7. **No Excessive Description:** Skip elaborate scenery, weather, or internal monologue. Describe only what advances the moral.

8. **Dialogue Tags:** Use only "said" or no tag when speaker is clear from context.

### Style Notes
- **Tone:** Earnest, straightforward, gently didactic
- **Pacing:** Steady and efficient; no meandering
- **Perspective:** Third-person omniscient narrator
- **Ending:** Must feel conclusive and satisfying within moral framework
- **Voice:** Timeless storyteller ("Once, in a faraway meadow...")

### Example Opening
> "A Crow sat upon a branch, holding a large piece of cheese in her beak. Along came a Fox, and he saw the cheese. 'What a beautiful bird you are,' said the Fox. 'Surely your voice must be as lovely as your feathers.'"

*This opening immediately establishes who, what, where, and the Fox's manipulative nature—all in three sentences.*
`;

// Learning Fable Framework - STEM concepts through fable structure
const LEARNING_FABLE_GUIDE = `
## Learning Fable Framework (STEM Education)

> A **hybrid framework** combining classical fable structure with STEM education. The "moral" is a scientific or mathematical principle.

### Structure (4 Beats)

1. **The Setup (Introduce the Problem):** (80-120 words)
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

### Craft Guide (MUST-FOLLOW)

1. **Target Length:** 400-550 words (slightly longer than pure fable for explanation)

2. **STEM Accuracy:** The science/math MUST be correct. Simplify, but don't falsify.

3. **Concept Introduction:**
   - SHOW before you TELL
   - Use animal's natural abilities to demonstrate (crow's beak, ant's strength, spider's web)
   - Avoid textbook language; use action and observation

4. **Age-Appropriate Vocabulary:**
   - Ages 4-6: Use analogies and comparisons ("as heavy as...")
   - Ages 7-9: Introduce one technical term with immediate context
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

### STEM Concept-to-Animal Matching

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

### Example Opening
> "Crow was thirsty. So, so thirsty. She found a tall pitcher with water at the bottom, but her beak couldn't reach. She tried tipping it—too heavy. She tried breaking it—too hard. Then she noticed the pebbles by the road..."

*This sets up the problem (thirst), shows failed attempts, and hints at the solution (displacement).*

### Style Notes
- **Tone:** Wonder-filled, curious, gently educational
- **Pacing:** Allow moments for discovery and realization
- **Ending:** Opens doors to more learning, not closure
`;


export const STORY_CRAFTING_GUIDES: Record<string, string> = {
    // Original frameworks
    "Dan Harmon's Story Circle": UNIVERSAL_CRAFT_STANDARDS + STORY_CIRCLE_GUIDE,
    "Three-Act Structure": UNIVERSAL_CRAFT_STANDARDS + THREE_ACT_STRUCTURE_GUIDE,
    "Kishōtenketsu": UNIVERSAL_CRAFT_STANDARDS + KISHOTENKETSU_GUIDE,
    "Freytag’s Pyramid": UNIVERSAL_CRAFT_STANDARDS + FREYTAGS_PYRAMID_GUIDE,
    "Hero’s Journey (Condensed)": UNIVERSAL_CRAFT_STANDARDS + HEROS_JOURNEY_GUIDE,
    "“But, Therefore” Chain": UNIVERSAL_CRAFT_STANDARDS + BUT_THEREFORE_CHAIN_GUIDE,
    "Pixar Story Spine": UNIVERSAL_CRAFT_STANDARDS + PIXAR_STORY_SPINE_GUIDE,
    "Chekhov’s Sketch": UNIVERSAL_CRAFT_STANDARDS + CHEKHOVS_SKETCH_GUIDE,
    // New Universal Frameworks
    "Save the Cat! Beat Sheet": UNIVERSAL_CRAFT_STANDARDS + SAVE_THE_CAT_GUIDE,
    "Seven-Point Story Structure": UNIVERSAL_CRAFT_STANDARDS + SEVEN_POINT_STRUCTURE_GUIDE,
    "Snowflake Method (Iterative Expansion)": UNIVERSAL_CRAFT_STANDARDS + SNOWFLAKE_METHOD_GUIDE,
    "Fichtean Curve (“Crisis Ladder”)": UNIVERSAL_CRAFT_STANDARDS + FICHTEAN_CURVE_GUIDE,
    // New Grimm's Frameworks
    "Grimms’ Fairy-Tale Pattern (“Forest Path”)": UNIVERSAL_CRAFT_STANDARDS + GRIMMS_FOREST_PATH_GUIDE,
    "Grimms’ Wish-Mirror Pattern (“Rippled Lake”)": UNIVERSAL_CRAFT_STANDARDS + GRIMMS_WISH_MIRROR_GUIDE,
    "Grimms’ Hidden-Beast Pattern (“Animal Bridegroom”)": UNIVERSAL_CRAFT_STANDARDS + GRIMMS_HIDDEN_BEAST_GUIDE,
    "Grimms’ Sibling-Quest Pattern (“Swans & Stars”)": UNIVERSAL_CRAFT_STANDARDS + GRIMMS_SIBLING_QUEST_GUIDE,
    "Grimms’ Trickster-Triumph Pattern (“Clever Tailor”)": UNIVERSAL_CRAFT_STANDARDS + GRIMMS_TRICKSTER_TRIUMPH_GUIDE,    // Fable Framework
    "Fable (Aesop Style)": UNIVERSAL_CRAFT_STANDARDS + FABLE_GUIDE,
    // Learning Fable Framework (STEM)
    "Learning Fable (STEM)": UNIVERSAL_CRAFT_STANDARDS + LEARNING_FABLE_GUIDE,
};

// Updated: Summaries for each framework
export const STORY_FRAMEWORK_SUMMARIES: Record<string, string> = {
    // Original summaries
    "Dan Harmon's Story Circle": "An 8-step circular journey focusing on a character leaving their comfort zone, facing challenges, and returning changed. Popularized by Dan Harmon.",
    "Three-Act Structure": "A classic model dividing a story into Setup (Act 1), Confrontation (Act 2), and Resolution (Act 3). Common in screenwriting and literature.",
    "Kishōtenketsu": "A four-act East Asian structure (Introduction, Development, Twist, Conclusion) that builds tension through contrast and surprise, often without direct conflict.",
    "Freytag’s Pyramid": "A five-part dramatic structure (Exposition, Rising Action, Climax, Falling Action, Denouement) visualizing plot development as a pyramid.",
    "Hero’s Journey (Condensed)": "A condensed version of Joseph Campbell's Monomyth, outlining a hero's adventure, ordeal, and transformation across key stages.",
    "“But, Therefore” Chain": "A pacing and plotting technique emphasizing cause-and-effect by connecting story beats with 'But' (introducing an obstacle) or 'Therefore' (showing a consequence).",
    "Pixar Story Spine": "A simple sentence-scaffold ('Once upon a time... Every day... Until one day...') that outlines a character-driven story arc with escalating stakes. Used by Pixar.",
    "Chekhov’s Sketch": "A short, impressionistic narrative focusing on mood, character insight, and a subtle internal shift, rather than a strong plot. Often open-ended.",
    // New summaries
    "Save the Cat! Beat Sheet": "A detailed 15-beat story structure, popular in screenwriting, that maps out key plot points from opening image to finale.",
    "Seven-Point Story Structure": "A plot structure focusing on two major turning points (Plot Points) and two pressure points (Pinches) that frame the story's Midpoint.",
    "Snowflake Method (Iterative Expansion)": "A design process for writing stories where you start with a single sentence and build it out into a full narrative through ten iterative passes.",
    "Fichtean Curve (“Crisis Ladder”)": "A plot structure that begins in the middle of the action and follows a character through a series of escalating crises, with brief moments of reflection, leading to a climax.",
    "Grimms’ Fairy-Tale Pattern (“Forest Path”)": "A classic fairy-tale template following a protagonist through hardship, a series of three trials, and a magical resolution, often with a clear moral.",
    "Grimms’ Wish-Mirror Pattern (“Rippled Lake”)": "A cautionary tale structure where a character's wishes are granted with increasingly dire, ironic consequences.",
    "Grimms’ Hidden-Beast Pattern (“Animal Bridegroom”)": "A romantic fairy-tale structure about a pact with an enchanted beast, a broken taboo, and a quest to restore the beast to their true form.",
    "Grimms’ Sibling-Quest Pattern (“Swans & Stars”)": "A fairy-tale framework centered on a protagonist's selfless quest and silent suffering to rescue their cursed siblings.",
    "Grimms’ Trickster-Triumph Pattern (“Clever Tailor”)": "A comedic fairy-tale pattern where a humble but witty protagonist overcomes impossible tasks through cleverness, bluffing, and trickery.",
    // Fable summary
    "Fable (Aesop Style)": "A short, moral tale with animal characters (400-500 words). Features a clear conflict and an explicit lesson. Based on classical Aesop tradition.",
    // Learning Fable summary
    "Learning Fable (STEM)": "A fable where the 'moral' is a science or math concept. Animal characters discover and apply STEM principles through experimentation. (~400-550 words)"
};

const guideKeys = Object.keys(STORY_CRAFTING_GUIDES).map(normalizeLookupKey).sort();
const summaryKeys = Object.keys(STORY_FRAMEWORK_SUMMARIES).map(normalizeLookupKey).sort();
if (guideKeys.join('\n') !== summaryKeys.join('\n')) {
    console.warn('Story framework guides and summaries have mismatched keys.');
}