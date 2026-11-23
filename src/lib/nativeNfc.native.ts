import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Native (iOS / Android) NFC for the demo, via react-native-nfc-manager.
 *
 * Reads the NDEF text record on an ordinary NFC sticker and returns its text.
 * It never selects payment applications, never reads bank cards, never
 * emulates a card and never writes to tags.
 *
 * The library throws at import time when its native module is missing (e.g.
 * in Expo Go), so it is loaded lazily and failures are reported as
 * `needs-dev-build` instead of crashing the app.
 */

type NfcLib = typeof import('react-native-nfc-manager');

export type NativeNfcSupport = 'supported' | 'needs-dev-build' | 'nfc-disabled' | 'unsupported-device';

export type NativeScanErrorKind = 'cancelled' | 'timeout' | 'unsupported' | 'unreadable' | 'unknown';

export class NativeScanError extends Error {
  constructor(
    public kind: NativeScanErrorKind,
    message: string,
  ) {
    super(message);
  }
}

let lib: NfcLib | null | undefined;
let started = false;

function loadLib(): NfcLib | null {
  if (lib !== undefined) return lib;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    lib = null; // Expo Go can't contain third-party native modules.
    return lib;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('react-native-nfc-manager') as NfcLib;
  } catch {
    lib = null;
  }
  return lib;
}

async function ensureStarted(l: NfcLib): Promise<void> {
  if (started) return;
  await l.default.start();
  started = true;
}

export async function getNativeNfcSupport(): Promise<NativeNfcSupport> {
  const l = loadLib();
  if (!l) return 'needs-dev-build';
  try {
    const supported = await l.default.isSupported();
    if (!supported) return 'unsupported-device';
    await ensureStarted(l);
    // isEnabled is meaningful on Android; iOS reports true when supported.
    if (Platform.OS === 'android' && !(await l.default.isEnabled())) return 'nfc-disabled';
    return 'supported';
  } catch {
    return 'unsupported-device';
  }
}

/** Android only: opens the system NFC settings screen. */
export async function openNfcSettings(): Promise<void> {
  const l = loadLib();
  if (l && Platform.OS === 'android') await l.default.goToNfcSetting();
}

/**
 * Wait for one NFC tag and return the text of its first NDEF text record
 * (or null if it has none). Abort the signal to cancel.
 */
export async function readNativeNdefText(signal: AbortSignal): Promise<string | null> {
  const l = loadLib();
  if (!l) throw new NativeScanError('unsupported', 'NFC needs a development build of TAPO. Use Simulate tap in Expo Go.');
  const { default: NfcManager, NfcTech, Ndef, NfcError } = l;

  const onAbort = () => {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  };
  signal.addEventListener('abort', onAbort);

  try {
    await ensureStarted(l);
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold the top of your iPhone near the TAPO demo tag.',
    });
    if (signal.aborted) throw new NativeScanError('cancelled', 'Scanning cancelled.');

    const tag = await NfcManager.getTag();
    const records = tag?.ndefMessage ?? [];
    const textRecord = records.find((r) => Ndef.isType(r, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT));
    const text = textRecord ? Ndef.text.decodePayload(Uint8Array.from(textRecord.payload)) : null;

    if (Platform.OS === 'ios') {
      await NfcManager.setAlertMessageIOS(text ? 'Demo tag read' : 'Not a TAPO demo tag').catch(() => {});
    }
    return text;
  } catch (err) {
    if (err instanceof NativeScanError) throw err;
    if (signal.aborted || err instanceof NfcError.UserCancel) {
      throw new NativeScanError('cancelled', 'Scanning cancelled.');
    }
    if (err instanceof NfcError.Timeout) {
      throw new NativeScanError('timeout', 'No tag was found in time. Tap Scan again and hold the tag still.');
    }
    if (err instanceof NfcError.RadioDisabled) {
      throw new NativeScanError('unsupported', 'NFC is turned off. Turn it on in Settings and try again.');
    }
    if (err instanceof NfcError.TagConnectionLost || err instanceof NfcError.FirstNdefInvalid) {
      throw new NativeScanError('unreadable', 'The tag couldn’t be read. Hold it still against the phone and try again.');
    }
    throw new NativeScanError('unknown', 'Something went wrong while scanning. Try again or use Simulate tap.');
  } finally {
    signal.removeEventListener('abort', onAbort);
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}
