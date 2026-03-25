/**
 * test-rita-phonemes.js
 *
 * Extracts every unique phoneme that RiTa produces for a large passage,
 * then compares against the phoneme list in sounds/README.md and reports
 * any that are missing.
 *
 * Usage:  node test-rita-phonemes.js
 */

const { RiTa: rita } = require('rita');

// ── The passage ──────────────────────────────────────────────────────────────

const PASSAGE = `
Beyond the western woodland, where the willow trees whisper in the twilight and the silver stream winds through moss covered stones, there stood an ancient village that did not appear on any ordinary map. The villagers who lived there spoke quietly of enchantment, of peculiar happenings, and of a distant mountain whose peak was often concealed beneath a permanent veil of shimmering cloud. It was said that within that mountain rested a forgotten kingdom, protected by a powerful charm that had endured for centuries.

Elinor, a curious and determined apprentice to the village apothecary, had grown up listening to these stories beside the fireside. While other children dreamed of tournaments and treasure, she wondered about the nature of spells, the structure of runes, and the peculiar properties of magical herbs that glowed faintly in the moonlight. Her grandmother had once explained that true magic was not merely a trick of illusion, but a delicate balance between intention, knowledge, and patience.

One evening, while cataloguing jars of powdered crystal and dried petals in the apothecary workshop, Elinor noticed a narrow compartment behind a crooked shelf. Hidden within it was a slender manuscript bound in pale leather and sealed with an intricate clasp of tarnished silver. The pages inside were filled with elegant script, diagrams of unfamiliar symbols, and instructions written in a language that appeared both ancient and precise. Some passages described transformations, while others referred to portals, protective enchantments, and the alignment of celestial constellations.

As she traced her finger along the parchment, she came upon a description of the mountain beyond the woodland. According to the manuscript, a concealed gateway could be revealed during the first full moon of winter, provided that a sequence of harmonic tones was produced in the correct order. These tones, it explained, would resonate with the crystalline veins beneath the earth and temporarily dissolve the barrier that shielded the hidden kingdom.

Determined to learn more, Elinor began her preparations immediately. She gathered fragments of quartz, polished obsidian, and a peculiar alloy that chimed softly when struck. By arranging these materials upon a wooden frame, she constructed a set of delicate chimes, each tuned to a slightly different pitch. The process required careful adjustment, as even the smallest variation could alter the resulting vibration.

On the appointed night, she ventured into the woodland, guided by the pale glow of phosphorescent fungi and the distant call of nocturnal birds. The air was unusually still, and the frost upon the grass glittered like scattered diamonds. When she reached the base of the mountain, she discovered a smooth expanse of stone that reflected the moonlight with an almost mirror like clarity.

With a steady breath, Elinor lifted the small mallet and struck the first chime. A pure note echoed across the valley, followed by another and then another, forming a sequence that seemed to linger in the air long after each vibration had ceased. The ground trembled faintly beneath her feet, and a network of luminous lines began to spread across the surface of the rock.

Gradually, the stone dissolved into a swirling curtain of mist, revealing an arched passageway that descended into the mountain interior. The walls of the corridor shimmered with embedded crystals, each emitting a gentle radiance that illuminated the path ahead. As she proceeded, Elinor noticed that the temperature remained constant, neither warm nor cold, as though the air itself had been enchanted.

At the end of the passage lay a vast chamber containing a silent city of slender towers and sweeping bridges. The architecture was unlike anything she had seen before, combining graceful curves with intricate geometric patterns. Fountains of liquid light flowed through narrow channels, and delicate vines of silver leaf clung to balconies that overlooked tranquil courtyards.

A figure emerged from the shadows, cloaked in garments that shifted colour with every movement. Their voice, when they spoke, carried the resonance of distant bells. They explained that the kingdom had withdrawn from the outside world to preserve its knowledge, fearing that its secrets might be misused by those who lacked wisdom or restraint. Yet they had anticipated that one day, a visitor guided by curiosity rather than greed would find the hidden gateway.

Elinor was invited to explore the city and to study within its grand library, where volumes of accumulated knowledge were arranged according to principles of harmony rather than chronology. She learned of protective wards that could shield entire forests, of restorative spells that could mend fractured stone, and of communication methods that relied on patterns of light rather than spoken words.

However, she was also warned that every enchantment carried a responsibility. Magic, they explained, was not an inexhaustible resource but a dynamic equilibrium that could be disrupted through careless use. To maintain balance, practitioners were required to observe strict disciplines and to consider the broader consequences of their actions.

After several days of study, Elinor returned to the village with a renewed sense of purpose. The manuscript was replaced within its hidden compartment, though she suspected that it would not remain concealed for long. As the seasons changed and the woodland prepared for the arrival of spring, she began to apply what she had learned, assisting with the restoration of weather damaged cottages and the cultivation of resilient crops.

In time, the villagers noticed subtle improvements in their surroundings. Streams ran clearer, harvests became more reliable, and even the oldest trees seemed to regain their vitality. Though few were aware of the source of these changes, they felt reassured by the quiet presence of possibility that now lingered in the air.

And so the ancient village continued to exist beyond the boundaries of ordinary maps, sustained by knowledge that was shared with care and guided by those who understood that true enchantment lies not in spectacle, but in harmony with the world itself.

Throughout history, the development of human civilisation has been shaped by a complex interaction of geography, technology, belief, and governance. Early societies often formed around reliable sources of fresh water, such as rivers and fertile floodplains, where agriculture could be sustained across successive seasons. The domestication of plants and animals allowed communities to establish permanent settlements, which in turn encouraged the construction of dwellings, storage facilities, and defensive structures.

As populations increased, systems of leadership became necessary to coordinate labour, manage resources, and resolve disputes. In some regions, authority was concentrated in the hands of hereditary rulers, while in others it was distributed among councils or assemblies. Written language emerged as a means of recording transactions, laws, and religious practices, enabling administrations to operate across larger territories than would otherwise have been possible.

Trade networks developed gradually, linking distant communities through the exchange of goods such as metals, textiles, spices, and ceramics. These interactions facilitated not only economic growth but also the transmission of ideas, including mathematical techniques, architectural methods, and philosophical concepts. Innovations in navigation and shipbuilding expanded the reach of maritime exploration, allowing merchants and travellers to cross previously inaccessible oceans.

During periods of imperial expansion, powerful states often absorbed neighbouring regions through conquest or diplomatic alliance. This process led to the integration of diverse cultures within single political frameworks, sometimes resulting in the construction of extensive road systems, aqueducts, and monumental public buildings. Such infrastructure projects required significant organisation and engineering expertise, reflecting an increasing understanding of materials and structural stability.

Religious institutions frequently played a central role in shaping social norms and educational practices. Monasteries, temples, and scholarly academies preserved manuscripts that might otherwise have been lost to time. In certain eras, religious authorities exercised considerable influence over legal codes and moral expectations, guiding behaviour through ritual and doctrine.

Technological progress accelerated during the late medieval and early modern periods, particularly with the refinement of printing techniques. The widespread availability of books and pamphlets contributed to rising literacy rates and encouraged public debate on matters of science, governance, and ethics. Intellectual movements emphasised observation and experimentation, challenging traditional explanations of natural phenomena.

Industrialisation introduced profound changes to patterns of employment and urban development. Mechanised production enabled factories to manufacture goods on an unprecedented scale, while advances in transportation reduced the time required to move raw materials and finished products between locations. Railways and steam powered vessels connected regions that had once been separated by formidable distances.

Political revolutions in various parts of the world sought to redefine the relationship between citizens and the state. Concepts such as representation, constitutional authority, and individual rights gained prominence, though their implementation varied considerably. Debates regarding suffrage, labour conditions, and educational access became increasingly prominent in legislative assemblies.

In the twentieth century, rapid advances in communication technology transformed the dissemination of information. Radio broadcasts, followed by television and digital networks, enabled events to be reported almost instantaneously. These developments influenced public perception of international affairs and contributed to the formation of global alliances.

Today, historians continue to examine artefacts, archival documents, and archaeological sites in order to reconstruct past events with greater accuracy. By analysing patterns of migration, economic exchange, and cultural adaptation, they seek to understand how earlier societies responded to environmental challenges and technological opportunities. This ongoing investigation provides valuable context for interpreting contemporary developments and anticipating future change.

Geography is concerned with the study of the Earth physical features, climate systems, natural resources, and the ways in which human populations interact with their environment. The surface of the planet is divided into continents, oceans, mountain ranges, river basins, and deserts, each of which has developed over millions of years through geological processes such as tectonic movement, volcanic activity, and erosion. These processes continue to reshape the landscape, sometimes gradually and sometimes through sudden events like earthquakes or landslides.

Climate varies significantly between regions due to differences in latitude, altitude, ocean currents, and prevailing wind patterns. Areas near the equator tend to receive more direct sunlight throughout the year, resulting in warmer temperatures and often higher levels of precipitation. In contrast, polar regions experience extended periods of darkness during winter months and lower average temperatures, which contribute to the formation of glaciers and ice sheets.

Rivers play an essential role in shaping the land as they transport sediment from higher elevations to lower plains. Over time, the movement of water can carve deep valleys and create floodplains that are highly fertile. These environments often support dense vegetation and provide favourable conditions for agriculture. Coastal regions are influenced by tidal patterns and wave action, which may lead to the formation of cliffs, beaches, or estuaries depending on the composition of the shoreline.

Human settlement patterns are closely linked to geographical features. Access to reliable water sources, arable land, and transportation routes has historically determined where towns and cities develop. Urban areas frequently expand along riverbanks, coastlines, or trade corridors, where economic activity can be sustained. However, such locations may also be vulnerable to environmental hazards, including flooding, storm surges, or soil erosion.

Vegetation zones, sometimes referred to as biomes, are determined by the interaction of temperature and rainfall. Tropical rainforests, temperate woodlands, grasslands, and tundra each support distinct communities of plants and animals adapted to their specific conditions. Changes in climate can alter these ecosystems, affecting biodiversity and the availability of natural resources.

Weather patterns are influenced by atmospheric circulation, which redistributes heat from equatorial regions towards the poles. High and low pressure systems move across the globe, bringing variations in temperature, cloud cover, and precipitation. Seasonal changes are often associated with the tilt of the Earth rotational axis, which affects the angle at which sunlight reaches different parts of the surface.

Soil composition varies according to the underlying rock type, organic content, and the degree of weathering that has occurred. Fertile soils are capable of supporting extensive agricultural production, while less productive soils may require careful management to prevent degradation. Sustainable land use practices aim to balance economic needs with environmental protection.

In recent decades, geographers have examined the impact of human activity on natural systems. Deforestation, urban expansion, and industrial development can alter drainage patterns, reduce habitat availability, and contribute to atmospheric pollution. By studying these interactions, researchers seek to identify strategies that minimise environmental damage while maintaining access to essential resources.

The distribution of natural hazards is also an important area of geographical study. Volcanic eruptions, earthquakes, hurricanes, and droughts can have significant social and economic consequences. Mapping these risks allows governments and communities to develop preparedness plans and improve resilience.

Through the analysis of maps, satellite imagery, and field observations, geography provides valuable insight into the dynamic relationship between people and the planet. Understanding these patterns is essential for planning infrastructure, managing resources, and adapting to future environmental change.

Notwithstanding the apparent simplicity of everyday communication, the English language possesses a remarkably intricate lexicon, replete with subtle distinctions, irregular orthography, and etymological anomalies that may confound even the most conscientious reader. Words derived from Latin, Greek, Germanic, and Romance origins frequently coexist within the same sentence, producing a hybridised vocabulary that reflects centuries of cultural interaction and linguistic evolution.

An individual attempting to articulate a comprehensive explanation may encounter terminology such as ubiquitous, ambiguous, or inconsequential, each of which conveys a specific nuance that cannot easily be substituted without diminishing the intended meaning. Furthermore, pronunciation does not always correspond intuitively with spelling. For example, the silent consonants in words like knight, subtle, and autumn demonstrate the persistence of historical forms that no longer influence modern speech.

The acquisition of advanced vocabulary often involves an appreciation of prefixes and suffixes that modify the root of a word. Terms such as biodegradable, interdisciplinary, and disproportionate illustrate how additional components can transform both grammatical function and semantic implication. In academic discourse, precision is frequently achieved through the use of specialised adjectives, including hypothetical, theoretical, or empirical, which differentiate between conjecture and evidence based reasoning.

Homophones present another challenge, as their identical pronunciation may disguise divergent meanings. Consider the distinction between stationary and stationery, or between principal and principle. Context becomes essential in determining the appropriate usage, particularly in formal writing where ambiguity could undermine clarity.

Certain polysyllabic constructions demand careful enunciation to ensure intelligibility. Words such as incomprehensible, misinterpretation, and institutionalisation require deliberate articulation, especially when spoken in rapid succession. Similarly, the presence of diphthongs and triphthongs in pronunciation may alter the rhythm of a sentence, influencing its overall cadence.

In literature, authors sometimes employ archaic or esoteric expressions to evoke a particular atmosphere or historical setting. Terms like whilst, henceforth, and notwithstanding may appear antiquated, yet they retain a degree of stylistic elegance. Conversely, contemporary usage may incorporate neologisms that arise from technological innovation or cultural exchange, reflecting the adaptive capacity of the language.

Mastery of complex vocabulary enables a speaker or writer to convey intricate ideas with economy and precision. However, excessive reliance on elaborate diction may impede accessibility, particularly for audiences unfamiliar with specialised terminology. Effective communication therefore involves a balance between sophistication and clarity.

Ultimately, the richness of English lies in its diversity of expression, offering innumerable possibilities for description, analysis, and persuasion. By engaging with challenging words and their varied pronunciations, learners develop not only their linguistic competence but also their ability to interpret nuanced meanings within different contexts.
`;

