/**
 * Browser preview for HEIC/HEIF photos, which only Safari can display natively. The decoder (libheif, ~1 MB)
 * is loaded on first use, so pages pay nothing until someone picks a HEIC file.
 */
export function isHeicFile(file) {
    const name = String(file?.name || '').toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') || file?.type === 'image/heic' || file?.type === 'image/heif';
}

/** Object URL of a JPEG rendering of `file` (revoke it when done). Throws if the file cannot be decoded. */
export async function heicPreviewUrl(file) {
    const { default: convert } = await import('heic-convert/browser');
    const jpeg = await convert({ buffer: new Uint8Array(await file.arrayBuffer()), format: 'JPEG', quality: 0.7 });
    return URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }));
}
