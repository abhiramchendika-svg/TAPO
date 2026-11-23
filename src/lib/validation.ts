export const LIMITS = {
  nicknameMax: 24,
  rateMax: 20,
  capMax: 100000,
  amountMax: 1000000,
} as const;

export function validateNickname(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Enter a nickname so you can recognise this card.';
  if (t.length > LIMITS.nicknameMax) return `Keep the nickname to ${LIMITS.nicknameMax} characters or fewer.`;
  return null;
}

export const DISPLAY_NAME_MAX = 24;

/** Letters (any script), spaces and . ' - only — no digits, so numbers can't be stored here. */
export function validateDisplayName(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Enter a name, or tap Cancel.';
  if (t.length > DISPLAY_NAME_MAX) return `Keep it to ${DISPLAY_NAME_MAX} characters or fewer.`;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(t)) return 'Use letters only (spaces, . \' and - are fine).';
  return null;
}

export function validateLast4(v: string): string | null {
  if (!v) return 'Enter the last four digits.';
  if (!/^\d{4}$/.test(v)) return 'Use exactly 4 digits (0–9).';
  return null;
}

/** Parse a decimal string; returns NaN for anything that isn't a plain number. */
export function parseNumber(v: string): number {
  const t = v.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export function validateRate(v: string): string | null {
  const n = parseNumber(v);
  if (v.trim() === '') return 'Enter a rate.';
  if (Number.isNaN(n)) return 'Use a number, e.g. 1.5';
  if (n > LIMITS.rateMax) return `Sample rates are limited to ${LIMITS.rateMax}%.`;
  return null;
}

export function validateCap(v: string): string | null {
  if (v.trim() === '') return null; // optional
  const n = parseNumber(v);
  if (Number.isNaN(n) || n <= 0) return 'Cap must be a positive rupee amount, or leave it blank.';
  if (n > LIMITS.capMax) return 'That cap is unrealistically high for a sample.';
  return null;
}

export function validateAmount(v: string): string | null {
  if (v.trim() === '') return 'Enter the purchase amount.';
  const n = parseNumber(v);
  if (Number.isNaN(n)) return 'Use digits only, e.g. 2500';
  if (n <= 0) return 'Amount must be more than ₹0.';
  if (n > LIMITS.amountMax) return 'For this demo, keep amounts up to ₹10,00,000.';
  return null;
}

/**
 * Reject anything that looks like a full card number pasted into a text
 * field (12+ digits in a row, allowing spaces/dashes).
 */
export function looksLikeCardNumber(v: string): boolean {
  return /(?:\d[\s-]?){12,}/.test(v);
}
