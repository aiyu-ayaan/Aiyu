import mongoose from 'mongoose';

const HomeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    homeRoles: { type: [String], required: true },
    githubLink: { type: String, required: true },
    codeSnippets: { type: [String], required: true },
});

export default mongoose.models.Home || mongoose.model('Home', HomeSchema);