// ── Normalise helper (same logic as phonics.js) ─────────────────────────────

function normalizePhone(p) {
    return p.replace(/[0-2]$/g, '').toLowerCase();
}

// ── Phonemes currently documented in sounds/README.md ────────────────────────

const DOCUMENTED_PHONEMES = new Set([
    // Single phonemes
    'n', 't', 'b', 'd', 'f', 'g', 'hh', 'k', 'l', 'm', 'p', 'r', 's', 'v', 'w', 'y', 'z',
    'sh', 'ch', 'th', 'dh', 'ng', 'jh', 'zh',
    'ay', 'iy', 'uw', 'uh', 'ow', 'ey', 'ao', 'aw', 'oy',
    'ae', 'ah', 'ih', 'eh', 'er', 'aa',
    // Multi-phoneme clusters (as single file names)
    'sh ah n', 'zh ah n', 'k s', 'k w', 'aa r', 'ao r', 'ih r', 'eh r',
]);

// ── Main ─────────────────────────────────────────────────────────────────────

// Extract unique words (lowercase, alpha only)
const words = [...new Set(
    PASSAGE
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0)
)].sort();

console.log(`\n=== RiTa Phoneme Test ===\n`);
console.log(`Total unique words in passage: ${words.length}\n`);

const allPhonemes = new Set();
const wordPhonemeMap = {};
let failedWords = [];

