import mongoose from 'mongoose';

const ConfigSchema = new mongoose.Schema({
    n8nWebhookUrl: { type: String, required: false, default: '' },
    n8nWebhookAuthKey: { type: String, required: false, default: '' },
    n8nWebhookEnabled: { type: Boolean, required: false, default: true },
    resume: {
        type: { type: String, enum: ['url', 'file'], default: 'url' },
        value: { type: String, default: '' },
        filename: { type: String, default: '' }
    },
    logoText: { type: String, default: '< aiyu />' },
    siteTitle: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    favicon: {
        value: { type: String, default: '' }, // Base64
        filename: { type: String, default: '' },
        mimeType: { type: String, default: '' }
    },
    projectsTitle: { type: String, default: 'Projects Portfolio' },
    projectsSubtitle: { type: String, default: 'A collection of my work' },
    blogsTitle: { type: String, default: 'Latest Insights' },
    blogsSubtitle: { type: String, default: 'Thoughts, tutorials, and updates on web development and technology.' },
    isBlogAutomated: { type: Boolean, default: false },
    blogAutomationMessage: { type: String, default: 'Automated via API' },
    galleryTitle: { type: String, default: 'Gallery' },
    gallerySubtitle: { type: String, default: 'A visual journey through my lens.' },
    googleAnalyticsId: { type: String, default: '' },
    contactLocation: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactStatus: { type: String, default: 'Open to opportunities' },
    defaultTimezone: { type: String, default: 'UTC' },

    // Footer Configuration
    footerText: { type: String, default: '© 2025 Ayaan Ansari. All rights reserved.' },
    footerText2: { type: String, default: 'Made with ❤️ by Ayaan' },
    showWorkStatus: { type: Boolean, default: true },
    workStatus: { type: String, default: 'Available for work' },
    footerVersion: { type: String, default: 'v1.0.0' },
    footerVersionLink: { type: String, default: '' },

    // Theme Management
    activeTheme: { type: String, default: 'vs-code-dark' },
    activeThemeVariant: { type: String, enum: ['light', 'dark'], default: 'dark' },
    allowThemeSwitching: { type: Boolean, default: true },
    perPageThemes: {
        enabled: { type: Boolean, default: false },
        pages: { type: Map, of: String, default: {} }
    },

    // Terminal Configuration
    terminal: {
        username: { type: String, default: 'guest' },
        promptSymbol: { type: String, default: '➜' },
        welcomeMessage: { type: String, default: '' },
        showDate: { type: Boolean, default: true },
        showGitBranch: { type: Boolean, default: true },
        asciiArts: [{
            name: { type: String },
            art: { type: String }
        }]
    },

    // Secure Data
    encryptedGithubToken: { type: String, select: false },
    encryptedGeminiApiKey: { type: String, select: false },
    encryptedGroqApiKey: { type: String, select: false },
    encryptedOpenRouterApiKey: { type: String, select: false },
    blogApiTokenHash: { type: String, default: '', select: false },
    blogApiTokenLast4: { type: String, default: '' },
    blogApiTokenCreatedAt: { type: Date, default: null },

    // AI Configuration
    ai: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, enum: ['gemini', 'groq', 'openrouter'], default: 'gemini' },
        model: { type: String, default: 'gemini-1.5-flash' },
        models: {
            gemini: { type: String, default: '' },
            groq: { type: String, default: '' },
            openrouter: { type: String, default: '' }
        },
        enabledProviders: { type: [String], default: ['gemini'] },
        systemInstruction: { type: String, default: 'You are a helpful assistant for the portfolio admin.' }
    }
}, { strict: false }); // Allow other fields to be added later if needed without strict validation issues initially

export default mongoose.models.Config || mongoose.model('Config', ConfigSchema);
