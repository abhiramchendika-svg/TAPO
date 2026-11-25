import { Platform } from 'react-native';

import { getNativeNfcSupport, NativeScanError, readNativeNdefText } from './nativeNfc';

export { openNfcSettings } from './nativeNfc';

/**
 * NFC demo trigger — web (Web NFC) and native (react-native-nfc-manager).
 *
 * What this does: reads an NDEF *text* record from an ordinary NFC sticker
 * and checks it holds a harmless demo code like "TAPO-DEMO:CAPSTONE-01".
 *
 * What it does NOT (and cannot) do: read contactless bank cards, emulate a
 * card, or make payments. This app also never writes to tags.
 *
 * Availability:
 * - Web: Chrome on Android (89+), HTTPS or localhost, after a user gesture.
 *   Not on iOS browsers or desktop browsers.
 * - Native: an iOS/Android development or release build with NFC hardware.
 *   Not in Expo Go (it can't load the NFC native module).
 */

export const DEMO_TAG_PREFIX = 'TAPO-DEMO:';
const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;

export type NfcSupport =
  | 'supported'
  | 'needs-dev-build' // native app running in Expo Go
  | 'nfc-disabled' // Android device with NFC turned off
  | 'unsupported-device' // native device without NFC hardware
  | 'insecure-context' // browser has Web NFC but page isn't HTTPS/localhost
  | 'unsupported-browser'; // e.g. Safari on iOS, Firefox, desktop Chrome

/** Short status labels for NFC support, shared by every screen that shows it. */
export const NFC_SUPPORT_LABELS: Record<NfcSupport, string> = {
  supported: 'Available',
  'needs-dev-build': 'Needs a development build',
  'nfc-disabled': 'NFC turned off',
  'unsupported-device': 'No NFC on this device',
  'insecure-context': 'Needs HTTPS or localhost',
  'unsupported-browser': 'Not supported in this browser',
};

export type NfcErrorKind =
  | 'permission-denied'
  | 'unsupported'
  | 'invalid-tag'
  | 'unreadable'
  | 'timeout'
  | 'cancelled'
  | 'unknown';

export class NfcDemoError extends Error {
  constructor(
    public kind: NfcErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/* Minimal Web NFC typings (not in TypeScript's DOM lib). */
interface NdefRecord {
  recordType: string;
  encoding?: string;
  data?: DataView;
}
interface NdefReadingEvent extends Event {
  message: { records: NdefRecord[] };
}
interface NdefReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}
type NdefReaderCtor = new () => NdefReader;

function getReaderCtor(): NdefReaderCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { NDEFReader?: NdefReaderCtor }).NDEFReader;
}

/** Works out whether this device can scan a demo tag right now. */
export async function checkNfcSupport(): Promise<NfcSupport> {
  if (Platform.OS !== 'web') return getNativeNfcSupport();
  return getWebNfcSupport();
}

function getWebNfcSupport(): NfcSupport {
  if (typeof window === 'undefined') return 'unsupported-browser';
  if (!getReaderCtor()) {
    // NDEFReader is only exposed in secure contexts, so check that first for a clearer message.
    return window.isSecureContext === false && /Android/i.test(navigator.userAgent)
      ? 'insecure-context'
      : 'unsupported-browser';
  }
  return 'supported';
}

export function isLikelyIOS(): boolean {
  if (Platform.OS === 'ios') return true;
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Validate tag text. Returns the demo session code, or throws `invalid-tag`. */
export function parseDemoTagText(text: string): string {
  const t = text.trim();
  if (!t.toUpperCase().startsWith(DEMO_TAG_PREFIX)) {
    throw new NfcDemoError('invalid-tag', `This tag isn’t a TAPO demo tag. It should contain text starting with “${DEMO_TAG_PREFIX}”.`);
  }
  const code = t.slice(DEMO_TAG_PREFIX.length).trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    throw new NfcDemoError('invalid-tag', 'The demo code on this tag is missing or malformed. Use 3–32 letters, numbers or dashes.');
  }
  // Defence in depth: refuse anything that looks like a card number.
  if (/\d{12,}/.test(code.replace(/-/g, ''))) {
    throw new NfcDemoError('invalid-tag', 'This tag contains a long number. Demo tags must not hold card details.');
  }
  return code;
}

