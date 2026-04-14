import mongoose from 'mongoose';

const GitHubSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        default: '',
        trim: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    includePrivate: {
        type: Boolean,
        default: false
    },
    sections: {
        showProfile: { type: Boolean, default: true },
        showStats: { type: Boolean, default: true },
        showContributions: { type: Boolean, default: true },
        showActivity: { type: Boolean, default: true },
        showRepositories: { type: Boolean, default: true },
        showRepoDistribution: { type: Boolean, default: true },
        showLanguages: { type: Boolean, default: true },
        showLiveCommit: { type: Boolean, default: true },
        showRadarChart: { type: Boolean, default: true }
    },
    hiddenRepos: {
        type: [String],
        default: []
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

GitHubSchema.index({ updatedAt: -1 });

// Force model recompilation to ensure schema changes (like sections) are picked up
if (mongoose.models.GitHub) {
    delete mongoose.models.GitHub;
}

const GitHub = mongoose.model('GitHub', GitHubSchema);

export default GitHub;
