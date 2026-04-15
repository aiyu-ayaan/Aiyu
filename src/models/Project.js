import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, trim: true, default: '' },
        techStack: { type: [String], required: true },
        year: { type: String, required: true },
        status: { type: String, required: true },
        projectType: { type: String, required: true },
        description: { type: String, required: true },
        codeLink: { type: String, required: false },
        blogLink: { type: String, required: false },
        image: { type: String, required: false },
        displayOrder: { type: Number, required: false, default: 0 },
    },
    {
        timestamps: true,
    }
);

// Add index for sorted queries
ProjectSchema.index({ displayOrder: 1, year: -1 });
ProjectSchema.index({ updatedAt: -1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ slug: 1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
