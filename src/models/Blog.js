
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
}, { timestamps: true });

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema);
