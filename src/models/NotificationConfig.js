import mongoose from 'mongoose';

const NotificationConfigSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: false
    },
    // Channels configuration
    ntfy: {
        enabled: { type: Boolean, default: false },
        serverUrl: { type: String, default: 'https://ntfy.sh' },
        topic: { type: String, default: '' },
        token: { type: String, default: '' }
    },
    telegram: {
        enabled: { type: Boolean, default: false },
        botToken: { type: String, default: '' },
        chatId: { type: String, default: '' }
    },
    discord: {
        enabled: { type: Boolean, default: false },
        webhookUrl: { type: String, default: '' }
    },
    // Trigger options (Linking)
    notifyOnContactMessage: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.models.NotificationConfig || mongoose.model('NotificationConfig', NotificationConfigSchema);
