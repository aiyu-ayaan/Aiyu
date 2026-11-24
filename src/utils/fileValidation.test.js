import { describe, it, expect } from 'vitest';
import {
  detectHeif,
  validateFileSignature,
  sanitizeFilename,
  generateSecureFilename,
  validateFileSize,
  validateUploadedFile,
  MAX_FILE_SIZE,
} from './fileValidation';

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
// Matches no known image signature (e.g. a disguised text/script file).
const bogusHeader = Buffer.from([0x3c, 0x73, 0x76, 0x67, 0x20, 0x78]); // "<svg x"

describe('validateFileSignature', () => {
  it('accepts a matching PNG signature', () => {
    expect(validateFileSignature(pngHeader, 'image/png')).toBe(true);
  });
  it('rejects a buffer whose signature does not match the mime type', () => {
    expect(validateFileSignature(jpegHeader, 'image/png')).toBe(false);
  });
  it('rejects unknown mime types', () => {
    expect(validateFileSignature(pngHeader, 'image/svg+xml')).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('strips directory traversal components', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('system32');
  });
  it('removes unsafe characters', () => {
    expect(sanitizeFilename('my photo!@#.png')).toBe('myphoto.png');
  });
  it('falls back to "upload" for empty or dot-leading names', () => {
    expect(sanitizeFilename('.htaccess')).toBe('upload');
    expect(sanitizeFilename('!!!')).toBe('upload');
  });
});

describe('generateSecureFilename', () => {
  it('keeps a safe extension and produces a unique name', () => {
    const name = generateSecureFilename('photo.png');
    expect(name).toMatch(/^\d+-[a-z0-9]+-\d+\.png$/);
  });
  it('coerces unknown extensions to bin', () => {
    expect(generateSecureFilename('malware.exe')).toMatch(/\.bin$/);
  });
});

describe('validateFileSize', () => {
  it('accepts sizes within the limit', () => {
    expect(validateFileSize(1)).toBe(true);
    expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
  });
  it('rejects zero and oversize', () => {
    expect(validateFileSize(0)).toBe(false);
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
  });
});

describe('validateUploadedFile', () => {
  const file = (over = {}) => ({ type: 'image/png', name: 'a.png', size: 100, ...over });

  it('accepts a valid PNG', () => {
    expect(validateUploadedFile(file(), pngHeader)).toEqual(
      expect.objectContaining({ valid: true, detectedType: 'image/png' })
    );
  });
  it('rejects when no file is provided', () => {
    expect(validateUploadedFile(null, pngHeader)).toEqual(
      expect.objectContaining({ valid: false })
    );
  });
  it('rejects disallowed mime types whose content is not a known image', () => {
    const res = validateUploadedFile(file({ type: 'image/svg+xml' }), bogusHeader);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/invalid file type/i);
  });
  it('rejects oversize files', () => {
    const res = validateUploadedFile(file({ size: MAX_FILE_SIZE + 1 }), pngHeader);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/size/i);
  });
  it('rejects when signature does not match declared type', () => {
    const res = validateUploadedFile(file({ type: 'image/png' }), jpegHeader);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/signature/i);
  });
});

describe('detectHeif', () => {
    const ftyp = (size, brand) => Buffer.concat([Buffer.from([0, 0, 0, size]), Buffer.from(`ftyp${brand}`), Buffer.alloc(16)]);

    it('recognizes HEIC/HEIF photos whatever the ftyp box size', () => {
        expect(detectHeif(ftyp(0x18, 'heic'))).toBe('image/heic'); // iPhone, most Android
        expect(detectHeif(ftyp(0x24, 'heic'))).toBe('image/heic'); // box size not in the old prefix list
        expect(detectHeif(ftyp(0x1c, 'heix'))).toBe('image/heic');
        expect(detectHeif(ftyp(0x18, 'hevc'))).toBe('image/heic');
        expect(detectHeif(ftyp(0x18, 'mif1'))).toBe('image/heif');
        expect(detectHeif(ftyp(0x18, 'msf1'))).toBe('image/heif');
    });

    it('rejects other ISO-BMFF files and junk', () => {
        expect(detectHeif(ftyp(0x18, 'isom'))).toBeNull(); // mp4
        expect(detectHeif(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
        expect(detectHeif(Buffer.alloc(0))).toBeNull();
    });

    it('accepts a HEIC with no browser type and a .heif name, or labelled heif but branded heic', () => {
        const buffer = ftyp(0x24, 'heic');
        expect(validateUploadedFile({ name: 'IMG_1.HEIC', type: '', size: buffer.length }, buffer)).toMatchObject({ valid: true, detectedType: 'image/heic' });
        expect(validateUploadedFile({ name: 'x.heif', type: 'application/octet-stream', size: buffer.length }, buffer).valid).toBe(true);
        expect(validateUploadedFile({ name: 'x.heif', type: 'image/heif', size: buffer.length }, buffer).valid).toBe(true);
    });
});
