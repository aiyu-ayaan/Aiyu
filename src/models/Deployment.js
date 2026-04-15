import mongoose from 'mongoose';

const DeploymentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, trim: true, default: '' },
        techStack: { type: [String], required: true, default: [] },
        status: { type: String, required: true, trim: true, default: 'Live' },
        appType: { type: String, required: true, trim: true },
        environment: { type: String, required: true, trim: true, default: 'Production' },
        hostingProvider: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        hostedUrl: { type: String, required: false, trim: true },
        blogLink: { type: String, required: false, trim: true },
        image: { type: String, required: false, trim: true },
        displayOrder: { type: Number, required: false, default: 0 },
    },
    {
        timestamps: true,
    }
);

DeploymentSchema.index({ displayOrder: 1, updatedAt: -1 });
DeploymentSchema.index({ createdAt: -1 });
DeploymentSchema.index({ slug: 1 });

export default mongoose.models.Deployment || mongoose.model('Deployment', DeploymentSchema);
