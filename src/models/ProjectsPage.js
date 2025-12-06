import mongoose from 'mongoose';

const ProjectsPageSchema = new mongoose.Schema(
  {
    roles: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ProjectsPage || mongoose.model('ProjectsPage', ProjectsPageSchema);
