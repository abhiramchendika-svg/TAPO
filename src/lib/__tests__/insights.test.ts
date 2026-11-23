import { describe, expect, it } from '@jest/globals';
import { buildInsights, monthLabel, previousMonth } from '../insights';
import { groceryCard, NOW, travelCard, txn } from '../testing/fixtures';

describe('buildInsights', () => {
  const txns = [
    txn({ cardId: 'grocery', category: 'groceries', amountRupees: 2000 }), // best card already used
    txn({ cardId: 'grocery', category: 'travel', amountRupees: 1000 }), // travel card is better: 6% vs 1%
    txn({ cardId: 'grocery', category: 'travel', amountRupees: 3000 }),
    txn({ cardId: 'travel', category: 'dining', amountRupees: 500, date: new Date(2026, 9, 3).toISOString() }), // last month
  ];

  it('totals this month and computes category shares', () => {
    const i = buildInsights([groceryCard, travelCard], txns, NOW);
    expect(i.count).toBe(3);
    expect(i.totalSpend).toBe(6000);
    expect(i.categories.map((c) => c.category)).toEqual(['travel', 'groceries']);
    expect(i.categories[0]!.share).toBeCloseTo(4000 / 6000);
  });

  it('suggests a better card where one exists, with the extra reward', () => {
    const i = buildInsights([groceryCard, travelCard], txns, NOW);
    expect(i.tips).toHaveLength(1);
    const tip = i.tips[0]!;
    expect(tip.category).toBe('travel');
    expect(tip.bestCard.id).toBe('travel');
    expect(tip.count).toBe(2);
    expect(tip.extra).toBe(200); // (60 - 10) + (180 - 30)
    expect(tip.averageAmount).toBe(2000);
  });

  it('gives no tips when there is only one card', () => {
    expect(buildInsights([groceryCard], txns, NOW).tips).toEqual([]);
  });

  it('handles an empty month', () => {
    const i = buildInsights([groceryCard], [], NOW);
    expect(i).toMatchObject({ count: 0, totalSpend: 0, totalReward: 0, rewardRate: 0 });
  });
});

describe('month helpers', () => {
  it('labels and steps back a month', () => {
    expect(monthLabel(NOW)).toBe('November 2026');
    expect(monthLabel(previousMonth(new Date(2026, 0, 31)))).toBe('December 2025');
  });
});
