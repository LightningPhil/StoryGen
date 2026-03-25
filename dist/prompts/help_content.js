/**
 * Help Wiki Content
 * Each topic contains a title and HTML content for the help modal.
 */
export const HELP_TOPICS = {
    about: {
        title: "About StoryGen",
        content: `
            <h3>About StoryGen</h3>
            <p><strong>StoryGen</strong> was created by <strong>Phil Leichauer</strong> on 21 February 2026.</p>

            <p>The app was built to help Phil's daughter with reading — specifically to aid understanding and pronunciation of new words she encounters in stories. When you tap any word in a story, you can hear it spoken aloud, see its definition, and explore example sentences, all without leaving the page.</p>

            <p>StoryGen also began life as an experiment in doing something genuinely useful with AI agents. Rather than asking a single AI to write an entire story in one go, StoryGen uses a team of specialist agents that each handle one part of the writing process — much like a real publishing team:</p>

            <ol>
                <li>A <strong>Story Crafter</strong> writes the first draft from your characters and ideas</li>
                <li>An <strong>Elaborator</strong> enriches the draft with sensory details, dialogue, and emotion</li>
                <li>A <strong>Reviewer</strong> reads the story critically and provides feedback</li>
                <li>A <strong>Polisher</strong> rewrites the story incorporating the reviewer's suggestions</li>
                <li>A <strong>Cleaner</strong> tidies up any leftover formatting or notes</li>
                <li>A <strong>Titler</strong> gives the finished story a fitting title</li>
            </ol>

            <p>An optional <strong>Consolidator</strong> can step in to tighten wordy passages. The result is a story that feels considered and crafted rather than generated — one that children actually enjoy hearing at bedtime.</p>

            <div class="tip">
                <div class="tip-title">📖 Open Source</div>
                <p>StoryGen is released under the MIT License. It has zero dependencies — every line of code was written for this project.</p>
            </div>
        `
    },
    getting_started: {
        title: "Getting Started",
        content: `
            <h3>Getting Started with StoryGen</h3>
            <p>StoryGen is an AI-powered story generator that creates personalized stories using Google's Gemini AI. Follow these steps to create your first story:</p>
            
            <h4>1. Set Up Your API Key</h4>
            <p>Click the <strong>Settings</strong> (⚙️) icon and enter your Gemini API key. You can get a free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>
            
            <h4>2. Enter Your Characters</h4>
            <p>In the <strong>Characters</strong> field, describe who your story is about. Be as detailed as you like - names, personalities, relationships all help create richer stories.</p>
            
            <h4>3. Set Your Target Audience</h4>
            <p>Specify who the story is for (e.g., "children aged 5-7", "young adults", "bedtime story for toddlers"). This affects vocabulary, themes, and complexity.</p>
            
            <h4>4. Choose a Framework & Style</h4>
            <p>Select a <strong>Story Framework</strong> for narrative structure and an <strong>Authorial Style</strong> for voice and tone.</p>
            
            <h4>5. Generate Your Story</h4>
            <p>Click <strong>Generate Story</strong> and watch as the AI crafts your unique tale!</p>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>Your settings are automatically saved, so you can pick up right where you left off next time.</p>
            </div>
        `
    },
    characters: {
        title: "Characters",
        content: `
            <h3>Creating Compelling Characters</h3>
            <p>The Characters field is where you define who your story is about. The more detail you provide, the richer your story will be.</p>
            
            <h4>What to Include</h4>
            <ul>
                <li><strong>Names</strong> - Give your characters memorable names</li>
                <li><strong>Ages</strong> - Helps AI choose appropriate behaviors and dialogue</li>
                <li><strong>Personalities</strong> - Brave, curious, shy, mischievous, kind</li>
                <li><strong>Relationships</strong> - Best friends, siblings, parent and child</li>
                <li><strong>Special traits</strong> - Hobbies, fears, dreams, quirks</li>
            </ul>
            
            <h4>Examples</h4>
            <p><strong>Simple:</strong> "Luna, a curious 6-year-old girl, and her cat Whiskers"</p>
            <p><strong>Detailed:</strong> "Maya (8) is adventurous and loves space. Her younger brother Leo (5) is cautious but fiercely loyal. Their grandmother Nana tells the best stories and always carries peppermints."</p>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>Characters based on real family members or friends make stories extra special and personal!</p>
            </div>
        `
    },
    audience: {
        title: "Target Audience",
        content: `
            <h3>Setting Your Target Audience</h3>
            <p>The audience setting fundamentally shapes how your story is written, affecting vocabulary, sentence structure, themes, and content.</p>
            
            <h4>Age-Based Examples</h4>
            <ul>
                <li><strong>"Toddlers aged 2-3"</strong> - Very simple words, repetition, short sentences</li>
                <li><strong>"Children aged 4-6"</strong> - Simple vocabulary, clear plots, gentle themes</li>
                <li><strong>"Kids aged 7-10"</strong> - More complex plots, richer vocabulary</li>
                <li><strong>"Tweens aged 11-13"</strong> - Sophisticated themes, nuanced characters</li>
                <li><strong>"Young adults"</strong> - Complex narratives, mature themes</li>
            </ul>
            
            <h4>Context-Based Examples</h4>
            <ul>
                <li><strong>"Bedtime story for a 4-year-old"</strong> - Calming, gentle ending</li>
                <li><strong>"Educational story about sharing for kindergarteners"</strong></li>
                <li><strong>"Adventure story for reluctant readers aged 8-10"</strong></li>
            </ul>
            
            <h4>Reading Age Adjustment</h4>
            <p>Enable <strong>Adjust for Reading Age</strong> in the Options tab to fine-tune vocabulary complexity with a slider, independent of your target audience.</p>
        `
    },
    frameworks: {
        title: "Story Frameworks",
        content: `
            <h3>Story Frameworks</h3>
            <p>Frameworks provide the structural blueprint for your story. Each framework guides the AI on how to organize the narrative arc.</p>
            
            <h4>Available Frameworks</h4>
            <ul>
                <li><strong>Classic Three-Act</strong> - Traditional setup, confrontation, resolution</li>
                <li><strong>Hero's Journey</strong> - Epic adventure with transformation</li>
                <li><strong>Problem-Solution</strong> - Character faces and overcomes a challenge</li>
                <li><strong>Episodic Adventure</strong> - Connected mini-adventures</li>
                <li><strong>Circular Story</strong> - Ends where it began, with growth</li>
                <li><strong>Cumulative Tale</strong> - Building repetition (like "The House That Jack Built")</li>
            </ul>
            
            <h4>Choosing a Framework</h4>
            <p>Consider your audience and story length:</p>
            <ul>
                <li><strong>Young children</strong> - Circular or Cumulative (familiar, predictable)</li>
                <li><strong>Adventure seekers</strong> - Hero's Journey or Episodic</li>
                <li><strong>Life lessons</strong> - Problem-Solution or Classic Three-Act</li>
            </ul>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>Click the Framework button to see a description of each option before selecting.</p>
            </div>
        `
    },
    authorial_styles: {
        title: "Authorial Styles",
        content: `
            <h3>Authorial Styles</h3>
            <p>The Authorial Style determines the voice, tone, and literary qualities of your story. It's like choosing which author should narrate your tale.</p>
            
            <h4>Style Categories</h4>
            <ul>
                <li><strong>Classic Children's</strong> - Warm, engaging, age-appropriate</li>
                <li><strong>Whimsical & Playful</strong> - Fun wordplay, silly voices</li>
                <li><strong>Lyrical & Poetic</strong> - Beautiful language, imagery</li>
                <li><strong>Adventure & Action</strong> - Fast-paced, exciting</li>
                <li><strong>Gentle & Soothing</strong> - Perfect for bedtime</li>
                <li><strong>Educational</strong> - Weaves in learning naturally</li>
            </ul>
            
            <h4>Fine-Tuning Options</h4>
            <p>After selecting a style, you can fine-tune with:</p>
            <ul>
                <li><strong>Tone</strong> - Adjust the overall mood (calm, playful, mysterious)</li>
                <li><strong>Pacing</strong> - Control story speed and rhythm</li>
                <li><strong>Humor Style</strong> - Add specific types of comedy</li>
                <li><strong>Emotional Journey</strong> - Shape the emotional arc</li>
            </ul>
        `
    },
    plot_points: {
        title: "Plot Points",
        content: `
            <h3>Using Plot Points</h3>
            <p>Plot Points let you guide the story in specific directions while still letting the AI be creative.</p>
            
            <h4>How to Use</h4>
            <ol>
                <li>Enable <strong>Include specific plot points</strong> in the Options tab</li>
                <li>Enter key events or elements you want in the story</li>
                <li>The AI will incorporate these naturally into the narrative</li>
            </ol>
            
            <h4>Effective Plot Points</h4>
            <ul>
                <li><strong>Key events:</strong> "They discover a hidden treehouse"</li>
                <li><strong>Challenges:</strong> "The bridge is broken and they must find another way"</li>
                <li><strong>Items:</strong> "A magical compass that only works at night"</li>
                <li><strong>Moments:</strong> "A heartfelt apology between the friends"</li>
                <li><strong>Endings:</strong> "They return home just in time for dinner"</li>
            </ul>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>Use bullet points or numbered lists for multiple plot points. The AI will weave them together in order.</p>
            </div>
        `
    },
    settings_config: {
        title: "Settings",
        content: `
            <h3>Settings Configuration</h3>
            <p>Access settings by clicking the ⚙️ icon in the header.</p>
            
            <h4>API Key</h4>
            <p>Your Gemini API key is required to generate stories. Get one free from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>
            
            <h4>AI Model</h4>
            <p>Choose which Gemini model to use:</p>
            <ul>
                <li><strong>Gemini 2.0 Flash</strong> - Fast, efficient, great for most stories</li>
                <li><strong>Gemini 2.5 Flash</strong> - Latest model with improved quality</li>
                <li><strong>Gemini 2.5 Pro</strong> - Most capable, best for complex stories</li>
            </ul>
            
            <h4>API Rate Limiting</h4>
            <p>Minimum seconds between API calls. Increase if you encounter rate limit errors.</p>
            
            <h4>Reading Age Range</h4>
            <p>Set the min/max for the reading age slider in the Options tab.</p>
            
            <h4>Agent Thinking Modes</h4>
            <p>Enable "thinking" for individual AI agents. Thinking mode produces higher quality output but uses more tokens. Only available with compatible models.</p>
        `
    },
    agents: {
        title: "AI Agents",
        content: `
            <h3>Understanding AI Agents</h3>
            <p>StoryGen uses a pipeline of specialized AI agents, each with a specific role in crafting your story.</p>
            
            <h4>The Agent Pipeline</h4>
            <ol>
                <li><strong>Story Crafter</strong> - Creates the initial story draft based on your inputs</li>
                <li><strong>Elaborator</strong> - Expands descriptions, enriches dialogue, adds sensory details</li>
                <li><strong>Reviewer</strong> - Checks for consistency, age-appropriateness, and plot holes</li>
                <li><strong>Polisher</strong> - Refines prose, improves flow, enhances language</li>
                <li><strong>Cleaner</strong> - Final pass: removes artifacts, fixes formatting</li>
                <li><strong>Titler</strong> - Creates an engaging, appropriate title</li>
            </ol>
            
            <h4>Consolidator Agent</h4>
            <p>Enable <strong>Use Story Consolidator</strong> in the Options tab for longer stories. This agent manages context across the pipeline to maintain consistency.</p>
            
            <h4>Thinking Mode</h4>
            <p>In Settings, you can enable "thinking" for each agent. This allows the AI to reason through its task before responding, improving quality at the cost of more tokens.</p>
        `
    },
    keyboard_shortcuts: {
        title: "Keyboard Shortcuts",
        content: `
            <h3>Keyboard Shortcuts</h3>
            <p>Speed up your workflow with these keyboard shortcuts:</p>
            
            <h4>Story Controls</h4>
            <ul>
                <li><code>Ctrl + Enter</code> - Generate story</li>
                <li><code>Ctrl + S</code> - Save story to file</li>
                <li><code>Ctrl + C</code> - Copy story (when story area focused)</li>
            </ul>
            
            <h4>Interface</h4>
            <ul>
                <li><code>Ctrl + +</code> - Increase font size</li>
                <li><code>Ctrl + -</code> - Decrease font size</li>
                <li><code>Escape</code> - Close any open modal</li>
            </ul>
            
            <h4>Advanced</h4>
            <ul>
                <li><code>Ctrl + Shift + R</code> - Reset all data (preserves API key)</li>
            </ul>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>The font size buttons (+/-) in the story area also have these shortcuts for quick access.</p>
            </div>
        `
    },
    tips_tricks: {
        title: "Tips & Tricks",
        content: `
            <h3>Tips & Tricks for Better Stories</h3>
            
            <h4>Character Tips</h4>
            <ul>
                <li>Include character flaws - they make stories more interesting</li>
                <li>Define relationships between characters</li>
                <li>Give characters specific goals or dreams</li>
            </ul>
            
            <h4>Audience Tips</h4>
            <ul>
                <li>Be specific: "anxious 6-year-old at bedtime" works better than just "child"</li>
                <li>Mention context: "reluctant reader" or "loves dinosaurs"</li>
            </ul>
            
            <h4>Quality Tips</h4>
            <ul>
                <li>Use the Consolidator for stories over 1000 words</li>
                <li>Enable thinking mode for the Reviewer and Polisher agents</li>
                <li>Try different framework + style combinations</li>
            </ul>
            
            <h4>Troubleshooting</h4>
            <ul>
                <li><strong>Story too short?</strong> Add more plot points or use "Elaborate" style</li>
                <li><strong>Wrong tone?</strong> Fine-tune with Tone and Emotion settings</li>
                <li><strong>Vocabulary too hard?</strong> Enable Reading Age adjustment</li>
                <li><strong>Rate limit errors?</strong> Increase API interval in Settings</li>
            </ul>
            
            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>Save stories you love! Click the download button to save as a text file.</p>
            </div>
        `
    },
    troubleshooting: {
        title: "Troubleshooting",
        content: `
            <h3>Troubleshooting Common Issues</h3>
            
            <h4>API Key Issues</h4>
            <p><strong>Problem:</strong> "Invalid API key" error</p>
            <ul>
                <li>Check that your API key is entered correctly in Settings</li>
                <li>Ensure there are no extra spaces before or after the key</li>
                <li>Verify your API key is active at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a></li>
            </ul>
            
            <h4>Rate Limiting</h4>
            <p><strong>Problem:</strong> "Rate limit exceeded" or "429" errors</p>
            <ul>
                <li>Increase the API interval in Settings (try 3-5 seconds)</li>
                <li>Wait a few minutes before generating another story</li>
                <li>Consider using a different model</li>
            </ul>
            
            <h4>Generation Issues</h4>
            <p><strong>Problem:</strong> Story generation stuck or fails</p>
            <ul>
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Use <code>Ctrl + Shift + R</code> to reset (preserves API key)</li>
            </ul>
            
            <h4>Display Issues</h4>
            <p><strong>Problem:</strong> UI looks broken or misaligned</p>
            <ul>
                <li>Try toggling between light and dark mode</li>
                <li>Clear browser cache and reload</li>
                <li>Try a different browser (Chrome or Firefox recommended)</li>
            </ul>
        `
    },
    gemini_api_key: {
        title: "Getting a Gemini API Key",
        content: `
            <h3>How to Get a Gemini API Key</h3>
            <p>StoryGen uses Google's Gemini AI to generate stories. You'll need a free API key to get started. Here's a detailed step-by-step guide.</p>

            <h4>Step 1: Sign in to Google</h4>
            <p>You'll need a Google account (the same kind you use for Gmail or YouTube). If you don't have one, create one at <a href="https://accounts.google.com/signup" target="_blank" rel="noopener">accounts.google.com</a>.</p>

            <h4>Step 2: Go to Google AI Studio</h4>
            <p>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener"><strong>aistudio.google.com/app/apikey</strong></a>. This is Google's free tool for managing AI API keys.</p>

            <h4>Step 3: Create an API Key</h4>
            <ol>
                <li>Click the <strong>"Create API Key"</strong> button</li>
                <li>If prompted, select a Google Cloud project (or let it create one for you — the default is fine)</li>
                <li>A long string of letters and numbers will appear — this is your API key</li>
                <li>Click the <strong>copy</strong> button next to the key to copy it to your clipboard</li>
            </ol>

            <h4>Step 4: Paste the Key into StoryGen</h4>
            <ol>
                <li>In StoryGen, click the <strong>Settings</strong> icon (⚙️) in the top-left corner</li>
                <li>Paste your API key into the <strong>"Gemini API Key"</strong> field</li>
                <li>Click <strong>"Save & Close"</strong></li>
                <li>You're ready to generate stories!</li>
            </ol>

            <h4>Is It Free?</h4>
            <p>Yes! Google offers a generous free tier for the Gemini API. For typical story generation use (a few stories a day), you're unlikely to ever hit the free limits. The free tier includes:</p>
            <ul>
                <li>Multiple requests per minute</li>
                <li>No credit card required</li>
                <li>Access to the latest Gemini models</li>
            </ul>

            <h4>Keeping Your Key Safe</h4>
            <ul>
                <li>Your API key is stored <strong>only in your browser's local storage</strong> — it's never sent anywhere except directly to Google's API</li>
                <li>Don't share your API key publicly (e.g., in screenshots or social media)</li>
                <li>If you think your key has been compromised, go back to AI Studio and delete it, then create a new one</li>
            </ul>

            <div class="tip">
                <div class="tip-title">💡 Tip</div>
                <p>If you get an "Invalid API key" error, double-check that you copied the entire key with no extra spaces. You can also try creating a fresh key in AI Studio.</p>
            </div>
        `
    }
};
export const HELP_TOPIC_ORDER = [
    'about',
    'getting_started',
    'gemini_api_key',
    'characters',
    'audience',
    'frameworks',
    'authorial_styles',
    'plot_points',
    'settings_config',
    'agents',
    'keyboard_shortcuts',
    'tips_tricks',
    'troubleshooting'
];
//# sourceMappingURL=help_content.js.map