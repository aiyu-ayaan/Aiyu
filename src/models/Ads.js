import mongoose from 'mongoose';

const AdsSchema = new mongoose.Schema({
    adsenseEnabled: { type: Boolean, default: false },
    encryptedClientId: { type: String, select: false, default: '' },
    encryptedSlotId: { type: String, select: false, default: '' },
    adCount: { type: Number, default: 1, min: 1, max: 5 }
}, { timestamps: true });

export default mongoose.models.Ads || mongoose.model('Ads', AdsSchema);
