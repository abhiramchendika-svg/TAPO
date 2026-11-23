import { describe, expect, it } from '@jest/globals';
import { dayKey, formatDayLabel, formatPercent, formatRupees, formatTime, initials, rupeesA11y } from '../format';
import { NOW } from '../testing/fixtures';

describe('formatRupees', () => {
  it('uses Indian digit grouping', () => {
    expect(formatRupees(1234567)).toBe('₹12,34,567');
    expect(formatRupees(100000)).toBe('₹1,00,000');
    expect(formatRupees(999)).toBe('₹999');
  });

  it('shows paise only when needed, or when asked', () => {
    expect(formatRupees(45)).toBe('₹45');
    expect(formatRupees(45.5)).toBe('₹45.50');
    expect(formatRupees(45, { decimals: true })).toBe('₹45.00');
  });

  it('formats negatives with a true minus sign', () => {
    expect(formatRupees(-2340)).toBe('−₹2,340');
  });

  it('has a spoken form for screen readers', () => {
    expect(rupeesA11y(2340)).toBe('2,340 rupees');
  });
});

describe('dates and labels', () => {
  it('formats 12-hour times', () => {
    expect(formatTime(new Date(2026, 10, 20, 9, 5).toISOString())).toBe('9:05 am');
    expect(formatTime(new Date(2026, 10, 20, 0, 30).toISOString())).toBe('12:30 am');
    expect(formatTime(new Date(2026, 10, 20, 15, 0).toISOString())).toBe('3:00 pm');
  });

  it('labels today, yesterday and older days', () => {
    expect(formatDayLabel(new Date(2026, 10, 20, 8).toISOString(), NOW)).toBe('Today');
    expect(formatDayLabel(new Date(2026, 10, 19, 23).toISOString(), NOW)).toBe('Yesterday');
    expect(formatDayLabel(new Date(2026, 10, 17, 10).toISOString(), NOW)).toBe('Tue, 17 Nov 2026');
  });

  it('groups by local calendar day', () => {
    const a = new Date(2026, 10, 20, 0, 1).toISOString();
    const b = new Date(2026, 10, 20, 23, 59).toISOString();
    expect(dayKey(a)).toBe(dayKey(b));
  });

  it('formats percentages without trailing zeros', () => {
    expect(formatPercent(5)).toBe('5%');
    expect(formatPercent(0.25)).toBe('0.25%');
    expect(formatPercent(2.5)).toBe('2.5%');
  });

  it('makes initials from a display name', () => {
    expect(initials('Priya Rao')).toBe('PR');
    expect(initials('abhiram')).toBe('A');
  });
});
