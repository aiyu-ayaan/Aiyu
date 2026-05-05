import mongoose from 'mongoose';

const AdsSchema = new mongoose.Schema({
    adsenseEnabled: { type: Boolean, default: false },
    encryptedClientId: { type: String, select: false, default: '' },
    placements: {
        top: {
            enabled: { type: Boolean, default: false },
            encryptedSlotId: { type: String, select: false, default: '' },
            adType: { type: String, default: 'display' },
            adLayoutKey: { type: String, default: '' }
        },
        middle: {
            enabled: { type: Boolean, default: false },
            encryptedSlotId: { type: String, select: false, default: '' },
            adType: { type: String, default: 'display' },
            adLayoutKey: { type: String, default: '' }
        },
        bottom: {
            enabled: { type: Boolean, default: false },
            encryptedSlotId: { type: String, select: false, default: '' },
            adType: { type: String, default: 'display' },
            adLayoutKey: { type: String, default: '' }
        },
        sidebar: {
            enabled: { type: Boolean, default: false },
            encryptedSlotId: { type: String, select: false, default: '' },
            adType: { type: String, default: 'display' },
            adLayoutKey: { type: String, default: '' }
        },
        footer: {
            enabled: { type: Boolean, default: false },
            encryptedSlotId: { type: String, select: false, default: '' },
            adType: { type: String, default: 'display' },
            adLayoutKey: { type: String, default: '' }
        }
    }
}, { timestamps: true });

export default mongoose.models.Ads || mongoose.model('Ads', AdsSchema);
