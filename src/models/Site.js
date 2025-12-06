import mongoose from 'mongoose';

const SocialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, required: true }, // Store icon name as string
});

const SiteSchema = new mongoose.Schema(
  {
    socials: [SocialSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Site || mongoose.model('Site', SiteSchema);
