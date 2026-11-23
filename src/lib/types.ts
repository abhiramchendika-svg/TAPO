/**
 * Domain types for the demo wallet.
 *
 * SAFETY: these types deliberately have no fields for full card numbers (PAN),
 * CVV, PIN, OTP, expiry, bank credentials, or payment tokens. Only the last four
 * digits are kept, purely as a display label chosen by the user.
 */

export const CATEGORIES = [
  'dining',
  'groceries',
  'fuel',
  'travel',
  'online',
  'utilities',
  'entertainment',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  dining: 'Dining',
  groceries: 'Groceries',
  fuel: 'Fuel',
  travel: 'Travel',
  online: 'Online shopping',
  utilities: 'Bills & utilities',
  entertainment: 'Entertainment',
  other: 'Everything else',
};

export const NETWORKS = ['RuPay', 'Visa', 'Mastercard', 'Amex', 'Diners Club'] as const;
export type Network = (typeof NETWORKS)[number];

export const CARD_TYPES = ['Credit', 'Debit'] as const;
export type CardType = (typeof CARD_TYPES)[number];

/** Clearly fictional issuers. The app never lets users name a real bank. */
export const SAMPLE_ISSUERS = [
  'Sample Bank Alpha',
  'Demo Bank Beta',
  'Example Co-op Bank',
  'Placeholder Finance',
] as const;
export type SampleIssuer = (typeof SAMPLE_ISSUERS)[number];

export interface RewardRule {
  id: string;
  category: Category;
  /** Reward value as a percentage of spend, e.g. 5 = 5%. */
  ratePercent: number;
  /** Optional monthly cap on rewards for this category, in rupees. */
  monthlyCapRupees?: number;
}

export interface Card {
  id: string;
  nickname: string;
  issuer: SampleIssuer;
  network: Network;
  type: CardType;
  /** Display-only label. Exactly 4 digits. Never the full number. */
  last4: string;
  /** Default reward rate for categories with no specific rule. */
  baseRatePercent: number;
  rules: RewardRule[];
  color: string;
  isSample: boolean;
}

export interface Transaction {
  id: string;
  cardId: string;
  merchant: string;
  category: Category;
  amountRupees: number;
  /** ISO date string. */
  date: string;
  /** True for built-in sample data; false for spending the user imported from a statement. */
  isSample: boolean;
  /** Where the transaction came from. Missing means sample (data saved by older versions). */
  source?: 'sample' | 'imported';
}

/**
 * Local-only profile. Deliberately minimal: a display name for greetings.
 * No email, phone, address, date of birth or account identifiers.
 */
export interface Profile {
  displayName: string;
}

/**
 * A record from the tap-to-pay DEMO. Nothing here was charged; the outcome is
 * chosen by the person running the demo. Holds no card number, CVV, PIN,
 * token or credential — only a card label and a harmless demo tag code.
 */
export interface DemoPayment {
  /** Dummy transaction ID, e.g. DEMO-20261121-7KQ2XM. */
  id: string;
  createdAt: string;
  merchant: string;
  amountRupees: number;
  cardId: string;
  /** Snapshot of the card label at the time, e.g. "Everyday Cashback •• 0001". */
  cardLabel: string;
  method: 'nfc-tag' | 'simulated';
  /** The demo session code read from the NFC tag, when one was scanned. */
  tagCode?: string;
  outcome: 'approved' | 'declined';
  isDemo: true;
}

export interface WalletData {
  version: 1;
  cards: Card[];
  transactions: Transaction[];
  profile?: Profile;
  demoPayments?: DemoPayment[];
  /** True once the first-launch introduction has been completed or skipped. */
  onboarded?: boolean;
  /** Settings from the hidden developer screen. */
  devSettings?: DevSettings;
}

export interface DevSettings {
  /** Which simulated result the tap-to-pay demo shows. */
  demoOutcome: 'approved' | 'declined';
  /** True once developer tools are unlocked; Settings then links to them directly. */
  unlocked?: boolean;
}
