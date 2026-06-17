import { describe, it, expect } from 'vitest';
import { resolveProfile, resumeFilename } from './resolveProfile.js';
import { createDefaultResumeData, normalizeResumeData } from './schema.js';

const sectionKeys = (model) => model.sections.map((s) => s.key);
const find = (model, key) => model.sections.find((s) => s.key === key);

describe('resolveProfile', () => {
  it('renders the full CV for the default profile in default order', () => {
    const data = createDefaultResumeData();
    const model = resolveProfile(data, 'profile-default');

    expect(model.basics.name).toBe('Ayaan Ansari');
    expect(model.tagline).toBe('Mobile Android Developer');
    expect(sectionKeys(model)).toEqual(['summary', 'experience', 'education', 'projects', 'skills']);
    // certifications is empty in the seed -> section omitted entirely
    expect(find(model, 'certifications')).toBeUndefined();
    expect(find(model, 'experience').items).toHaveLength(3);
    expect(find(model, 'experience').items[0].bullets).toHaveLength(3);
  });

  it('falls back to the default profile when the id is unknown', () => {
    const data = createDefaultResumeData();
    const model = resolveProfile(data, 'does-not-exist');
    expect(model.profileId).toBe('profile-default');
  });

  it('hides a whole item when its id is in hidden.items', () => {
    const data = createDefaultResumeData();
    data.profiles[0].hidden.items = ['exp-beyondschool'];
    const model = resolveProfile(data, 'profile-default');
    const companies = find(model, 'experience').items.map((i) => i.company);
    expect(companies).not.toContain('BeyondSchool');
    expect(find(model, 'experience').items).toHaveLength(2);
  });

  it('hides individual bullets while keeping the item', () => {
    const data = createDefaultResumeData();
    data.profiles[0].hidden.bullets = ['exp-adrosonic-se-2', 'exp-adrosonic-se-3'];
    const model = resolveProfile(data, 'profile-default');
    const item = find(model, 'experience').items.find((i) => i.role === 'Software Engineer');
    expect(item.bullets).toHaveLength(1);
    expect(item.bullets[0]).toMatch(/Developing enterprise-level/);
  });

  it('drops a section entirely once every item in it is hidden', () => {
    const data = createDefaultResumeData();
    data.profiles[0].hidden.items = ['edu-mca', 'edu-bca'];
    const model = resolveProfile(data, 'profile-default');
    expect(find(model, 'education')).toBeUndefined();
    expect(sectionKeys(model)).not.toContain('education');
  });

  it('applies tagline and summary overrides', () => {
    const data = createDefaultResumeData();
    data.profiles[0].tagline = 'AI Engineer';
    data.profiles[0].summary = 'Custom AI-focused summary.';
    const model = resolveProfile(data, 'profile-default');
    expect(model.tagline).toBe('AI Engineer');
    expect(find(model, 'summary').text).toBe('Custom AI-focused summary.');
  });

  it('respects a custom section order and appends any missing sections', () => {
    const data = createDefaultResumeData();
    data.profiles[0].sectionOrder = ['skills', 'summary']; // omit the rest
    const model = resolveProfile(data, 'profile-default');
    // skills and summary lead; remaining known sections are appended, never lost
    expect(sectionKeys(model).slice(0, 2)).toEqual(['skills', 'summary']);
    expect(sectionKeys(model)).toContain('experience');
    expect(sectionKeys(model)).toContain('projects');
  });
});

describe('normalizeResumeData', () => {
  it('assigns ids to id-less items and bullets', () => {
    const model = normalizeResumeData({
      schema: { experience: [{ company: 'X', bullets: [{ text: 'did a thing' }] }] },
      profiles: [],
    });
    expect(model.schema.experience[0].id).toBeTruthy();
    expect(model.schema.experience[0].bullets[0].id).toBeTruthy();
  });

  it('guarantees at least one profile and a valid defaultProfileId', () => {
    const model = normalizeResumeData({ schema: {}, profiles: [], defaultProfileId: 'ghost' });
    expect(model.profiles.length).toBeGreaterThanOrEqual(1);
    expect(model.profiles.some((p) => p.id === model.defaultProfileId)).toBe(true);
  });

  it('returns the seeded default when given garbage', () => {
    expect(normalizeResumeData(null).schema.basics.name).toBe('Ayaan Ansari');
  });
});

describe('resumeFilename', () => {
  it('slugifies name + profile into a .pdf filename', () => {
    const model = { basics: { name: 'Ayaan Ansari' }, profileName: 'AI Engineer' };
    expect(resumeFilename(model)).toBe('Ayaan-Ansari-AI-Engineer.pdf');
  });

  it('falls back gracefully with no data', () => {
    expect(resumeFilename({})).toBe('resume.pdf');
  });
});
