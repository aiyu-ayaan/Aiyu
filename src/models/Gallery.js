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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Gallery || mongoose.model('Gallery', GallerySchema);
