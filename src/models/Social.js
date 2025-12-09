import mongoose from 'mongoose';

const SocialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    iconName: { type: String, required: true }, // Store icon name as string (e.g., "FaGithub")
});

export default mongoose.models.Social || mongoose.model('Social', SocialSchema);
