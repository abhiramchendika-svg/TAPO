import { isSameMonth } from './format';
import { effectiveRule, monthSummary, rawReward } from './rewards';
import type { Card, Category, Transaction } from './types';

export interface CategorySpend {
  category: Category;
  spend: number;
  count: number;
  /** 0–1 share of the month's spend. */
  share: number;
}

export interface CardRewards {
  card: Card;
  spend: number;
  reward: number;
  count: number;
}

/** A pattern where a different card would have earned more. */
export interface Tip {
  category: Category;
  bestCard: Card;
  /** Extra rewards the best card would have earned, before monthly caps. */
  extra: number;
  count: number;
  /** Average purchase size, used to prefill the comparison. */
  averageAmount: number;
}

export interface MonthInsights {
  count: number;
  totalSpend: number;
  totalReward: number;
  /** Rewards as a % of spend, or 0 when nothing was spent. */
  rewardRate: number;
  categories: CategorySpend[];
  cards: CardRewards[];
  tips: Tip[];
}

/**
 * Month-level insights from the existing sample data and reward rules.
 * Spend and rewards per card use `monthSummary` (caps applied). Tips compare
 * each purchase's rate with the best card's rate for that category, before
 * monthly caps, so they're labelled as estimates in the UI.
 */
export function buildInsights(cards: Card[], txns: Transaction[], ref: Date = new Date()): MonthInsights {
  const month = txns.filter((t) => isSameMonth(t.date, ref));
  const totalSpend = month.reduce((s, t) => s + t.amountRupees, 0);

  const catMap = new Map<Category, { spend: number; count: number }>();
  for (const t of month) {
    const c = catMap.get(t.category) ?? { spend: 0, count: 0 };
    c.spend += t.amountRupees;
    c.count += 1;
    catMap.set(t.category, c);
  }
  const categories = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v, share: totalSpend ? v.spend / totalSpend : 0 }))
    .sort((a, b) => b.spend - a.spend);

  const cardRows = cards
    .map((card) => {
      const s = monthSummary(card, txns, ref);
      return { card, spend: s.totalSpend, reward: s.totalReward, count: s.count };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.reward - a.reward);
  const totalReward = round2(cardRows.reduce((s, r) => s + r.reward, 0));

  // Tips: group purchases where another card has a higher rate for that category.
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const tipMap = new Map<string, { category: Category; bestCard: Card; extra: number; count: number; amount: number }>();
  for (const t of month) {
    const used = cardsById.get(t.cardId);
    if (!used || cards.length < 2) continue;
    const usedReward = rawReward(t.amountRupees, effectiveRule(used, t.category).ratePercent);
    let best = used;
    let bestReward = usedReward;
    for (const c of cards) {
      const r = rawReward(t.amountRupees, effectiveRule(c, t.category).ratePercent);
      if (r > bestReward) {
        best = c;
        bestReward = r;
      }
    }
    const extra = bestReward - usedReward;
    if (best.id === used.id || extra <= 0) continue;
    const key = `${t.category}|${best.id}`;
    const tip = tipMap.get(key) ?? { category: t.category, bestCard: best, extra: 0, count: 0, amount: 0 };
    tip.extra += extra;
    tip.count += 1;
    tip.amount += t.amountRupees;
    tipMap.set(key, tip);
  }
  const tips = [...tipMap.values()]
    .map((t) => ({
      category: t.category,
      bestCard: t.bestCard,
      extra: round2(t.extra),
      count: t.count,
      averageAmount: Math.round(t.amount / t.count),
    }))
    .sort((a, b) => b.extra - a.extra);

  return {
    count: month.length,
    totalSpend,
    totalReward,
    rewardRate: totalSpend ? (totalReward / totalSpend) * 100 : 0,
    categories,
    cards: cardRows,
    tips,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A date inside the previous calendar month. */
export function previousMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 15);
}
