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
        id: 'firstcode',
        film: 'firstcode',
        label: 'first code',
        eyebrow: 'Chapter 03 · First code',
        when: '2015 → 2019',
        title: 'A laptop, a missing semicolon, and a calculator.',
        body: 'On 15 February 2015 I got my first laptop, an HP Notebook 2000 series. It was the best day of my life. In mid 2017, after my Class 10 exams, I followed a tutorial to write a simple command-line calculator in C and could not get it to compile. A semicolon? I still do not know what I did wrong. In higher secondary I chose Informatics Practices, started learning Java in NetBeans, and finally built a calculator that worked, with a full GUI.',
        accent: 'var(--accent-purple)',
        duration: 19,
        introEnd: 1.1,
    },
    {
        id: 'college',
        film: 'college',
        label: 'college',
        eyebrow: 'Chapter 04 · College',
        when: '2019 → 2020',
        title: 'Hello, C. Then COVID hit.',
        body: 'College began at BIT Mesra in 2019. My first language was C, and I loved the data structures class, especially writing linked lists. Then COVID hit, the world went quiet, and in 2020 I started learning Android development.',
        accent: 'var(--accent-cyan)',
        duration: 15,
        introEnd: 1.1,
    },
    {
        id: 'bitapp',
        film: 'bitapp',
        label: 'bit app',
        eyebrow: 'Chapter 05 · BIT App',
        when: 'BIT App',
        title: 'My first production app, my obsession, my lab.',
        body: 'BIT App became my obsession and my place to experiment, learn and ship new features. It grew from a static app into a dynamic one, moved from Java to Kotlin, then to the Navigation component, then to Jetpack Compose. More than 1,000 students used it, with a 4.7★ rating on Google Play.',
        accent: 'var(--status-success)',
        image: '/hf/bitapp/assets/bit-app.png',
        duration: 15,
        introEnd: 1.2,
    },
    {
        id: 'voice',
        film: 'voice',
        label: 'internship',
        eyebrow: 'Chapter 06 · Internship',
        when: '9 months',
        title: 'Nine months of voice, and my first library.',
        body: "After my bachelor's I wanted to test my skills, so I interned for 9 months at BeyondSchool (Jul 2022 – Mar 2023), working heavily on text-to-speech and speech-to-text. In that time I also published my first Android library, TTS-Engine, on JitPack.",
        accent: 'var(--accent-purple)',
        duration: 14,
        introEnd: 1.1,
    },
    {
        id: 'masters',
        film: 'masters',
        label: "master's",
        eyebrow: "Chapter 07 · Master's",
        when: '2023 → 2024',
        title: 'Teaching machines to see, and getting placed.',
        body: "I went back to BIT Mesra for my master's (MCA) and loved exploring new topics like machine learning and computer vision. In December 2023 I migrated the whole of BIT App to Jetpack Compose, and in August 2024 I got placed at Adrosonic as a Software Engineer.",
        accent: 'var(--accent-cyan)',
        duration: 14.5,
        introEnd: 1.1,
    },
    {
        id: 'adrosonic',
        film: 'adrosonic',
        label: 'adrosonic',
        eyebrow: 'Chapter 08 · Adrosonic',
        when: '2024 → 2025',
        title: 'Building the website, then backend in C#.',
        body: 'I joined Adrosonic in December 2024 as an intern on the website team: the Elevate Connected timezone-aware countdown, the blog read-time logic, migrating whole pages from Pods to ACF (Advanced Custom Fields), and mostly page templates. I joined full time in June 2025, and in October got my first client project as a backend developer in C#.',
        accent: 'var(--accent-purple)',
        duration: 16.5,
        introEnd: 1.1,
    },
    {
        id: 'now',
        film: 'now',
        label: 'now',
        eyebrow: 'Chapter 09 · Now',
        when: 'Since Jun 2025',
        title: 'Building this site, with AI.',
        body: 'From June 2025 I got my hands on AI coding harnesses and started working on this site. It began as a static page, and now it has everything from a CMS to a backup machine. This story is the newest part of it.',
        accent: 'var(--accent-pink)',
        duration: 14,
        introEnd: 1.1,
    },
];
