import mongoose from 'mongoose';

const CronLogSchema = new mongoose.Schema({
    cronId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cron',
        required: true,
        index: true
    },
    cronName: {
        type: String,
        required: true,
        trim: true
    },
    action: {
        type: String,
        required: true,
        enum: ['clean_unreferenced', 'migrate_webp', 'webhook']
    },
    status: {
        type: String,
        required: true,
        enum: ['success', 'failure'],
        index: true
    },
    method: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        trim: true
    },
    log: {
        type: String,
        required: true
    },
    durationMs: {
        type: Number,
        default: 0
    },
    ranAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

CronLogSchema.index({ cronId: 1, ranAt: -1 });

export default mongoose.models.CronLog || mongoose.model('CronLog', CronLogSchema);
