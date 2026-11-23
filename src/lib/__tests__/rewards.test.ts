import { describe, expect, it } from '@jest/globals';
import { effectiveRule, evaluateCard, monthSummary, rankCards, rawReward } from '../rewards';
import { card, groceryCard, NOW, travelCard, txn } from '../testing/fixtures';

describe('effectiveRule', () => {
  it('uses the category rule when there is one', () => {
    expect(effectiveRule(groceryCard, 'groceries')).toMatchObject({ ratePercent: 5, capRupees: 500, source: 'category' });
  });

  it('falls back to the base rate', () => {
    expect(effectiveRule(groceryCard, 'dining')).toMatchObject({ ratePercent: 1, capRupees: undefined, source: 'base' });
  });
});

describe('rawReward', () => {
  it('rounds down to the paisa', () => {
    expect(rawReward(2340, 5)).toBe(117);
    expect(rawReward(333, 1.5)).toBe(4.99);
  });
});

describe('evaluateCard with monthly caps', () => {
  it('subtracts rewards already earned this month from the cap', () => {
    const txns = [txn({ cardId: 'grocery', category: 'groceries', amountRupees: 2000 })]; // 5% = ₹100 earned
    const e = evaluateCard(groceryCard, 'groceries', 3000, txns, NOW);
    expect(e.capRemaining).toBe(400);
    expect(e.rewardRupees).toBe(150);
    expect(e.capLimited).toBe(false);
  });

  it('limits the reward to what is left of the cap', () => {
    const txns = [txn({ cardId: 'grocery', category: 'groceries', amountRupees: 2000 })];
    const e = evaluateCard(groceryCard, 'groceries', 10000, txns, NOW); // uncapped ₹500
    expect(e.rewardRupees).toBe(400);
    expect(e.capLimited).toBe(true);
  });

  it('ignores spend from other months', () => {
    const lastMonth = txn({
      cardId: 'grocery',
      category: 'groceries',
      amountRupees: 20000,
      date: new Date(2026, 9, 10).toISOString(),
    });
    const e = evaluateCard(groceryCard, 'groceries', 1000, [lastMonth], NOW);
    expect(e.capRemaining).toBe(500);
    expect(e.rewardRupees).toBe(50);
  });
});

describe('rankCards', () => {
  it('ranks by estimated reward', () => {
    const ranked = rankCards([groceryCard, travelCard], 'travel', 1000, [], NOW);
    expect(ranked.map((r) => r.card.id)).toEqual(['travel', 'grocery']);
    expect(ranked[0]!.rewardRupees).toBe(60);
  });

  it('breaks ties by headline rate, then by name', () => {
    const a = card({ id: 'a', nickname: 'Beta', baseRatePercent: 1 });
    const b = card({ id: 'b', nickname: 'Alpha', baseRatePercent: 1 });
    const ranked = rankCards([a, b], 'other', 1000, [], NOW);
    expect(ranked.map((r) => r.card.nickname)).toEqual(['Alpha', 'Beta']);
  });
});

describe('monthSummary', () => {
  it('totals this month only and applies caps per category', () => {
    const txns = [
      txn({ cardId: 'grocery', category: 'groceries', amountRupees: 12000 }), // 5% = 600, capped to 500
      txn({ cardId: 'grocery', category: 'dining', amountRupees: 1000 }), // 1% = 10
      txn({ cardId: 'grocery', category: 'dining', amountRupees: 5000, date: new Date(2026, 9, 1).toISOString() }),
    ];
    const s = monthSummary(groceryCard, txns, NOW);
    expect(s.count).toBe(2);
    expect(s.totalSpend).toBe(13000);
    expect(s.totalReward).toBe(510);
  });
});
