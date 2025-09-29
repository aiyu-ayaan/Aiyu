export const roles = ['A collection of my work', 'Click on a project to learn more'];

const projects = [
  {
    name: 'ExpenseSync',
    techStack: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Koin', 'MVVM'],
    year: '2025',
    status: 'Done',
    projectType: 'application',
    description: 'A cross-platform expense management application with 500+ active users and a 4.6/5 average rating. Architected with MVVM, Clean Architecture, and Repository Pattern for maintainable, testable code. Implemented real-time data synchronization with Firebase Firestore reducing sync delays by 75%. Created desktop version with WhatsApp Web-style QR authentication, increasing multi-device usage by 45%.',
    codeLink: 'https://github.com/aiyu-ayaan/ExpenseSync',
  },
  {
    name: 'Research Hub',
    techStack: ['Kotlin Multiplatform', 'Compose', 'Koin', 'Retrofit'],
    year: '2024',
    status: 'Done',
    projectType: 'application',
    description: 'A cross-platform research collaboration tool that increased team productivity by 30%. Implemented Kotlin Multiplatform for shared business logic between Android and Desktop platforms. Utilized Kotlin Flow and Coroutines for reactive state management and asynchronous operations. Integrated push notifications with Firebase Cloud Messaging, improving user engagement by 40%.',
    codeLink: 'https://github.com/ResearchHub24/Research-Hub-KMP',
  },
  {
    name: 'BIT App',
    image: 'https://aiyu-ayaan.github.io/BIT-App/assets/poster.png',
    techStack: ['Android', 'Kotlin', 'Firebase', 'MVVM'],
    year: '2023',
    status: 'Working',
    projectType: 'application',
    description: 'An app used by 1000+ university students with a 4.7/5 rating on the Google Play Store. Utilized WorkManager for background tasks and Room for local data storage. Implemented a custom analytics dashboard to monitor usage patterns and inform feature development.',
    codeLink: 'https://github.com/aiyu-ayaan/BIT-App',
  },
  {
    name: 'TTS-Engine',
    techStack: ['Android Library', 'Kotlin'],
    year: '2023',
    status: 'Done',
    projectType: 'library',
    description: 'An Android library for Text-to-Speech with real-time text highlighting and lifecycle-aware functionality. Published to JitPack with 500+ downloads and integration in 5+ production applications.',
    codeLink: 'https://github.com/aiyu-ayaan/tts-engine',
  },
];

export default projects;
