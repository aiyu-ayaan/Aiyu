import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    level: { type: Number, required: true },
});

const ExperienceSchema = new mongoose.Schema({
    company: { type: String, required: true },
    role: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: String, required: true },
});

const EducationSchema = new mongoose.Schema({
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    duration: { type: String, required: true },
    cgpa: { type: String, required: false },
});

const CertificationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    date: { type: String, required: true },
    url: { type: String, required: false },
    skills: { type: [String], required: false },
});

const AboutSchema = new mongoose.Schema({
    name: { type: String, required: true },
    roles: { type: [String], required: true },
    professionalSummary: { type: String, required: true },
    skills: { type: [SkillSchema], required: true },
    experiences: { type: [ExperienceSchema], required: true },
    education: { type: [EducationSchema], required: true },
    certifications: { type: [CertificationSchema], required: true },
});

export default mongoose.models.About || mongoose.model('About', AboutSchema);
