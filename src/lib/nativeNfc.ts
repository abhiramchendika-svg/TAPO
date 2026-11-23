/**
 * Web stub for native NFC. The real implementation is nativeNfc.native.ts,
 * which Metro picks for iOS/Android. Web uses Web NFC in demoNfc.ts instead,
 * and react-native-nfc-manager is never bundled for web.
 */

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

export async function getNativeNfcSupport(): Promise<NativeNfcSupport> {
  return 'unsupported-device';
}

export async function openNfcSettings(): Promise<void> {}

export async function readNativeNdefText(_signal: AbortSignal): Promise<string | null> {
  throw new NativeScanError('unsupported', 'Native NFC isn’t available on the web.');
}
