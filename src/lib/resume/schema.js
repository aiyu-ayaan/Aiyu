/**
 * Resume Tailoring Hub — data model, defaults, and normalization.
 *
 * The ResumeBuilder singleton holds ONE master CV `schema` plus N tailored
 * `profiles`. A profile never copies content; it only HIDES items/bullets and
 * overrides the tagline/summary/section-order. New content therefore appears in
 * every profile by default, and a fresh profile is the full CV which you trim
 * per role. See resolveProfile.js for how a profile collapses to a render model.
 */

// Section keys in their canonical identity. `summary` is a single text block;
// the rest are item lists. Order here is irrelevant — DEFAULT_SECTION_ORDER and
// each profile's `sectionOrder` decide what actually renders.
export const SECTION_KEYS = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications'];

// Default render order mirrors the source LaTeX resume.
export const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications'];

// Human titles drawn on the PDF / preview.
export const SECTION_TITLES = {
  summary: 'Professional Summary',
  experience: 'Professional Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Technical Skills',
  certifications: 'Certifications',
};

// Sections whose items carry a `bullets` array (bullet-level toggling applies).
export const BULLET_SECTIONS = ['experience', 'projects'];

/** Short, collision-resistant id for new items/bullets/profiles. */
export function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

const b = (id, text) => ({ id, text });

/**
 * Factory for a brand-new builder document, pre-seeded with the owner's real
 * CV (extracted from the previous resume.pdf) and one "Default" profile that
 * shows the entire CV. Used by the seed script and as the lazy default when the
 * singleton has never been saved.
 */
