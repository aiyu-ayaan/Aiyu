import mongoose from 'mongoose';

const NavLinkSchema = new mongoose.Schema({
    name: { type: String, required: true },
    href: { type: String, required: true },
    target: { type: String, required: false },
});

const ContactLinkSchema = new mongoose.Schema({
    name: { type: String, required: true },
    href: { type: String, required: true },
});

const HeaderSchema = new mongoose.Schema({
    navLinks: { type: [NavLinkSchema], required: true },
    contactLink: { type: ContactLinkSchema, required: true },
});

export default mongoose.models.Header || mongoose.model('Header', HeaderSchema);
