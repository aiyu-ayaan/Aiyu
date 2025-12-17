import mongoose from 'mongoose';

const ConfigSchema = new mongoose.Schema({
    n8nWebhookUrl: { type: String, required: false, default: '' },
    resume: {
        type: { type: String, enum: ['url', 'file'], default: 'url' },
        value: { type: String, default: '' },
        filename: { type: String, default: '' }
    },
    logoText: { type: String, default: '< aiyu />' },
    siteTitle: { type: String, default: '' },
    favicon: {
        value: { type: String, default: '' }, // Base64
        filename: { type: String, default: '' },
        mimeType: { type: String, default: '' }
    },
    projectsTitle: { type: String, default: 'Projects Portfolio' },
    projectsSubtitle: { type: String, default: 'A collection of my work' },
    blogsTitle: { type: String, default: 'Latest Insights' },
    blogsSubtitle: { type: String, default: 'Thoughts, tutorials, and updates on web development and technology.' },
    galleryTitle: { type: String, default: 'Gallery' },
    gallerySubtitle: { type: String, default: 'A visual journey through my lens.' },
    googleAnalyticsId: { type: String, default: '' }
}, { strict: false }); // Allow other fields to be added later if needed without strict validation issues initially

export default mongoose.models.Config || mongoose.model('Config', ConfigSchema);
