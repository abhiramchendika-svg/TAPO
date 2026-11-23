import { describe, expect, it } from '@jest/globals';
import {
  looksLikeCardNumber,
  parseNumber,
  validateAmount,
  validateCap,
  validateDisplayName,
  validateLast4,
  validateNickname,
  validateRate,
} from '../validation';

describe('card safety checks', () => {
  it('accepts exactly four digits for the last four', () => {
    expect(validateLast4('0001')).toBeNull();
    expect(validateLast4('123')).not.toBeNull();
    expect(validateLast4('12345')).not.toBeNull();
    expect(validateLast4('12a4')).not.toBeNull();
  });

  it('detects text that looks like a full card number', () => {
    expect(looksLikeCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(looksLikeCardNumber('4111-1111-1111-1111')).toBe(true);
    expect(looksLikeCardNumber('Groceries card')).toBe(false);
    expect(looksLikeCardNumber('Card 0001')).toBe(false);
  });

  it('requires a sensible nickname', () => {
    expect(validateNickname('')).not.toBeNull();
    expect(validateNickname('Travel Miles')).toBeNull();
    expect(validateNickname('x'.repeat(25))).not.toBeNull();
  });
});

describe('numbers and amounts', () => {
  it('parses plain numbers and rejects anything else', () => {
    expect(parseNumber('1,250.50')).toBe(1250.5);
    expect(Number.isNaN(parseNumber('12abc'))).toBe(true);
    expect(Number.isNaN(parseNumber('-5'))).toBe(true);
  });

  it('validates purchase amounts', () => {
    expect(validateAmount('')).not.toBeNull();
    expect(validateAmount('0')).not.toBeNull();
    expect(validateAmount('2500')).toBeNull();
    expect(validateAmount('1000001')).not.toBeNull();
  });

  it('validates reward rates and optional caps', () => {
    expect(validateRate('5')).toBeNull();
    expect(validateRate('21')).not.toBeNull();
    expect(validateCap('')).toBeNull();
    expect(validateCap('500')).toBeNull();
    expect(validateCap('0')).not.toBeNull();
  });
});

describe('display name', () => {
  it('allows letters from any script and simple punctuation', () => {
    expect(validateDisplayName('Priya Rao')).toBeNull();
    expect(validateDisplayName("D'Souza-Nair")).toBeNull();
    expect(validateDisplayName('अभिराम')).toBeNull();
  });

  it('rejects digits so numbers cannot be stored as a name', () => {
    expect(validateDisplayName('Asha 1234')).not.toBeNull();
    expect(validateDisplayName('')).not.toBeNull();
  });
});