export function createDefaultResumeData() {
  const schema = {
    basics: {
      name: 'Ayaan Ansari',
      title: 'Mobile Android Developer',
      location: 'Mumbai, Maharashtra',
      phone: '626-899-3859',
      email: 'ayaan35200@gmail.com',
      linkedin: 'linkedin.com/in/aiyu',
      github: 'github.com/aiyu-ayaan',
      website: '',
    },
    summary:
      'Work with C#, Azure Functions, API Management (APIM), and .NET Core, with experience handling real client projects. Currently working at Adrosonic, managing two client projects and delivering scalable backend solutions. Android Developer with 2+ years of experience building innovative mobile applications using Kotlin and Jetpack Compose. Proven track record of implementing responsive UIs, integrating APIs, and delivering user-focused solutions. Passionate about creating high-performance, scalable mobile experiences with modern architecture patterns.',
    experience: [
      {
        id: 'exp-adrosonic-se',
        company: 'Adrosonic',
        role: 'Software Engineer',
        location: 'Mumbai, Maharashtra',
        start: 'Jun 2025',
        end: 'Present',
        bullets: [
          b('exp-adrosonic-se-1', 'Developing enterprise-level applications using WordPress and .NET Framework for client-focused solutions.'),
          b('exp-adrosonic-se-2', 'Building scalable web applications with modern backend technologies, contributing to improved system performance by 30%.'),
          b('exp-adrosonic-se-3', 'Collaborating with cross-functional teams to deliver high-quality software solutions within project timelines.'),
        ],
      },
      {
        id: 'exp-adrosonic-trainee',
        company: 'Adrosonic',
        role: 'Software Engineer (Trainee) - Internship',
        location: 'Mumbai, Maharashtra',
        start: 'Dec 2024',
        end: 'Jun 2025',
        bullets: [
          b('exp-adrosonic-trainee-1', 'Developed an enterprise-level Proof of Concept (POC) for Dynamics 365 and Instanda integration, reducing process automation time by 40%.'),
          b('exp-adrosonic-trainee-2', 'Gained hands-on experience with WordPress development and .NET Framework for web application development.'),
          b('exp-adrosonic-trainee-3', 'Redesigned office website UI/UX with responsive design principles, resulting in 30% improved load times and 20% increased user engagement.'),
        ],
      },
      {
        id: 'exp-beyondschool',
        company: 'BeyondSchool',
        role: 'Android Developer Intern',
        location: 'Ranchi, Jharkhand',
        start: 'Jul 2022',
        end: 'Mar 2023',
        bullets: [
          b('exp-beyondschool-1', 'Implemented Text-to-Speech and Speech-to-Text functionality that increased app accessibility and user engagement by 35%.'),
          b('exp-beyondschool-2', 'Designed and integrated gamification features with rewards system and leaderboards that boosted user retention by 40%.'),
          b('exp-beyondschool-3', 'Collaborated with UX team to optimize app flow, reducing user drop-off rates by 25% and increasing session duration by 15%.'),
        ],
      },
    ],
    education: [
      {
        id: 'edu-mca',
        institution: 'Birla Institute of Technology, Mesra',
        degree: 'Master of Computer Applications',
        location: '',
        start: 'Aug 2023',
        end: 'May 2025',
        note: 'CGPA: 8.1/10.0',
      },
      {
        id: 'edu-bca',
        institution: 'Birla Institute of Technology, Mesra',
        degree: 'Bachelor of Computer Applications',
        location: '',
        start: 'Aug 2019',
        end: 'May 2022',
        note: 'CGPA: 8.2/10.0',
      },
    ],
    projects: [
      {
        id: 'prj-expensesync',
        name: 'ExpenseSync',
        stack: 'Kotlin, Jetpack Compose, Firebase, Koin, MVVM',
        start: 'Dec 2024',
        end: 'May 2025',
        link: '',
        bullets: [
          b('prj-expensesync-1', 'Architected with MVVM, Clean Architecture, and Repository Pattern for maintainable, testable code.'),
          b('prj-expensesync-2', 'Implemented real-time data synchronization with Firebase Firestore reducing sync delays by 75%.'),
          b('prj-expensesync-3', 'Created desktop version with WhatsApp Web–style QR authentication, increasing multi-device usage by 45%.'),
        ],
      },
      {
        id: 'prj-researchhub',
        name: 'Research Hub',
        stack: 'Kotlin Multiplatform, Compose, Koin, Retrofit',
        start: 'Jun 2024',
        end: 'Dec 2024',
        link: '',
        bullets: [
          b('prj-researchhub-1', 'Built a cross-platform research collaboration tool that increased team productivity by 30%.'),
          b('prj-researchhub-2', 'Implemented Kotlin Multiplatform for shared business logic between Android and Desktop platforms.'),
          b('prj-researchhub-3', 'Utilized Kotlin Flow and Coroutines for reactive state management and asynchronous operations.'),
          b('prj-researchhub-4', 'Integrated push notifications with Firebase Cloud Messaging, improving user engagement by 40%.'),
        ],
      },
      {
        id: 'prj-bitapp',
        name: 'BIT App',
        stack: 'Android, Kotlin, Firebase, MVVM',
        start: 'Aug 2021',
        end: 'Present',
        link: '',
        bullets: [
          b('prj-bitapp-1', 'Created and maintain an app used by 1000+ university students with 4.7/5 rating on Google Play Store.'),
          b('prj-bitapp-2', 'Utilized WorkManager for background tasks and Room database for efficient local data storage.'),
          b('prj-bitapp-3', 'Implemented custom analytics dashboard to monitor usage patterns and inform feature development.'),
        ],
      },
      {
        id: 'prj-ttsengine',
        name: 'TTS-Engine',
        stack: 'Android Library, Kotlin',
        start: '',
        end: 'Feb 2023',
        link: '',
        bullets: [
          b('prj-ttsengine-1', 'Designed a custom Text-to-Speech library with real-time text highlighting and lifecycle-aware functionality.'),
          b('prj-ttsengine-2', 'Published to JitPack with 500+ downloads and integration in 5+ production applications.'),
        ],
      },
    ],
    skills: [
      { id: 'sk-languages', category: 'Languages', items: 'Kotlin (Advanced), Java (Intermediate), Python (Intermediate), C# (Basic), JavaScript (Basic)' },
      { id: 'sk-android', category: 'Android Development', items: 'Jetpack Compose, MVVM, Navigation, Room, WorkManager, LiveData, Flow, Coroutines' },
      { id: 'sk-backend', category: 'Backend & Cloud', items: 'Firebase (Authentication, Firestore, FCM), RESTful APIs, .NET Framework' },
      { id: 'sk-web', category: 'Web Development', items: 'WordPress Development, Responsive Design' },
      { id: 'sk-tools', category: 'Tools & DevOps', items: 'Android Studio, Git, GitHub Actions, Figma, Postman' },
      { id: 'sk-arch', category: 'Architecture Patterns', items: 'Clean Architecture, MVVM, Repository Pattern, Dependency Injection (Koin, Hilt)' },
    ],
    certifications: [],
  };

  const defaultProfile = {
    id: 'profile-default',
    name: 'Default',
    tagline: '',
    summary: '',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hidden: { sections: [], items: [], bullets: [] },
  };

  return {
    schema,
    profiles: [defaultProfile],
    defaultProfileId: defaultProfile.id,
  };
}

