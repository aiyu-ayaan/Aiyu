import mongoose from 'mongoose';

const HomeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    homeRoles: { type: [String], required: true },
    githubLink: { type: String, required: true },
    codeSnippets: { type: [String], required: true },
    // New fields for Futuristic Resume
    resumeStatus: { type: String, default: 'ONLINE' },
    resumeMode: { type: String, default: 'DEV_01' },
    resumeIcon: { type: String, default: 'FaBolt' }, // FaBolt, FaCode, etc.
});

export default mongoose.models.Home || mongoose.model('Home', HomeSchema);
