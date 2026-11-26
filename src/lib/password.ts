/**
 * Password hashing for on-device accounts: PBKDF2-HMAC-SHA256. The password itself is never stored —
 * only a random salt and the derived hash. Unit-tested against Node's own PBKDF2.
 *
 * - Web (HTTPS or localhost): the browser's Web Crypto does the work natively, at 600,000 rounds
 *   (OWASP's recommendation for PBKDF2-HMAC-SHA256).
 * - Everywhere else (Expo Go, iOS/Android builds, plain-http pages): a tuned TypeScript version that
 *   runs the same everywhere. The round count is calibrated on the device so unlocking takes about
 *   half a second, and is never below 100,000.
 * Each account stores its own round count, so older accounts are upgraded when they next sign in.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 of a byte array. */
export function sha256(data: Uint8Array): Uint8Array {
  const len = data.length;
  const blocks = Math.ceil((len + 9) / 64);
  const buf = new Uint8Array(blocks * 64);
  buf.set(data);
  buf[len] = 0x80;
  const bitLen = len * 8;
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(buf.length - 4, bitLen >>> 0);

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!, b = w[i - 2]!;
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h[0]!, b = h[1]!, c = h[2]!, d = h[3]!, e = h[4]!, f = h[5]!, g = h[6]!, hh = h[7]!;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0; h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0; h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i]!);
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** HMAC-SHA256 with pre-padded key blocks (reused across PBKDF2 iterations). */
function hmacPads(key: Uint8Array) {
  let k = key.length > 64 ? sha256(key) : key;
  const block = new Uint8Array(64);
  block.set(k);
  k = block;
  const ipad = new Uint8Array(64), opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = k[i]! ^ 0x36;
    opad[i] = k[i]! ^ 0x5c;
  }
  return (msg: Uint8Array) => sha256(concat(opad, sha256(concat(ipad, msg))));
}

export function hmacSha256(key: Uint8Array, msg: Uint8Array): Uint8Array {
  return hmacPads(key)(msg);
}

const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const W = new Uint32Array(64);

/** One SHA-256 compression of a 16-word block into `st` (updated in place). */
function compress(st: Uint32Array, block: Uint32Array): void {
  for (let i = 0; i < 16; i++) W[i] = block[i]!;
  for (let i = 16; i < 64; i++) {
    const a = W[i - 15]!, b = W[i - 2]!;
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    W[i] = (W[i - 16]! + s0 + W[i - 7]! + s1) >>> 0;
  }
  let a = st[0]!, b = st[1]!, c = st[2]!, d = st[3]!, e = st[4]!, f = st[5]!, g = st[6]!, h = st[7]!;
  for (let i = 0; i < 64; i++) {
    const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i]! + W[i]!) >>> 0;
    const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  st[0] = (st[0]! + a) >>> 0; st[1] = (st[1]! + b) >>> 0; st[2] = (st[2]! + c) >>> 0; st[3] = (st[3]! + d) >>> 0;
  st[4] = (st[4]! + e) >>> 0; st[5] = (st[5]! + f) >>> 0; st[6] = (st[6]! + g) >>> 0; st[7] = (st[7]! + h) >>> 0;
}

/**
 * PBKDF2-HMAC-SHA256, 32-byte output, in plain TypeScript.
 * The HMAC inner and outer pad blocks are hashed once, so each round is exactly two SHA-256
 * compressions with no allocation — about 6× faster than hashing through `hmacSha256` each round.
 */