/** A blank profile (full CV) ready to be trimmed. */
export function createProfile(name = 'New Profile') {
  return {
    id: genId('profile'),
    name,
    tagline: '',
    summary: '',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hidden: { sections: [], items: [], bullets: [] },
  };
}

const asArray = (v) => (Array.isArray(v) ? v : []);
const asString = (v) => (typeof v === 'string' ? v : '');

/**
 * Coerce an arbitrary stored blob into a valid, fully-id'd builder document.
 * Tolerant of partial/legacy data: missing arrays become empty, missing ids are
 * assigned, and at least one profile + a valid defaultProfileId are guaranteed.
 * Pure — returns a new object, never mutates the input.
 */
export function normalizeResumeData(input) {
  const base = createDefaultResumeData();
  if (!input || typeof input !== 'object') return base;

  const rawSchema = input.schema && typeof input.schema === 'object' ? input.schema : {};

  const normItem = (item, prefix, withBullets) => {
    const out = { ...item };
    out.id = asString(item?.id) || genId(prefix);
    if (withBullets) {
      out.bullets = asArray(item?.bullets).map((bl) => ({
        id: asString(bl?.id) || genId(`${prefix}-b`),
        text: asString(bl?.text),
      }));
    }
    return out;
  };

  const schema = {
    basics: { ...base.schema.basics, ...(rawSchema.basics && typeof rawSchema.basics === 'object' ? rawSchema.basics : {}) },
    summary: typeof rawSchema.summary === 'string' ? rawSchema.summary : '',
    experience: asArray(rawSchema.experience).map((i) => normItem(i, 'exp', true)),
    education: asArray(rawSchema.education).map((i) => normItem(i, 'edu', false)),
    projects: asArray(rawSchema.projects).map((i) => normItem(i, 'prj', true)),
    skills: asArray(rawSchema.skills).map((i) => normItem(i, 'sk', false)),
    certifications: asArray(rawSchema.certifications).map((i) => normItem(i, 'cert', false)),
  };

  let profiles = asArray(input.profiles).map((p) => ({
    id: asString(p?.id) || genId('profile'),
    name: asString(p?.name) || 'Untitled',
    tagline: asString(p?.tagline),
    summary: asString(p?.summary),
    sectionOrder: sanitizeOrder(p?.sectionOrder),
    hidden: {
      sections: asArray(p?.hidden?.sections).filter((x) => typeof x === 'string'),
      items: asArray(p?.hidden?.items).filter((x) => typeof x === 'string'),
      bullets: asArray(p?.hidden?.bullets).filter((x) => typeof x === 'string'),
    },
  }));

  if (profiles.length === 0) profiles = [createProfile('Default')];

  let defaultProfileId = asString(input.defaultProfileId);
  if (!profiles.some((p) => p.id === defaultProfileId)) {
    defaultProfileId = profiles[0].id;
  }

  return { schema, profiles, defaultProfileId };
}

/** Keep only known section keys, dedupe, and append any missing ones so no
 *  section is ever silently dropped when content is added later. */
export function sanitizeOrder(order) {
  const seen = new Set();
  const out = [];
  for (const key of asArray(order)) {
    if (SECTION_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) out.push(key);
  }
  return out;
}
