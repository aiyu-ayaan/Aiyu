import mongoose from 'mongoose';

const CronEnvSchema = new mongoose.Schema({
    env: {
        type: [
            {
                key: { type: String, trim: true },
                value: { type: String, trim: true }
            }
        ],
        default: []
    }
}, { timestamps: true });

export default mongoose.models.CronEnv || mongoose.model('CronEnv', CronEnvSchema);
