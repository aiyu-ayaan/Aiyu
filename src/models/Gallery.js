import mongoose from 'mongoose';

const GallerySchema = new mongoose.Schema({
    src: {
        type: String,
        required: [true, 'Please provide an image URL'],
    },
    thumbnail: {
        type: String,
        required: false, // Optional for backward compatibility
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        maxlength: [200, 'Description cannot be more than 200 characters'],
    },
    width: {
        type: Number,
        required: true,
    },
    height: {
        type: Number,
        required: true,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    order: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Optimize gallery list sorting and admin ordering updates.
GallerySchema.index({ isPinned: -1, order: 1, createdAt: -1 });
GallerySchema.index({ createdAt: -1 });

export default mongoose.models.Gallery || mongoose.model('Gallery', GallerySchema);
