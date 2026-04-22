
import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title for this blog post.'],
        maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    slug: {
        type: String,
        trim: true,
        default: '',
    },
    content: {
        type: String,
        required: [true, 'Please provide the content for this blog post.'],
    },
    image: {
        type: String,
        required: false,
    },
    imageAlt: {
        type: String,
        default: '',
        trim: true,
    },
    excerpt: {
        type: String,
        default: '',
        trim: true,
        maxlength: [320, 'Excerpt cannot be more than 320 characters'],
    },
    seoTitle: {
        type: String,
        default: '',
        trim: true,
        maxlength: [120, 'SEO title cannot be more than 120 characters'],
    },
    seoDescription: {
        type: String,
        default: '',
        trim: true,
        maxlength: [320, 'SEO description cannot be more than 320 characters'],
    },
    canonicalUrl: {
        type: String,
        default: '',
        trim: true,
    },
    keywords: {
        type: [String],
        default: [],
    },
    socialTitle: {
        type: String,
        default: '',
        trim: true,
        maxlength: [120, 'Social title cannot be more than 120 characters'],
    },
    socialDescription: {
        type: String,
        default: '',
        trim: true,
        maxlength: [320, 'Social description cannot be more than 320 characters'],
    },
    socialImage: {
        type: String,
        default: '',
        trim: true,
    },
    socialImageAlt: {
        type: String,
        default: '',
        trim: true,
    },
    noIndex: {
        type: Boolean,
        default: false,
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
    isAutomated: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Add indexes for frequently sorted/filtered queries
BlogSchema.index({ published: 1, createdAt: -1 });
BlogSchema.index({ createdAt: -1 });
BlogSchema.index({ slug: 1 });
BlogSchema.index({ updatedAt: -1 });
BlogSchema.index({ title: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Fix for Next.js HMR: delete the model if it exists to ensure new schema fields are picked up
if (mongoose.models.Blog) {
    delete mongoose.models.Blog;
}

export default mongoose.model('Blog', BlogSchema);
