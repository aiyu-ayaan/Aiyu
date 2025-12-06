import mongoose from 'mongoose';

const NavLinkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  href: { type: String, required: true },
  target: { type: String },
});

const ContactLinkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  href: { type: String, required: true },
});

const HeaderSchema = new mongoose.Schema(
  {
    navLinks: [NavLinkSchema],
    contactLink: ContactLinkSchema,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Header || mongoose.model('Header', HeaderSchema);
