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
    }
}, { strict: false }); // Allow other fields to be added later if needed without strict validation issues initially

export default mongoose.models.Config || mongoose.model('Config', ConfigSchema);
