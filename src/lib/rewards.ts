import { formatPercent, formatRupees, isSameMonth } from './format';
import { CATEGORY_LABELS, type Card, type Category, type Transaction } from './types';

/** The rate that applies to a category on a card, and where it came from. */
export function effectiveRule(card: Card, category: Category) {
  const rule = card.rules.find((r) => r.category === category);
  if (rule) {
    return { ratePercent: rule.ratePercent, capRupees: rule.monthlyCapRupees, source: 'category' as const };
  }
  return { ratePercent: card.baseRatePercent, capRupees: undefined, source: 'base' as const };
}

/** Reward value for a single spend, ignoring caps. Rounded down to the paisa. */
export function rawReward(amount: number, ratePercent: number): number {
  return Math.floor(amount * ratePercent) / 100;
}

/**
 * Rewards already earned this month on a card for a category (only counts
 * spend that fell under a capped category rule).
 */
export function earnedThisMonth(card: Card, category: Category, txns: Transaction[], now = new Date()) {
  const { ratePercent } = effectiveRule(card, category);
  return txns
    .filter((t) => t.cardId === card.id && t.category === category && isSameMonth(t.date, now))
    .reduce((sum, t) => sum + rawReward(t.amountRupees, ratePercent), 0);
}

export interface CardEvaluation {
  card: Card;
  ratePercent: number;
  source: 'category' | 'base';
  capRupees?: number;
  capRemaining?: number;
  rewardRupees: number;
  capLimited: boolean;
  reasons: string[];
}

export function evaluateCard(
  card: Card,
  category: Category,
  amount: number,
  txns: Transaction[],
  now = new Date(),
): CardEvaluation {
  const { ratePercent, capRupees, source } = effectiveRule(card, category);
  const uncapped = rawReward(amount, ratePercent);
  const reasons: string[] = [];
  const label = CATEGORY_LABELS[category];

  if (source === 'category') {
    reasons.push(`${formatPercent(ratePercent)} back on ${label} (category rule).`);
  } else {
    reasons.push(`No ${label} rule, so the base rate of ${formatPercent(ratePercent)} applies.`);
  }

  let reward = uncapped;
  let capRemaining: number | undefined;
  let capLimited = false;

  if (capRupees !== undefined) {
    const used = earnedThisMonth(card, category, txns, now);
    capRemaining = Math.max(0, Math.round((capRupees - used) * 100) / 100);
    if (uncapped > capRemaining) {
      reward = capRemaining;
      capLimited = true;
      reasons.push(
        `Monthly cap of ${formatRupees(capRupees)} applies; only ${formatRupees(capRemaining)} left this month (based on sample spend).`,
      );
    } else {
      reasons.push(`Within the ${formatRupees(capRupees)} monthly cap (${formatRupees(capRemaining)} left).`);
    }
  }

  return { card, ratePercent, source, capRupees, capRemaining, rewardRupees: reward, capLimited, reasons };
}

/**
 * Rank cards for a purchase. Order: highest estimated reward, then highest
 * headline rate, then alphabetical nickname, so the result is deterministic.
 */
export function rankCards(
  cards: Card[],
  category: Category,
  amount: number,
  txns: Transaction[],
  now = new Date(),
): CardEvaluation[] {
  return cards
    .map((c) => evaluateCard(c, category, amount, txns, now))
    .sort(
      (a, b) =>
        b.rewardRupees - a.rewardRupees ||
        b.ratePercent - a.ratePercent ||
        a.card.nickname.localeCompare(b.card.nickname),
    );
}

/** Summary sentence for the top pick. */
export function explainWinner(ranked: CardEvaluation[], amount: number): string {
  const [best, next] = ranked;
  if (!best) return '';
  const base = `${best.card.nickname} is estimated to earn ${formatRupees(best.rewardRupees, { decimals: true })} on a ${formatRupees(amount)} purchase.`;
  if (!next) return `${base} It is the only card in your wallet.`;
  const diff = Math.round((best.rewardRupees - next.rewardRupees) * 100) / 100;
  if (diff <= 0) {
    return `${base} ${next.card.nickname} earns the same, so either card works; ties are broken by headline rate, then name.`;
  }
  return `${base} That is ${formatRupees(diff, { decimals: true })} more than the next best option, ${next.card.nickname}.`;
}

/** Mock spend summary for one card this month. */
export function monthSummary(card: Card, txns: Transaction[], now = new Date()) {
  const mine = txns.filter((t) => t.cardId === card.id && isSameMonth(t.date, now));
  const byCategory = new Map<Category, { spend: number; reward: number }>();
  for (const t of mine) {
    const { ratePercent } = effectiveRule(card, t.category);
    const cur = byCategory.get(t.category) ?? { spend: 0, reward: 0 };
    cur.spend += t.amountRupees;
    cur.reward += rawReward(t.amountRupees, ratePercent);
    byCategory.set(t.category, cur);
  }
  // Apply caps per category.
  let totalReward = 0;
  let totalSpend = 0;
  const rows = [...byCategory.entries()].map(([category, v]) => {
    const { capRupees } = effectiveRule(card, category);
    const reward = capRupees !== undefined ? Math.min(v.reward, capRupees) : v.reward;
    totalReward += reward;
    totalSpend += v.spend;
    return { category, spend: v.spend, reward: Math.round(reward * 100) / 100 };
  });
  rows.sort((a, b) => b.spend - a.spend);
  return { rows, totalSpend, totalReward: Math.round(totalReward * 100) / 100, count: mine.length };
}
