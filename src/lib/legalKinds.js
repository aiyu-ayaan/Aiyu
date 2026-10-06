/**
 * Legal document presets, shared by lib/legal (server) and the admin editor
 * (client). Kept free of server imports so client components can use it.
 * `custom` lets the admin name any other page.
 */
export const LEGAL_KINDS = [
    { value: 'privacy-policy', label: 'Privacy Policy' },
    { value: 'terms-and-conditions', label: 'Terms & Conditions' },
    { value: 'eula', label: 'End User License Agreement' },
    { value: 'data-deletion', label: 'Data Deletion' },
    { value: 'cookie-policy', label: 'Cookie Policy' },
    { value: 'refund-policy', label: 'Refund Policy' },
    { value: 'disclaimer', label: 'Disclaimer' },
    { value: 'custom', label: 'Custom' },
];

export const LEGAL_FORMATS = ['markdown', 'html'];

export function legalKindLabel(value) {
    return LEGAL_KINDS.find((k) => k.value === value)?.label || 'Document';
}
