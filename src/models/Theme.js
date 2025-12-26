import mongoose from 'mongoose';

// Color configuration schema for a single theme variant (light or dark)
const ColorConfigSchema = new mongoose.Schema({
    // Background Colors
    backgrounds: {
        primary: { type: String, required: true },
        secondary: { type: String, required: true },
        tertiary: { type: String, required: true },
        surface: { type: String, required: true },
        elevated: { type: String, required: true },
        hover: { type: String, required: true },
    },
    // Text Colors
    text: {
        primary: { type: String, required: true },
        secondary: { type: String, required: true },
        tertiary: { type: String, required: true },
        muted: { type: String, required: true },
        bright: { type: String, required: true },
    },
    // Accent Colors
    accents: {
        cyan: { type: String, required: true },
        cyanBright: { type: String, required: true },
        purple: { type: String, required: true },
        purpleDark: { type: String, required: true },
        purpleDarker: { type: String, required: true },
        pink: { type: String, required: true },
        pinkBright: { type: String, required: true },
        pinkHot: { type: String, required: true },
        orange: { type: String, required: true },
        orangeBright: { type: String, required: true },
    },
    // Border Colors
    borders: {
        primary: { type: String, required: true },
        secondary: { type: String, required: true },
        accent: { type: String, required: true },
        cyan: { type: String, required: true },
    },
    // Status Colors
    status: {
        error: { type: String, required: true },
        warning: { type: String, required: true },
        success: { type: String, required: true },
        info: { type: String, required: true },
    },
    // Syntax Highlighting Colors
    syntax: {
        comment: { type: String, required: true },
        keyword: { type: String, required: true },
        control: { type: String, required: true },
        function: { type: String, required: true },
        class: { type: String, required: true },
        string: { type: String, required: true },
        number: { type: String, required: true },
        variable: { type: String, required: true },
        property: { type: String, required: true },
        operator: { type: String, required: true },
        punctuation: { type: String, required: true },
    },
    // Shadow Colors
    shadows: {
        sm: { type: String, required: true },
        md: { type: String, required: true },
        lg: { type: String, required: true },
    },
    // Overlay Colors
    overlays: {
        bg: { type: String, required: true },
        hover: { type: String, required: true },
    },
}, { _id: false });

const ThemeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    isCustom: {
        type: Boolean,
        default: true,
    },
    isPredefined: {
        type: Boolean,
        default: false,
    },
    variants: {
        light: {
            type: ColorConfigSchema,
            required: true,
        },
        dark: {
            type: ColorConfigSchema,
            required: true,
        },
    },
    previewImage: {
        type: String,
        default: '',
    },
    author: {
        type: String,
        default: 'Admin',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Update the updatedAt timestamp before saving
ThemeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create slug from name if not provided
ThemeSchema.pre('validate', function (next) {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

export default mongoose.models.Theme || mongoose.model('Theme', ThemeSchema);
