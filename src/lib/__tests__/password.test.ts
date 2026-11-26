import { afterEach, describe, expect, it } from '@jest/globals';
import * as nodeCrypto from 'crypto';
import { createHash, createHmac, pbkdf2Sync } from 'crypto';

import {
  chooseIterations,
  derivePbkdf2,
  fromHex,
  hasNativePbkdf2,
  hmacSha256,
  MAX_PBKDF2_ITERATIONS,
  MIN_PBKDF2_ITERATIONS,
  NATIVE_PBKDF2_ITERATIONS,
  needsStrongerHash,
  pbkdf2Sha256,
  roundsForSample,
  safeEqualHex,
  sha256,
  toHex,
  utf8,
} from '../password';

// Node's Web Crypto; the project's Node type definitions don't declare it, but it exists at runtime.
const webcrypto = (nodeCrypto as unknown as { webcrypto: unknown }).webcrypto;
const g = globalThis as { crypto?: unknown; isSecureContext?: boolean };
const originalCrypto = g.crypto;
/** Simulates a platform with Web Crypto (browser on HTTPS) or without it (React Native, plain http). */
function withWebCrypto(on: boolean) {
  if (on) {
    if (!(g.crypto as { subtle?: unknown } | undefined)?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true, writable: true });
    g.isSecureContext = true;
  } else {
    g.isSecureContext = false;
  }
}
afterEach(() => {
  delete g.isSecureContext;
  Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true, writable: true });
});

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

  it('matches Node for PBKDF2 at the edges: 1 and 2 rounds, long passwords, empty salt', () => {
    const salt = fromHex('00112233445566778899aabbccddeeff');
    const long = 'p'.repeat(100); // longer than a 64-byte HMAC block, so it is hashed first
    for (const [pw, s, n] of [['pw', salt, 1], ['pw', salt, 2], [long, salt, 50], ['', salt, 3], ['pw', new Uint8Array(0), 5]] as const) {
      expect(toHex(pbkdf2Sha256(utf8(pw), s, n))).toBe(pbkdf2Sync(pw, s, n, 32, 'sha256').toString('hex'));
    }
  });
});

describe('derivePbkdf2', () => {
  const salt = fromHex('ffeeddccbbaa99887766554433221100');
  const expected = pbkdf2Sync('correct horse', salt, 20000, 32, 'sha256').toString('hex');

  it('uses Web Crypto where available and gets the same answer', async () => {
    withWebCrypto(true);
    expect(hasNativePbkdf2()).toBe(true);
    expect(toHex(await derivePbkdf2(utf8('correct horse'), salt, 20000))).toBe(expected);
  });

  it('falls back to the TypeScript version without Web Crypto', async () => {
    withWebCrypto(false);
    expect(hasNativePbkdf2()).toBe(false);
    expect(toHex(await derivePbkdf2(utf8('correct horse'), salt, 20000))).toBe(expected);
  });
});

describe('round counts', () => {
  it('aims a timed sample at about half a second, in whole 10,000s, within the floor and ceiling', () => {
    expect(roundsForSample(10)).toBe(500_000); // 10,000 rounds in 10 ms
    expect(roundsForSample(30)).toBe(160_000);
    expect(roundsForSample(100)).toBe(MIN_PBKDF2_ITERATIONS); // slow device: never below the floor
    expect(roundsForSample(1)).toBe(MAX_PBKDF2_ITERATIONS); // fast device: never above the ceiling
    expect(roundsForSample(0)).toBe(MAX_PBKDF2_ITERATIONS);
  });

  it('uses 600,000 rounds with Web Crypto, and a calibrated count without it', () => {
    withWebCrypto(true);
    expect(chooseIterations()).toBe(NATIVE_PBKDF2_ITERATIONS);
    withWebCrypto(false);
    const n = chooseIterations();
    expect(n).toBeGreaterThanOrEqual(MIN_PBKDF2_ITERATIONS);
    expect(n).toBeLessThanOrEqual(MAX_PBKDF2_ITERATIONS);
    expect(n % 10_000).toBe(0);
  });

  it('flags the old 20,000-round accounts for an upgrade', () => {
    withWebCrypto(true);
    expect(needsStrongerHash(20_000)).toBe(true);
    expect(needsStrongerHash(NATIVE_PBKDF2_ITERATIONS)).toBe(false);
    withWebCrypto(false);
    expect(needsStrongerHash(20_000)).toBe(true);
    expect(needsStrongerHash(MIN_PBKDF2_ITERATIONS)).toBe(false);
  });
});

describe('safeEqualHex', () => {
  it('compares exactly', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abce')).toBe(false);
    expect(safeEqualHex('abcd', 'abc')).toBe(false);
  });
});
