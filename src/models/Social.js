import mongoose from 'mongoose';

const SocialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    iconName: { type: String, required: true }, // Store icon name as string (e.g., "FaGithub")
    isHidden: { type: Boolean, default: false }, // Control visibility
});

// Force model recompilation if it exists, to pick up schema changes in dev
if (mongoose.models.Social) {
    delete mongoose.models.Social;
}

export default mongoose.model('Social', SocialSchema);
