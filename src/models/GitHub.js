import mongoose from 'mongoose';

const GitHubSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
GitHubSchema.pre('save', function () {
    this.updatedAt = Date.now();
});

const GitHub = mongoose.models.GitHub || mongoose.model('GitHub', GitHubSchema);

export default GitHub;
