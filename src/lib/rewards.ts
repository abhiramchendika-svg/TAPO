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

/* ------------------------------------------------- before the amount is known */

/** The rate a card pays on this category right now: nothing once its monthly cap is used up. */
export function rateNow(e: CardEvaluation): number {
  return e.capRemaining === 0 ? 0 : e.ratePercent;
}

export interface QuickPick {
  /** Cards ordered by the rate they pay right now. */
  ranked: CardEvaluation[];
  /**
   * Set when the top card's monthly cap would run out on a big purchase: from `amount` rupees up,
   * `card` earns more. Found by the same reward maths as `rankCards`.
   */
  switchAt?: { amount: number; card: Card };
}

/** Largest purchase the recommender accepts (see validateAmount). */
const MAX_AMOUNT = 1_000_000;

/**
 * The answer for a single tap, before the amount is typed. Cards are ranked by the rate they pay right
 * now, then by how much cap room they have left (none is best), then by name. If the top card's cap
 * means another card would earn more on a big enough purchase, `switchAt` says from what amount.
 */
export function rankByRate(cards: Card[], category: Category, txns: Transaction[], now = new Date()): QuickPick {
  const room = (e: CardEvaluation) => e.capRemaining ?? Infinity;
  const ranked = cards
    .map((c) => evaluateCard(c, category, 0, txns, now))
    .sort((a, b) => rateNow(b) - rateNow(a) || room(b) - room(a) || a.card.nickname.localeCompare(b.card.nickname));

  const top = ranked[0];
  if (!top || top.capRemaining === undefined || rateNow(top) === 0) return { ranked };

  // The top card can earn at most what's left of its cap. Another card beats it once that card's own
  // reward goes past this, which needs a cap of its own (if any) bigger than this.
  const ceilingPaise = Math.round(top.capRemaining * 100);
  let switchAt: QuickPick['switchAt'];
  for (const e of ranked.slice(1)) {
    const rate = rateNow(e);
    if (rate <= 0 || (e.capRemaining !== undefined && Math.round(e.capRemaining * 100) <= ceilingPaise)) continue;
    // rawReward floors to the paisa, so the card needs at least one paisa more than the ceiling.
    const amount = Math.ceil((ceilingPaise + 1) / rate);
    if (amount <= MAX_AMOUNT && (!switchAt || amount < switchAt.amount)) switchAt = { amount, card: e.card };
  }
  return { ranked, switchAt };
}

/** One line on what a card pays right now on a category, for the quick answer. */
export function quickReason(e: CardEvaluation, category: Category): string {
  const label = CATEGORY_LABELS[category];
  const rate = formatPercent(e.ratePercent);
  const what = e.source === 'category' ? `${rate} back on ${label}` : `${rate} back (base rate; no ${label} rule)`;
  if (e.capRupees === undefined || e.capRemaining === undefined) return `${what}, no monthly cap.`;
  if (e.capRemaining === 0) return `${what}, but its ${formatRupees(e.capRupees)} monthly cap is used up, so nothing more this month.`;
  return `${what}, ${formatRupees(e.capRemaining, { decimals: true })} of its ${formatRupees(e.capRupees)} monthly cap left.`;
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
