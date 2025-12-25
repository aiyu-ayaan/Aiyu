import { processImage } from '../src/utils/imageProcessing.js';
import path from 'path';

console.log('Successfully imported module.');
console.log('processImage is:', typeof processImage);

if (typeof processImage !== 'function') {
    console.error('FAIL: processImage is not a function');
    process.exit(1);
}

console.log('PASS: processImage is a function');

// Optional: Try to verify sharp loading
try {
    const sharp = (await import('sharp')).default;
    console.log('Sharp version:', sharp.versions.sharp);
} catch (e) {
    console.error('FAIL: Could not load sharp:', e.message);
}
