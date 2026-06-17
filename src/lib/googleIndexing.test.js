import { describe, it, expect } from 'vitest';
import { parseServiceAccount, INDEXING_TYPES } from './googleIndexing';

const validSa = {
  type: 'service_account',
  client_email: 'bot@project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

describe('parseServiceAccount', () => {
  it('accepts a valid object and returns email + key', () => {
    const out = parseServiceAccount(validSa);
    expect(out.client_email).toBe(validSa.client_email);
    expect(out.private_key).toContain('BEGIN PRIVATE KEY');
  });
  it('accepts a valid JSON string', () => {
    expect(parseServiceAccount(JSON.stringify(validSa)).client_email).toBe(validSa.client_email);
  });
  it('throws on invalid JSON', () => {
    expect(() => parseServiceAccount('{not json')).toThrow(/valid JSON/);
  });
  it('throws when client_email or private_key is missing', () => {
    expect(() => parseServiceAccount({ type: 'service_account', client_email: 'a@b.c' })).toThrow(/private_key/);
  });
  it('throws when type is not service_account', () => {
    expect(() => parseServiceAccount({ ...validSa, type: 'authorized_user' })).toThrow(/service_account/);
  });
});

describe('INDEXING_TYPES', () => {
  it('exposes the two supported notification types', () => {
    expect(INDEXING_TYPES).toEqual(['URL_UPDATED', 'URL_DELETED']);
  });
});
