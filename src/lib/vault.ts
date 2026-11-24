/**
 * Encryption at rest for each account's wallet.
 *
 * From the password we derive one master secret with PBKDF2-SHA256 (see password.ts), then split it
 * with HMAC into two independent values:
 *   - a verifier, stored with the account, used only to check the password;
 *   - a 256-bit AES key, never stored, used to encrypt the wallet with AES-256-GCM.
 * So the stored data can only be read by someone who knows the password.
 */
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';

import { hmacSha256, utf8 } from './password';

export function verifierFrom(master: Uint8Array): Uint8Array {
  return hmacSha256(master, utf8('tapo/verify/v2'));
}

export function encryptionKeyBytesFrom(master: Uint8Array): Uint8Array {
  return hmacSha256(master, utf8('tapo/encrypt/v2'));
}

export function importKey(bytes: Uint8Array): Promise<AESEncryptionKey> {
  return AESEncryptionKey.import(bytes);
}

/** Envelope written to storage. Anything without `alg` is treated as old plaintext data. */
interface Envelope {
  v: 1;
  alg: 'AES-256-GCM';
  data: string; // base64 of iv + ciphertext + tag
}

export function isEnvelope(x: unknown): x is Envelope {
  const e = x as Envelope;
  return !!e && e.v === 1 && e.alg === 'AES-256-GCM' && typeof e.data === 'string';
}

export async function sealJson(value: unknown, key: AESEncryptionKey, aad: string): Promise<string> {
  const plain = utf8(JSON.stringify(value));
  const sealed = await aesEncryptAsync(plain, key, { additionalData: utf8(aad) });
  const env: Envelope = { v: 1, alg: 'AES-256-GCM', data: await sealed.combined('base64') };
  return JSON.stringify(env);
}

/** Returns the decrypted value, or throws if the key is wrong or the data was tampered with. */
export async function openJson(env: Envelope, key: AESEncryptionKey, aad: string): Promise<unknown> {
  const sealed = AESSealedData.fromCombined(env.data);
  const bytes = await aesDecryptAsync(sealed, key, { additionalData: utf8(aad) });
  return JSON.parse(new TextDecoder().decode(bytes));
}