for (const word of words) {
    const raw = rita.phones(word);
    if (!raw) {
        failedWords.push(word);
        continue;
    }
    const tokens = raw.split(/[-\s]+/g).filter(Boolean);
    const normalised = tokens.map(normalizePhone);
    wordPhonemeMap[word] = normalised;
    for (const ph of normalised) {
        allPhonemes.add(ph);
    }
}

const sortedPhonemes = [...allPhonemes].sort();

console.log(`Words that RiTa could not phonemise: ${failedWords.length}`);
if (failedWords.length > 0) {
    console.log(`  ${failedWords.join(', ')}`);
}
console.log();

console.log(`=== All ${sortedPhonemes.length} Unique Phonemes ===\n`);
console.log(sortedPhonemes.join(', '));
console.log();

// ── Compare against documented phonemes ──────────────────────────────────────

const missing = sortedPhonemes.filter(ph => !DOCUMENTED_PHONEMES.has(ph));
const extraDocs = [...DOCUMENTED_PHONEMES].filter(ph => !allPhonemes.has(ph)).sort();

console.log(`=== Comparison with sounds/README.md ===\n`);

if (missing.length === 0) {
    console.log(`✓ All phonemes found in the passage are already documented.`);
} else {
    console.log(`✗ ${missing.length} phoneme(s) found in text but MISSING from README:`);
    for (const ph of missing) {
        // Find example words
        const examples = Object.entries(wordPhonemeMap)
            .filter(([, phs]) => phs.includes(ph))
            .slice(0, 5)
            .map(([w]) => w);
        console.log(`  "${ph}"  — appears in: ${examples.join(', ')}`);
    }
}
console.log();

