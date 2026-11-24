// Minimal types for the parts of Node's crypto module that the password tests compare against.
// (Jest runs in Node; the app itself never imports this module.)
declare module 'crypto' {
  interface Digest {
    update(data: string): Digest;
    digest(encoding: 'hex'): string;
  }
  export function createHash(algorithm: 'sha256'): Digest;
  export function createHmac(algorithm: 'sha256', key: string): Digest;
  export function pbkdf2Sync(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: 'sha256',
  ): { toString(encoding: 'hex'): string };
}
