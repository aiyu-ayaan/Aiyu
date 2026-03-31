import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    techStack: { type: [String], required: true },
    year: { type: String, required: true },
    status: { type: String, required: true },
    projectType: { type: String, required: true },
    description: { type: String, required: true },
    codeLink: { type: String, required: false },
    image: { type: String, required: false },
    displayOrder: { type: Number, required: false, default: 0 },
});

// Add index for sorted queries
ProjectSchema.index({ displayOrder: 1, year: -1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
