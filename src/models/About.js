import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value for skill level'
    }
  },
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
  cgpa: { type: String, required: true },
});

const CertificationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issuer: { type: String, required: true },
  date: { type: String, required: true },
  url: { type: String },
  skills: [{ type: String }],
});

const AboutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    roles: [{ type: String }],
    professionalSummary: { type: String, required: true },
    skills: [SkillSchema],
    experiences: [ExperienceSchema],
    education: [EducationSchema],
    certifications: [CertificationSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.About || mongoose.model('About', AboutSchema);
