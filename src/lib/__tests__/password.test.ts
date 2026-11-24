import { describe, expect, it } from '@jest/globals';
import { createHash, createHmac, pbkdf2Sync } from 'crypto';

import { fromHex, hmacSha256, pbkdf2Sha256, safeEqualHex, sha256, toHex, utf8 } from '../password';

describe('sha256', () => {
  it('matches the standard test vector and Node for many lengths', () => {
    expect(toHex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    for (const n of [0, 1, 55, 56, 63, 64, 65, 200]) {
      const s = 'x'.repeat(n);
      expect(toHex(sha256(utf8(s)))).toBe(createHash('sha256').update(s).digest('hex'));
    }
  });
});

describe('hmac and pbkdf2', () => {
  it('matches Node for HMAC with short and long keys', () => {
    for (const key of ['k', 'k'.repeat(100)]) {
      expect(toHex(hmacSha256(utf8(key), utf8('message')))).toBe(createHmac('sha256', key).update('message').digest('hex'));
    }
  });

  it('matches Node for PBKDF2', () => {
    const salt = fromHex('00112233445566778899aabbccddeeff');
    const ours = toHex(pbkdf2Sha256(utf8('correct horse'), salt, 1000));
    const node = pbkdf2Sync('correct horse', salt, 1000, 32, 'sha256').toString('hex');
    expect(ours).toBe(node);
  });
});

describe('safeEqualHex', () => {
  it('compares exactly', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('abcd', 'abc')).toBe(false);
  });
});
