import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Optimize admin inbox ordering and read-state filtering.
ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ read: 1, createdAt: -1 });

// Force model recompilation if it exists, to pick up schema changes in dev
if (mongoose.models.ContactMessage) {
    delete mongoose.models.ContactMessage;
}

export default mongoose.model('ContactMessage', ContactMessageSchema);