function decodeTextRecord(record: NdefRecord): string | null {
  if (record.recordType !== 'text' || !record.data) return null;
  try {
    return new TextDecoder(record.encoding || 'utf-8').decode(record.data);
  } catch {
    return null;
  }
}

/**
 * Start listening for a demo tag. Resolves with the demo code from the first
 * valid tag, rejects with an NfcDemoError. Abort the signal to cancel.
 */
export function scanDemoTag(signal: AbortSignal): Promise<string> {
  return Platform.OS === 'web' ? scanWebDemoTag(signal) : scanNativeDemoTag(signal);
}

async function scanNativeDemoTag(signal: AbortSignal): Promise<string> {
  let text: string | null;
  try {
    text = await readNativeNdefText(signal);
  } catch (err) {
    if (err instanceof NativeScanError) throw new NfcDemoError(err.kind, err.message);
    throw new NfcDemoError('unknown', 'Something went wrong while scanning. Use Simulate tap instead.');
  }
  if (text === null) {
    throw new NfcDemoError('invalid-tag', 'This tag has no text record. Write a text record like “TAPO-DEMO:CAPSTONE-01”.');
  }
  return parseDemoTagText(text);
}

function scanWebDemoTag(signal: AbortSignal): Promise<string> {
  const Reader = getReaderCtor();
  if (!Reader) {
    return Promise.reject(new NfcDemoError('unsupported', 'NFC scanning isn’t available in this browser.'));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new Reader();
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    signal.addEventListener('abort', () =>
      finish(() => reject(new NfcDemoError('cancelled', 'Scanning cancelled.'))),
    );

    reader.addEventListener('reading', (e) => {
      const { message } = e as NdefReadingEvent;
      const texts = (message?.records ?? []).map(decodeTextRecord).filter((t): t is string => t !== null);
      if (texts.length === 0) {
        finish(() =>
          reject(new NfcDemoError('invalid-tag', 'This tag has no text record. Write a text record like “TAPO-DEMO:CAPSTONE-01”.')),
        );
        return;
      }
      try {
        const code = parseDemoTagText(texts[0]!);
        finish(() => resolve(code));
      } catch (err) {
        finish(() => reject(err));
      }
    });

    reader.addEventListener('readingerror', () =>
      finish(() =>
        reject(new NfcDemoError('unreadable', 'The tag couldn’t be read. Hold it still against the back of the phone and try again.')),
      ),
    );

    reader.scan({ signal }).catch((err: unknown) => {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError') {
        finish(() =>
          reject(
            new NfcDemoError(
              'permission-denied',
              'NFC permission was denied. Allow NFC for this site in Chrome’s site settings, and check NFC is on in Android settings.',
            ),
          ),
        );
      } else if (name === 'NotSupportedError' || name === 'NotReadableError') {
        finish(() =>
          reject(new NfcDemoError('unsupported', 'This device can’t scan NFC right now. Check NFC is turned on, or use Simulate tap.')),
        );
      } else if (name === 'AbortError') {
        finish(() => reject(new NfcDemoError('cancelled', 'Scanning cancelled.')));
      } else {
        finish(() => reject(new NfcDemoError('unknown', 'Something went wrong starting the NFC scan. Use Simulate tap instead.')));
      }
    });
  });
}

/** Dummy transaction ID, e.g. DEMO-20261121-7KQ2XM. Not a real reference number. */
export function makeDemoTransactionId(now = new Date()): string {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DEMO-${ymd}-${suffix}`;
}
