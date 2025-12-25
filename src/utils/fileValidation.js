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
    'image/heic': [
        // HEIC format: ISO Base Media file with 'ftyp' box and 'heic' brand
        // Structure: [size][ftyp][heic] where ftyp = 0x66747970, heic = 0x68656963
        [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], // 24-byte header
        [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], // 28-byte header variant
        [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]  // 32-byte header variant
    ],
    'image/heif': [
        // HEIF format: ISO Base Media file with 'ftyp' box and 'mif1' brand
        // Structure: [size][ftyp][mif1] where ftyp = 0x66747970, mif1 = 0x6D696631
        [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31], // 24-byte header
        [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31]  // 28-byte header variant
    ]
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

/**
 * Validates file by checking magic numbers (file signature)
 * This prevents attackers from uploading malicious files with fake extensions
 * 
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean} - True if file signature matches MIME type
 */
export function validateFileSignature(buffer, mimeType) {
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

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}. SVG is not allowed for security reasons.`
        };
    }

    // Check file size
    if (!validateFileSize(file.size)) {
        return {
            valid: false,
            error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    // Check magic number (file signature)
    if (!validateFileSignature(buffer, file.type)) {
        return {
            valid: false,
            error: 'File signature does not match declared type. Possible malicious file detected.'
        };
    }

    return { valid: true, error: null };
}
