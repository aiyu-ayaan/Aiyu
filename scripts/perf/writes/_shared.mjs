import { createHash } from 'node:crypto';

export const BEARER = 'write-parity-token';
export const BEARER_HASH = createHash('sha256').update(BEARER).digest('hex');

/** A fixed past time, so fixtures look the same in both runs. */
export const PAST = new Date('2025-01-02T03:04:05.678Z');