if (extraDocs.length > 0) {
    console.log(`ℹ ${extraDocs.length} documented phoneme(s) not encountered in this passage:`);
    console.log(`  ${extraDocs.join(', ')}`);
    console.log(`  (These may still be valid – just not triggered by this text.)`);
}
console.log();

// ── Detailed per-word dump (first 30 for brevity) ───────────────────────────

console.log(`=== Sample word → phonemes (first 30) ===\n`);
const sample = words.slice(0, 30);
const maxLen = Math.max(...sample.map(w => w.length));
for (const w of sample) {
    const phs = wordPhonemeMap[w];
    if (phs) {
        console.log(`  ${w.padEnd(maxLen + 2)} → ${phs.join(' · ')}`);
    } else {
        console.log(`  ${w.padEnd(maxLen + 2)} → (no phones)`);
    }
}
console.log();

// ── Output the missing list in a machine-readable way for easy README update ──

if (missing.length > 0) {
    console.log(`=== README Update Candidates ===\n`);
    console.log(`Add these rows to the phoneme table in sounds/README.md:\n`);
    for (const ph of missing) {
        const examples = Object.entries(wordPhonemeMap)
            .filter(([, phs]) => phs.includes(ph))
            .slice(0, 3)
            .map(([w]) => w);
        const exampleWord = examples[0] || '?';
        console.log(`| \`${ph}.mp3\` | ${ph} | **${exampleWord}** |`);
    }
    console.log();
}
