import { describe, it, expect } from 'vitest';
import { classify, describeLayer, typedClip } from './swarmEngine';

const viewport = { width: 1200, height: 800 };
const rect = (width, height) => ({ width, height });
const plain = {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    boxShadow: 'none',
    borderTopWidth: '0px',
    borderTopStyle: 'none',
};
const el = (html) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild;
};

describe('classify', () => {
    it('treats an element with its own text as a text layer', () => {
        expect(classify(el('<p>Hello <b>there</b></p>'), plain, rect(300, 40), viewport)).toBe('text');
    });

    it('treats images as media and ignores tiny ones', () => {
        expect(classify(el('<img alt="x">'), plain, rect(320, 200), viewport)).toBe('media');
        expect(classify(el('<img alt="x">'), plain, rect(8, 8), viewport)).toBe(null);
    });

    it('draws painted boxes but not bare wrappers or page-sized backdrops', () => {
        const card = { ...plain, backgroundColor: 'rgb(20, 20, 20)' };
        const box = el('<div><span>child</span></div>');
        expect(classify(box, card, rect(300, 200), viewport)).toBe('box');
        expect(classify(box, plain, rect(300, 200), viewport)).toBe(null);
        expect(classify(box, card, rect(1200, 780), viewport)).toBe(null);
    });

    it('skips collapsed elements', () => {
        expect(classify(el('<p>Hidden</p>'), plain, rect(0, 0), viewport)).toBe(null);
    });
});

describe('typedClip', () => {
    const base = { width: 200, height: 60, lines: 3, padTop: 0, lineHeight: 20 };

    it('shows the lines above in full and part of the current line', () => {
        expect(typedClip({ ...base, line: 1, frac: 0.5 })).toBe(
            'polygon(-24px -24px, 224px -24px, 224px 20px, 100px 20px, 100px 40px, -24px 40px)',
        );
    });

    it('covers the whole element, with bleed, when the last line is complete', () => {
        expect(typedClip({ ...base, line: 2, frac: 1 })).toBe(
            'polygon(-24px -24px, 224px -24px, 224px 40px, 224px 40px, 224px 84px, -24px 84px)',
        );
    });
});

describe('describeLayer', () => {
    it('quotes and truncates text', () => {
        const label = describeLayer(el(`<h1>${'a'.repeat(60)}</h1>`), 'text', rect(10, 10));
        expect(label).toBe(`h1 "${'a'.repeat(35)}…"`);
    });

    it('labels media with size and alt text', () => {
        expect(describeLayer(el('<img alt="Portrait">'), 'media', rect(640.4, 360))).toBe('img 640 × 360 · Portrait');
    });
});
