import type { Card, Category, Transaction, WalletData } from './types';

/**
 * All data here is fictional sample data. Issuers are made-up names and the
 * reward rules are illustrative only — they do not describe any real product.
 */
export const SAMPLE_CARDS: Card[] = [
  {
    id: 'sample_everyday',
    nickname: 'Everyday Cashback',
    issuer: 'Sample Bank Alpha',
    network: 'RuPay',
    type: 'Credit',
    last4: '0001',
    baseRatePercent: 1,
    rules: [
      { id: 'r1', category: 'groceries', ratePercent: 5, monthlyCapRupees: 500 },
      { id: 'r2', category: 'utilities', ratePercent: 2 },
    ],
    color: '#2B4570',
    isSample: true,
  },
  {
    id: 'sample_travel',
    nickname: 'Travel Miles',
    issuer: 'Demo Bank Beta',
    network: 'Visa',
    type: 'Credit',
    last4: '0002',
    baseRatePercent: 0.5,
    rules: [
      { id: 'r3', category: 'travel', ratePercent: 6, monthlyCapRupees: 1500 },
      { id: 'r4', category: 'dining', ratePercent: 3 },
    ],
    color: '#1F5A55',
    isSample: true,
  },
  {
    id: 'sample_online',
    nickname: 'Online Saver',
    issuer: 'Example Co-op Bank',
    network: 'Mastercard',
    type: 'Credit',
    last4: '0003',
    baseRatePercent: 1,
    rules: [
      { id: 'r5', category: 'online', ratePercent: 7, monthlyCapRupees: 300 },
      { id: 'r6', category: 'entertainment', ratePercent: 4 },
    ],
    color: '#6E2A33',
    isSample: true,
  },
  {
    id: 'sample_debit',
    nickname: 'Salary Debit',
    issuer: 'Placeholder Finance',
    network: 'RuPay',
    type: 'Debit',
    last4: '0004',
    baseRatePercent: 0.25,
    rules: [{ id: 'r7', category: 'fuel', ratePercent: 2.5, monthlyCapRupees: 200 }],
    color: '#3B3F46',
    isSample: true,
  },
];

type Seed = [cardId: string, merchant: string, category: Category, amount: number, daysAgo: number];

const SEEDS: Seed[] = [
  ['sample_everyday', 'Sample Fresh Mart', 'groceries', 2340, 0],
  ['sample_online', 'Demo Online Store', 'online', 1899, 1],
  ['sample_travel', 'Example Rail Booking', 'travel', 1265, 2],
  ['sample_travel', 'Placeholder Café', 'dining', 640, 3],
  ['sample_debit', 'Sample Fuel Station', 'fuel', 3000, 4],
  ['sample_everyday', 'Demo Electricity Board', 'utilities', 1820, 5],
  ['sample_online', 'Example Streaming', 'entertainment', 499, 6],
  ['sample_everyday', 'Sample Kirana Store', 'groceries', 865, 8],
  ['sample_travel', 'Demo Airline', 'travel', 7450, 10],
  ['sample_debit', 'Placeholder Pharmacy', 'other', 420, 12],
  ['sample_online', 'Demo Online Store', 'online', 3150, 14],
  ['sample_travel', 'Sample Biryani House', 'dining', 1120, 18],
  ['sample_everyday', 'Example Mobile Recharge', 'utilities', 399, 22],
  ['sample_debit', 'Sample Fuel Station', 'fuel', 2500, 27],
  ['sample_everyday', 'Sample Fresh Mart', 'groceries', 1975, 33],
  ['sample_online', 'Example Cinema', 'entertainment', 760, 38],
];

/** Builds sample transactions with dates relative to today, so "this month" is meaningful. */
export function buildSampleTransactions(now = new Date()): Transaction[] {
  return SEEDS.map(([cardId, merchant, category, amountRupees, daysAgo], i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(10 + (i % 9), (i * 7) % 60, 0, 0);
    return { id: `sample_txn_${i}`, cardId, merchant, category, amountRupees, date: d.toISOString(), isSample: true };
  });
}

export function buildDemoData(now = new Date()): WalletData {
  return {
    version: 1,
    cards: SAMPLE_CARDS.map((c) => ({ ...c, rules: c.rules.map((r) => ({ ...r })) })),
    transactions: buildSampleTransactions(now),
  };
}

export const CARD_COLORS = ['#2B4570', '#1F5A55', '#6E2A33', '#3B3F46', '#7A5A2E', '#2E4A36'];
