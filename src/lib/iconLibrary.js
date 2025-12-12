import {
    SiN8N, SiDocker, SiAndroid, SiKotlin, SiFirebase,
    SiGit, SiHtml5, SiCss3, SiJavascript, SiNextdotjs,
    SiPython, SiReact, SiDotnet, SiWordpress,
    SiMysql, SiUnity, SiUnrealengine, SiBlender, SiCplusplus,
    SiGo, SiRust, SiSwift, SiFlutter, SiDart,
    SiPostgresql, SiMongodb, SiRedis, SiNginx, SiApache,
    SiJenkins, SiGithubactions, SiGitlab, SiBitbucket,
    SiLinux, SiArduino, SiRaspberrypi,
    SiVim, SiIntellijidea, SiAndroidstudio,
    SiFigma, SiAdobe,
    SiTypescript, SiAngular, SiVuedotjs, SiSvelte, SiTailwindcss,
    SiBootstrap, SiMui, SiGraphql,
    SiApollographql, SiPrisma,
    SiNestjs, SiExpress, SiFastapi, SiFlask, SiDjango,
    SiSpring, SiSpringboot, SiLaravel,
    SiElectron,
    SiSupabase, SiAppwrite,
    SiAwslambda, SiAmazonaws
} from 'react-icons/si';
import { FaJava, FaDatabase, FaCode, FaLaptopCode, FaMobileAlt, FaServer, FaCloud } from 'react-icons/fa';

export const IconList = {
    // Development
    'N8N': SiN8N,
    'Docker': SiDocker,
    'Android': SiAndroid,
    'Kotlin': SiKotlin,
    'Firebase': SiFirebase,
    'Git': SiGit,
    'HTML5': SiHtml5,
    'CSS3': SiCss3,
    'JavaScript': SiJavascript,
    'TypeScript': SiTypescript,
    'Next.js': SiNextdotjs,
    'React': SiReact,
    'Vue.js': SiVuedotjs,
    'Angular': SiAngular,
    'Svelte': SiSvelte,
    'Python': SiPython,
    'Java': FaJava,
    '.NET': SiDotnet,
    'C#': SiDotnet, // Using DotNet icon for C#
    'WordPress': SiWordpress,
    'MySQL': SiMysql,
    'PostgreSQL': SiPostgresql,
    'MongoDB': SiMongodb,
    'Redis': SiRedis,
    'GraphQL': SiGraphql,
    'Prisma': SiPrisma,
    'Supabase': SiSupabase,
    'Appwrite': SiAppwrite,

    // Tools & Platform
    'Linux': SiLinux,
    'IntelliJ': SiIntellijidea,
    'Android Studio': SiAndroidstudio,
    'Figma': SiFigma,

    // Generic
    'Code': FaCode,
    'Laptop': FaLaptopCode,
    'Mobile': FaMobileAlt,
    'Server': FaServer,
    'Cloud': FaCloud,
    'Database': FaDatabase
};

export const getIcon = (name) => {
    if (!name) return FaCode;

    // Direct match
    if (IconList[name]) return IconList[name];

    // Case-insensitive match on keys
    const lowerName = name.toLowerCase();
    const key = Object.keys(IconList).find(k => k.toLowerCase() === lowerName);
    if (key) return IconList[key];

    // Partial matches (fallback logic)
    if (lowerName.includes('react')) return SiReact;
    if (lowerName.includes('android')) return SiAndroid;
    if (lowerName.includes('kotlin')) return SiKotlin;
    if (lowerName.includes('java') && !lowerName.includes('script')) return FaJava;
    if (lowerName.includes('js') || lowerName.includes('script')) return SiJavascript;
    if (lowerName.includes('css')) return SiCss3;
    if (lowerName.includes('html')) return SiHtml5;
    if (lowerName.includes('python')) return SiPython;
    if (lowerName.includes('c#') || lowerName.includes('dotnet')) return SiDotnet;
    if (lowerName.includes('sql') || lowerName.includes('database')) return FaDatabase;

    return FaCode;
};

export const getIconNames = () => Object.keys(IconList);
