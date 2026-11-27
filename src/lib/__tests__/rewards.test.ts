import { describe, expect, it } from '@jest/globals';
import { effectiveRule, evaluateCard, monthSummary, quickReason, rankByRate, rankCards, rateNow, rawReward } from '../rewards';
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

describe('rankByRate (one tap, no amount)', () => {
  const flatTwo = card({ id: 'flat', nickname: 'Flat Two', baseRatePercent: 2 });
  const topId = (q: ReturnType<typeof rankByRate>) => q.ranked[0]!.card.id;
  /** The card rankCards puts first for an amount, to check the one-tap answer against the exact maths. */
  const exactTop = (cards: typeof flatTwo[], amount: number, txns: ReturnType<typeof txn>[] = []) =>
    rankCards(cards, 'groceries', amount, txns, NOW)[0]!.card.id;

  it('ranks by the rate each card pays right now', () => {
    const q = rankByRate([travelCard, groceryCard], 'groceries', [], NOW);
    expect(q.ranked.map((e) => e.card.id)).toEqual(['grocery', 'travel']);
    expect(q.ranked.map(rateNow)).toEqual([5, 0.5]);
  });

  it('puts a card whose monthly cap is used up at the bottom', () => {
    const txns = [txn({ cardId: 'grocery', category: 'groceries', amountRupees: 10000 })]; // 5% = ₹500, the whole cap
    const q = rankByRate([groceryCard, flatTwo], 'groceries', txns, NOW);
    expect(topId(q)).toBe('flat');
    expect(rateNow(q.ranked[1]!)).toBe(0);
    expect(quickReason(q.ranked[1]!, 'groceries')).toMatch(/monthly cap is used up/);
  });

  it('says from what amount another card earns more, matching the exact ranking either side', () => {
    const txns = [txn({ cardId: 'grocery', category: 'groceries', amountRupees: 2000 })]; // ₹100 used, ₹400 left
    const q = rankByRate([groceryCard, flatTwo], 'groceries', txns, NOW);
    expect(topId(q)).toBe('grocery');
    expect(q.switchAt).toEqual({ amount: 20001, card: flatTwo });
    expect(exactTop([groceryCard, flatTwo], 20001, txns)).toBe('flat');
    expect(exactTop([groceryCard, flatTwo], 20000, txns)).toBe('grocery');
  });

  it('works out the switch for low base rates too', () => {
    const lowBase = card({ id: 'low', nickname: 'Low Base', baseRatePercent: 0.5 });
    const q = rankByRate([groceryCard, lowBase], 'groceries', [], NOW);
    expect(q.switchAt?.amount).toBe(100002);
    expect(exactTop([groceryCard, lowBase], 100002)).toBe('low');
    expect(exactTop([groceryCard, lowBase], 100001)).toBe('grocery');
  });

  it('gives no switch when the top card has no cap, or the others can never catch up', () => {
    expect(rankByRate([groceryCard, travelCard], 'travel', [], NOW).switchAt).toBeUndefined();
    const smallCap = card({
      id: 'small',
      nickname: 'Small Cap',
      rules: [{ id: 's', category: 'groceries', ratePercent: 3, monthlyCapRupees: 300 }],
    });
    const q = rankByRate([groceryCard, smallCap], 'groceries', [], NOW);
    expect(topId(q)).toBe('grocery');
    expect(q.switchAt).toBeUndefined();
  });

  it('prefers more cap room when two cards pay the same rate', () => {
    const capped = card({
      id: 'capped',
      nickname: 'Alpha',
      rules: [{ id: 'c', category: 'groceries', ratePercent: 5, monthlyCapRupees: 500 }],
    });
    const open = card({ id: 'open', nickname: 'Zeta', rules: [{ id: 'o', category: 'groceries', ratePercent: 5 }] });
    const q = rankByRate([capped, open], 'groceries', [], NOW);
    expect(topId(q)).toBe('open');
    expect(q.switchAt).toBeUndefined();
  });
});

describe('quickReason', () => {
  it('describes the rate, where it comes from and the cap left', () => {
    const txns = [txn({ cardId: 'grocery', category: 'groceries', amountRupees: 2000 })];
    expect(quickReason(evaluateCard(groceryCard, 'groceries', 0, txns, NOW), 'groceries')).toBe(
      '5% back on Groceries, ₹400.00 of its ₹500 monthly cap left.',
    );
    expect(quickReason(evaluateCard(groceryCard, 'dining', 0, [], NOW), 'dining')).toBe(
      '1% back (base rate; no Dining rule), no monthly cap.',
    );
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
