import type { Card, Transaction } from '../types';

/** A fixed "now" so date-based tests are stable: 20 Nov 2026, noon local time. */
export const NOW = new Date(2026, 10, 20, 12, 0, 0);

export function card(partial: Partial<Card> & Pick<Card, 'id' | 'nickname'>): Card {
  return {
    issuer: 'Sample Bank Alpha',
    network: 'RuPay',
    type: 'Credit',
    last4: '0001',
    baseRatePercent: 1,
    rules: [],
    color: '#1E3A8A',
    isSample: true,
    ...partial,
  };
}

let n = 0;
export function txn(partial: Partial<Transaction> & Pick<Transaction, 'cardId' | 'category' | 'amountRupees'>): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    merchant: 'Test Merchant',
    date: new Date(2026, 10, 18, 10, 0, 0).toISOString(),
    isSample: true,
    ...partial,
  };
}

export const groceryCard = card({
  id: 'grocery',
  nickname: 'Grocery Card',
  baseRatePercent: 1,
  rules: [{ id: 'g', category: 'groceries', ratePercent: 5, monthlyCapRupees: 500 }],
});

export const travelCard = card({
  id: 'travel',
  nickname: 'Travel Card',
  baseRatePercent: 0.5,
  rules: [{ id: 't', category: 'travel', ratePercent: 6 }],
});
