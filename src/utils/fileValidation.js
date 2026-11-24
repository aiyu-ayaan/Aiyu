/**
 * Secure File Validation Utilities
 * Implements magic number checking to prevent malicious file uploads
 */

/**
 * Magic numbers (file signatures) for allowed image types
 * These are the first few bytes that identify the file type
 */
const FILE_SIGNATURES = {
    'image/jpeg': [
        [0xFF, 0xD8, 0xFF] // JPEG/JPG
    ],
    'image/png': [
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
    ],
    'image/webp': [
        [0x52, 0x49, 0x46, 0x46] // WEBP (RIFF at start)
    ],
    'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
    ],
    // image/heic and image/heif are matched by detectHeif() below: the ISO-BMFF `ftyp` box size and the
    // major brand vary between phones, so fixed byte prefixes rejected real photos.
};

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types (SVG is explicitly excluded for security)
export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
];

// Major brands of HEIF/HEIC stills and sequences (ISO/IEC 23008-12).
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const HEIF_BRANDS = new Set(['mif1', 'msf1', 'mif2']);

/**
 * 'image/heic' | 'image/heif' when the buffer is an ISO-BMFF file with a HEIF major brand, else null.
 * @param {Buffer|Uint8Array} buffer
 */
export function detectHeif(buffer) {
    if (!buffer || buffer.length < 12) return null;
    const text = (start, end) => String.fromCharCode(...buffer.subarray(start, end));
    if (text(4, 8) !== 'ftyp') return null;
    const brand = text(8, 12);
    if (HEIC_BRANDS.has(brand)) return 'image/heic';
    if (HEIF_BRANDS.has(brand)) return 'image/heif';
    return null;
}

/**
 * Validates file by checking magic numbers (file signature)
 * This prevents attackers from uploading malicious files with fake extensions
 * 
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean} - True if file signature matches MIME type
 */
export function validateFileSignature(buffer, mimeType) {
    // Browsers label HEIC/HEIF inconsistently; either label accepts either family.
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
        return detectHeif(buffer) !== null;
    }

    const signatures = FILE_SIGNATURES[mimeType];

    if (!signatures) {
        return false;
    }

    // Check if buffer matches any of the signatures for this MIME type
    return signatures.some(signature => {
        if (buffer.length < signature.length) {
            return false;
        }

        return signature.every((byte, index) => buffer[index] === byte);
    });
}

/**
 * Sanitizes filename to prevent directory traversal attacks
 * 
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
    // Remove any directory path components
    const basename = filename.split(/[/\\]/).pop() || 'file';

    // Remove all characters except alphanumeric, dots, hyphens, and underscores
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '');

    // Ensure the filename is not empty and doesn't start with a dot
    return sanitized.length > 0 && !sanitized.startsWith('.')
        ? sanitized
        : 'upload';
}

/**
 * Generates a secure random filename
 * 
 * @param {string} originalName - Original filename
 * @returns {string} - Secure filename with timestamp and random string
 */
export function generateSecureFilename(originalName) {
    const sanitized = sanitizeFilename(originalName);
    const extension = sanitized.split('.').pop()?.toLowerCase() || 'bin';

    // Only allow safe extensions
    const safeExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
    const finalExtension = safeExtensions.includes(extension) ? extension : 'bin';

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const randomNumber = Math.floor(Math.random() * 1000000);

    return `${timestamp}-${randomString}-${randomNumber}.${finalExtension}`;
}

/**
 * Validates file size
 * 
 * @param {number} size - File size in bytes
 * @returns {boolean} - True if size is within limits
 */
export function validateFileSize(size) {
    return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Complete file validation
 * 
 * @param {Object} file - File object from FormData
 * @param {Buffer} buffer - File buffer
 * @returns {Object} - { valid: boolean, error: string | null }
 */
export function validateUploadedFile(file, buffer) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Attempt to detect MIME type from buffer if browser didn't provide it or provided generic
    let mimeType = file.type;
    // HEIC files often have an empty or application/octet-stream type (Chrome/Firefox on Windows and Linux).
    if (!mimeType || mimeType === 'application/octet-stream') {
        mimeType = detectHeif(buffer) || mimeType;
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        // Double check against signatures if type is unknown/generic
        // This helps when browser sends 'application/octet-stream' but we support the file
        const detectedType = detectHeif(buffer) || Object.keys(FILE_SIGNATURES).find(type => validateFileSignature(buffer, type));
        if (detectedType) {
            mimeType = detectedType;
        } else {
            return {
                valid: false,
                error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}. SVG is not allowed for security reasons.`
            };
        }
    }

    // Check file size
    if (!validateFileSize(file.size)) {
        return {
            valid: false,
            error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    // Check magic number (file signature)
    if (!validateFileSignature(buffer, mimeType)) {
        return {
            valid: false,
            error: 'File signature does not match declared type. Possible malicious file detected.'
        };
    }

    return { valid: true, error: null, detectedType: mimeType };
}
