/**
 * The life story told on the v2 home page, one HyperFrames film per chapter
 * (sources in /hyperframes/<film>, published by `npm run hf:sync`).
 *
 * The text here is the chapter's real DOM copy: it is what crawlers and
 * screen readers get, and what reduced-motion / lite devices see instead
 * of the film. Keep it in step with the film's own captions.
 *
 * - duration: the film length in seconds (fallback; the real length is read
 *   from the player once it loads).
 * - introEnd: the opening plays while the chapter scrolls into view; the pin
 *   takes over from this second.
 */

// Optional: your birth year. When set, chapter 01's date stamp shows it.
export const BORN_YEAR = '';

export const LIFE_STORY = [
    {
        id: 'origin',
        film: 'origin',
        label: 'origin',
        eyebrow: 'Chapter 01 · Origin',
        when: '3 May',
        title: 'Born on a day of heavy rain.',
        body: 'I was born on 3 May, and it was raining heavily. As a kid I was always fascinated by how computers work. What I love about them is that they do only what I tell them to.',
        accent: 'var(--accent-pink)',
        duration: 12.5,
        introEnd: 1.2,
    },
    {
        id: 'school',
        film: 'school',
        label: 'school',
        eyebrow: 'Chapter 02 · School',
        when: '2005 → 2019',
        title: 'Fourteen years of school, one page at a time.',
        body: 'I started school in 2005 and completed it in 2019. Through every year of it, the fascination with computers never left.',
        accent: 'var(--accent-orange)',
        duration: 11,
        introEnd: 1.0,
    },
    {
        id: 'college',
        film: 'college',
        label: 'college',
        eyebrow: 'Chapter 03 · College',
        when: '2019 → 2020',
        title: 'Hello, C. Then COVID hit.',
        body: 'College began at BIT Mesra in 2019. My first language was C, and I loved the data structures class, especially writing linked lists. Then COVID hit, the world went quiet, and in 2020 I started learning Android development.',
        accent: 'var(--accent-cyan)',
        duration: 15,
        introEnd: 1.1,
    },
];
