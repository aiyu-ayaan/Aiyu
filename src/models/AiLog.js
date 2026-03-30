import mongoose from 'mongoose';

const AiLogSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    model: { type: String, required: true },
    mode: { type: String, required: true },
    prompt: { type: String, required: false },
    response: { type: String, required: false },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
}, {
    timestamps: true
});

// Optimize recent log reads and provider-based analytics.
AiLogSchema.index({ createdAt: -1 });
AiLogSchema.index({ provider: 1, createdAt: -1 });

export default mongoose.models.AiLog || mongoose.model('AiLog', AiLogSchema);
