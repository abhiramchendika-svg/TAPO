import { describe, expect, it } from '@jest/globals';
import { makeDemoTransactionId, NfcDemoError, parseDemoTagText } from '../demoNfc';

describe('parseDemoTagText', () => {
  it('reads the demo code and normalises its case', () => {
    expect(parseDemoTagText('TAPO-DEMO:CAPSTONE-01')).toBe('CAPSTONE-01');
    expect(parseDemoTagText('  tapo-demo:capstone-01  ')).toBe('CAPSTONE-01');
  });

  it('rejects tags without the TAPO demo prefix', () => {
    expect(() => parseDemoTagText('hello world')).toThrow(NfcDemoError);
    expect(() => parseDemoTagText('https://example.com')).toThrow(/isn’t a TAPO demo tag/);
  });

  it('rejects missing or malformed codes', () => {
    expect(() => parseDemoTagText('TAPO-DEMO:')).toThrow(/missing or malformed/);
    expect(() => parseDemoTagText('TAPO-DEMO:AB')).toThrow(/missing or malformed/);
    expect(() => parseDemoTagText('TAPO-DEMO:has spaces')).toThrow(/missing or malformed/);
  });

  it('refuses tags that contain card-number-like digits', () => {
    expect(() => parseDemoTagText('TAPO-DEMO:4111111111111111')).toThrow(/must not hold card details/);
    expect(() => parseDemoTagText('TAPO-DEMO:4111-1111-1111-1111')).toThrow(/must not hold card details/);
  });

  it('reports the error kind for the UI', () => {
    expect.assertions(1);
    try {
      parseDemoTagText('nope');
    } catch (e) {
      expect((e as NfcDemoError).kind).toBe('invalid-tag');
    }
  });
});

describe('makeDemoTransactionId', () => {
  it('produces a dated, clearly-demo ID', () => {
    const id = makeDemoTransactionId(new Date(2026, 10, 21));
    expect(id).toMatch(/^DEMO-20261121-[A-Z2-9]{6}$/);
  });
});
