import { describe, it, expect } from 'vitest';
import { describeSecretSource } from './cronSecrets';

describe('describeSecretSource', () => {
    it('reports the admin store when the key is set there', () => {
        expect(describeSecretSource('IA_ACCESS_KEY', { IA_ACCESS_KEY: 'a' }, {}))
            .toBe('global environment secrets');
    });
    it('reports the deployment environment when only .env has it', () => {
        expect(describeSecretSource('IA_ACCESS_KEY', {}, { IA_ACCESS_KEY: 'a' }))
            .toBe('deployment environment');
    });
    it('prefers the admin store when both are set', () => {
        expect(describeSecretSource('IA_ACCESS_KEY', { IA_ACCESS_KEY: 'a' }, { IA_ACCESS_KEY: 'b' }))
            .toBe('global environment secrets');
    });
    it('reports nothing configured when neither has it', () => {
        expect(describeSecretSource('IA_ACCESS_KEY', {}, {})).toBe('not configured');
    });
});
