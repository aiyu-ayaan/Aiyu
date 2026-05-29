import mongoose from 'mongoose';

const CronSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['system', 'user'],
        required: true,
        default: 'user'
    },
    schedule: {
        type: String,
        required: true,
        default: '0 0 * * *'
    },
    enabled: {
        type: Boolean,
        required: true,
        default: true
    },
    action: {
        type: String,
        required: true,
        enum: ['clean_unreferenced', 'migrate_webp', 'webhook']
    },
    webhookUrl: {
        type: String,
        trim: true,
        required: function() { return this.action === 'webhook'; }
    },
    webhookUrlType: {
        type: String,
        enum: ['fixed', 'expression'],
        default: 'fixed'
    },
    webhookMethod: {
        type: String,
        enum: ['GET', 'POST'],
        default: 'POST',
        required: function() { return this.action === 'webhook'; }
    },
    webhookHeaders: {
        type: [
            {
                key: { type: String, trim: true },
                value: { type: String, trim: true }
            }
        ],
        default: []
    },
    webhookHeadersType: {
        type: String,
        enum: ['fixed', 'expression'],
        default: 'fixed'
    },
    webhookBody: {
        type: String,
        trim: true
    },
    webhookBodyType: {
        type: String,
        enum: ['fixed', 'expression'],
        default: 'fixed'
    },
    webhookEnv: {
        type: [
            {
                key: { type: String, trim: true },
                value: { type: String, trim: true }
            }
        ],
        default: []
    },
    lastRun: {
        type: Date
    },
    lastRunStatus: {
        type: String,
        enum: ['success', 'failure']
    },
    lastRunLog: {
        type: String
    },
    nextRun: {
        type: Date
    },
    notificationEnabled: {
        type: Boolean,
        default: false
    },
    notificationOn: {
        type: String,
        enum: ['always', 'success', 'failure'],
        default: 'always'
    },
    retryEnabled: {
        type: Boolean,
        default: false
    },
    retryType: {
        type: String,
        enum: ['stable', 'exponential'],
        default: 'stable'
    },
    retryCount: {
        type: Number,
        default: 3,
        min: 1
    },
    retryDelay: {
        type: Number,
        default: 60,
        min: 1
    }
}, { timestamps: true });

export default mongoose.models.Cron || mongoose.model('Cron', CronSchema);
