
import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title for this blog post.'],
        maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    content: {
        type: String,
        required: [true, 'Please provide the content for this blog post.'],
    },
    image: {
        type: String,
        required: false,
    },
    tags: {
        type: [String],
        required: false,
    },
    date: {
        type: String,
        required: [true, 'Please provide a date.'],
    },
    published: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Fix for Next.js HMR: delete the model if it exists to ensure new schema fields are picked up
if (mongoose.models.Blog) {
    delete mongoose.models.Blog;
}

export default mongoose.model('Blog', BlogSchema);
