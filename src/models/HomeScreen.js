import mongoose from 'mongoose';

const HomeScreenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    homeRoles: [{ type: String }],
    githubLink: { type: String, required: true },
    codeSnippets: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.HomeScreen || mongoose.model('HomeScreen', HomeScreenSchema);