export function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array {
  const key = new Uint8Array(64);
  key.set(password.length > 64 ? sha256(password) : password);
  const ipad = new Uint32Array(16), opad = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    const k = ((key[i * 4]! << 24) | (key[i * 4 + 1]! << 16) | (key[i * 4 + 2]! << 8) | key[i * 4 + 3]!) >>> 0;
    ipad[i] = (k ^ 0x36363636) >>> 0;
    opad[i] = (k ^ 0x5c5c5c5c) >>> 0;
  }
  const inner = Uint32Array.from(IV), outer = Uint32Array.from(IV);
  compress(inner, ipad);
  compress(outer, opad);

  // Round 1: U1 = HMAC(password, salt || INT(1)); runs once, so the general HMAC is fine here.
  const first = new Uint8Array(salt.length + 4);
  first.set(salt);
  first[salt.length + 3] = 1; // block index 1, big-endian
  const u1 = hmacSha256(password, first);
  const u = new Uint32Array(8), out = new Uint32Array(8);
  for (let i = 0; i < 8; i++) {
    u[i] = ((u1[i * 4]! << 24) | (u1[i * 4 + 1]! << 16) | (u1[i * 4 + 2]! << 8) | u1[i * 4 + 3]!) >>> 0;
    out[i] = u[i]!;
  }

  // Rounds 2..n: each hashes a 32-byte value after a 64-byte pad block, so one padded block each.
  const block = new Uint32Array(16);
  block[8] = 0x80000000;
  block[15] = (64 + 32) * 8;
  const st = new Uint32Array(8);
  for (let r = 1; r < iterations; r++) {
    for (let i = 0; i < 8; i++) block[i] = u[i]!;
    st.set(inner);
    compress(st, block);
    for (let i = 0; i < 8; i++) block[i] = st[i]!;
    st.set(outer);
    compress(st, block);
    for (let i = 0; i < 8; i++) {
      u[i] = st[i]!;
      out[i] = (out[i]! ^ st[i]!) >>> 0;
    }
  }

  const res = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    res[i * 4] = out[i]! >>> 24;
    res[i * 4 + 1] = (out[i]! >>> 16) & 0xff;
    res[i * 4 + 2] = (out[i]! >>> 8) & 0xff;
    res[i * 4 + 3] = out[i]! & 0xff;
  }
  return res;
}

/** Web Crypto's PBKDF2, where the platform has it (browsers on HTTPS or localhost). */
function webSubtle(): SubtleCrypto | null {
  const g = globalThis as { crypto?: Crypto; isSecureContext?: boolean };
  if (g.isSecureContext === false) return null;
  const subtle = g.crypto?.subtle;
  return subtle && typeof subtle.deriveBits === 'function' ? subtle : null;
}

export function hasNativePbkdf2(): boolean {
  return webSubtle() !== null;
}

/** PBKDF2-HMAC-SHA256 (32 bytes) using Web Crypto when available, else the TypeScript version. */
export async function derivePbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = webSubtle();
  if (subtle) {
    try {
      const key = await subtle.importKey('raw', password as BufferSource, 'PBKDF2', false, ['deriveBits']);
      const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
      return new Uint8Array(bits);
    } catch {
      // Fall through to the TypeScript version (same result, just slower).
    }
  }
  return pbkdf2Sha256(password, salt, iterations);
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s.normalize('NFKC'));
}

export function toHex(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i]!.toString(16).padStart(2, '0');
  return s;
}

export function fromHex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

/** Compares two hex strings in time that doesn't depend on where they differ. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Rounds when Web Crypto does the work: OWASP's recommendation for PBKDF2-HMAC-SHA256. */
export const NATIVE_PBKDF2_ITERATIONS = 600_000;
/** Floor and ceiling for the TypeScript version, which is calibrated per device. */
export const MIN_PBKDF2_ITERATIONS = 100_000;
export const MAX_PBKDF2_ITERATIONS = 600_000;
/** How long unlocking should take with the TypeScript version. */
const TARGET_MS = 500;
const SAMPLE_ROUNDS = 10_000;

let calibrated: number | null = null;

/** Turns a timed sample into a round count: aimed at TARGET_MS, whole 10,000s, within the floor and ceiling. */
export function roundsForSample(sampleMs: number): number {
  if (!(sampleMs > 0)) return MAX_PBKDF2_ITERATIONS;
  const rounds = Math.floor(((TARGET_MS / sampleMs) * SAMPLE_ROUNDS) / 10_000) * 10_000;
  return Math.min(MAX_PBKDF2_ITERATIONS, Math.max(MIN_PBKDF2_ITERATIONS, rounds));
}

/**
 * Rounds for a new password hash on this device. With Web Crypto: 600,000. Otherwise a short timed
 * sample (measured once per app run) sets it so unlocking takes about half a second.
 */
export function chooseIterations(): number {
  if (hasNativePbkdf2()) return NATIVE_PBKDF2_ITERATIONS;
  if (calibrated === null) {
    const now = () => globalThis.performance?.now?.() ?? Date.now();
    const t0 = now();
    pbkdf2Sha256(utf8('calibration'), new Uint8Array(16), SAMPLE_ROUNDS);
    calibrated = roundsForSample(now() - t0);
  }
  return calibrated;
}

/** Whether an account's stored round count is below what this device should use. */
export function needsStrongerHash(iterations: number): boolean {
  return iterations < (hasNativePbkdf2() ? NATIVE_PBKDF2_ITERATIONS : MIN_PBKDF2_ITERATIONS);
}
