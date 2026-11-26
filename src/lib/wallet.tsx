import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AESEncryptionKey } from 'expo-crypto';

import { walletAadFor, walletKeyFor } from './auth';
import { isEnvelope, openJson, sealJson } from './vault';
import { maskLongNumbers, type ImportedRow } from './csvImport';
import { makeId } from './format';
import { buildDemoData } from './sampleData';
import { CATEGORIES, type Card, type DemoPayment, type DevSettings, type Profile, type Transaction, type WalletData } from './types';
import { validateDisplayName } from './validation';

const STORAGE_KEY = 'tapo/demo-data/v1';
/** Key used before the app was renamed to TAPO; read once so existing data carries over. */
const LEGACY_STORAGE_KEY = 'rupee-wallet/demo-data/v1';

/** Card colours from earlier versions mapped to the current palette (the old set included a purple). */
const CARD_COLOR_UPDATES: Record<string, string> = {
  '#1E3A8A': '#2B4570',
  '#115E59': '#1F5A55',
  '#6B21A8': '#6E2A33',
  '#334155': '#3B3F46',
};

/**
 * Persisted fields are limited to display data (nickname, sample issuer,
 * network, type, last four digits, reward rules) and sample transactions.
 * Anything else found in storage is dropped on load.
 */
function sanitize(raw: unknown): WalletData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<WalletData>;
  if (data.version !== 1 || !Array.isArray(data.cards) || !Array.isArray(data.transactions)) return null;
  const cards: Card[] = data.cards
    .filter((c): c is Card => !!c && typeof c.id === 'string' && /^\d{4}$/.test(String(c.last4)))
    .map((c) => ({
      id: c.id,
      nickname: c.nickname,
      issuer: c.issuer,
      network: c.network,
      type: c.type,
      last4: c.last4,
      baseRatePercent: c.baseRatePercent,
      rules: Array.isArray(c.rules) ? c.rules : [],
      color: CARD_COLOR_UPDATES[c.color] ?? c.color,
      isSample: !!c.isSample,
    }));
  const name = typeof data.profile?.displayName === 'string' ? data.profile.displayName.trim() : '';
  const profile = name && !validateDisplayName(name) ? { displayName: name } : undefined;
  const demoPayments = Array.isArray(data.demoPayments)
    ? data.demoPayments.filter(isDemoPayment).slice(0, MAX_DEMO_PAYMENTS).map(cleanDemoPayment)
    : [];
  const devSettings: DevSettings = {
    demoOutcome: data.devSettings?.demoOutcome === 'declined' ? 'declined' : 'approved',
    unlocked: data.devSettings?.unlocked === true,
  };
  return {
    version: 1,
    cards,
    transactions: data.transactions.filter(isTransaction).map(cleanTransaction),
    profile,
    demoPayments,
    onboarded: data.onboarded === true,
    devSettings,
  };
}

const MAX_DEMO_PAYMENTS = 50;
const MAX_TRANSACTIONS = 2000;

function isTransaction(t: unknown): t is Transaction {
  if (!t || typeof t !== 'object') return false;
  const x = t as Transaction;
  return (
    typeof x.id === 'string' &&
    typeof x.cardId === 'string' &&
    typeof x.merchant === 'string' &&
    (CATEGORIES as readonly string[]).includes(x.category) &&
    typeof x.amountRupees === 'number' &&
    Number.isFinite(x.amountRupees) &&
    x.amountRupees > 0 &&
    !Number.isNaN(Date.parse(x.date))
  );
}

/** Keep only known fields, and mask any long digit run that slipped into a merchant name. */
function cleanTransaction(t: Transaction): Transaction {
  const imported = t.source === 'imported';
  return {
    id: t.id,
    cardId: t.cardId,
    merchant: maskLongNumbers(t.merchant).slice(0, 60),
    category: t.category,
    amountRupees: t.amountRupees,
    date: t.date,
    isSample: !imported,
    source: imported ? 'imported' : 'sample',
  };
}

function isDemoPayment(p: unknown): p is DemoPayment {
  if (!p || typeof p !== 'object') return false;
  const d = p as DemoPayment;
  return (
    typeof d.id === 'string' &&
    d.id.startsWith('DEMO-') &&
    typeof d.merchant === 'string' &&
    typeof d.amountRupees === 'number' &&
    (d.outcome === 'approved' || d.outcome === 'declined') &&
    (d.method === 'nfc-tag' || d.method === 'simulated')
  );
}

/** Keep only the known, non-sensitive fields. */
function cleanDemoPayment(d: DemoPayment): DemoPayment {
  return {
    id: d.id,
    createdAt: String(d.createdAt),
    merchant: d.merchant,
    amountRupees: d.amountRupees,
    cardId: String(d.cardId),
    cardLabel: String(d.cardLabel),
    method: d.method,
    tagCode: typeof d.tagCode === 'string' ? d.tagCode : undefined,
    outcome: d.outcome,
    isDemo: true,
  };
}

interface WalletContextValue {
  ready: boolean;
  data: WalletData;
  getCard: (id: string) => Card | undefined;
  upsertCard: (card: Card) => void;
  removeCard: (id: string) => void;
  resetDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
  /** Pass `undefined` to remove the profile. */
  setProfile: (profile: Profile | undefined) => void;
  /** Saves a tap-to-pay demo receipt locally (newest first). */
  addDemoPayment: (payment: DemoPayment) => void;
  clearDemoPayments: () => void;
  /** Marks the first-launch introduction as done (or false to show it again). */
  setOnboarded: (onboarded: boolean) => void;
  /** Developer setting: which simulated result the tap-to-pay demo shows. */
  setDemoOutcome: (outcome: DevSettings['demoOutcome']) => void;
  /** Shows (true) or hides (false) the Developer tools link in Settings. */
  setDevUnlocked: (unlocked: boolean) => void;
  /** Developer: deletes everything TAPO stored and returns to a first-launch state. */
  wipeAll: () => Promise<void>;
  /** Adds spending imported from a statement CSV to one card. Returns how many were added. */
  importTransactions: (cardId: string, rows: ImportedRow[]) => number;
  /** Removes every imported transaction, keeping sample data. */
  removeImported: () => void;
  /** Removes every sample transaction, keeping imported ones. */
  removeSampleTransactions: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Holds one account's wallet. `userId` null means nobody is signed in: the provider then keeps
 * sample data in memory only and never reads or writes storage.
 */
export function WalletProvider({
  children,
  userId = null,
  adoptLegacy = false,
  defaultName,
  cryptoKey,
}: {
  children: ReactNode;
  userId?: string | null;
  /** The first account on a device takes over data saved before accounts existed. */
  adoptLegacy?: boolean;
  /** Used as the display name for a brand-new account. */
  defaultName?: string;
  /** AES-256 key derived from the account password. The wallet is only ever written encrypted. */
  cryptoKey?: AESEncryptionKey;
}) {
  const key = userId ? walletKeyFor(userId) : null;
  const aad = userId ? walletAadFor(userId) : '';
  const [ready, setReady] = useState(!key);
  const [data, setData] = useState<WalletData>(() => buildDemoData());
  // If stored data exists but can't be decrypted, never overwrite it.
  const [writeBlocked, setWriteBlocked] = useState(false);

  useEffect(() => {
    if (!key || !cryptoKey) return;
    let cancelled = false;
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(key);
        if (!raw && adoptLegacy) {
          raw = (await AsyncStorage.getItem(STORAGE_KEY)) ?? (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
          // The data now belongs to this account (and is re-saved encrypted); remove the plaintext copy.
          if (raw) await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_STORAGE_KEY]);
        }
        let parsed: WalletData | null = null;
        if (raw) {
          const outer: unknown = JSON.parse(raw);
          if (isEnvelope(outer)) {
            try {
              parsed = sanitize(await openJson(outer, cryptoKey, aad));
            } catch {
              if (!cancelled) setWriteBlocked(true);
            }
          } else {
            // Saved before encryption existed: read it once; the save effect re-writes it encrypted.
            parsed = sanitize(outer);
          }
        }
        if (!parsed) parsed = buildDemoData();
        if (!parsed.profile && defaultName && !validateDisplayName(defaultName)) parsed = { ...parsed, profile: { displayName: defaultName } };
        if (!cancelled) setData(parsed);
      } catch {
        // Corrupt or unavailable storage: fall back to fresh demo data.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Loads once per account; the provider is keyed by userId so a new account remounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready || !key || !cryptoKey || writeBlocked) return;
    let stale = false;
    sealJson(data, cryptoKey, aad)
      .then((sealed) => {
        if (!stale) return AsyncStorage.setItem(key, sealed);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [data, ready, key, cryptoKey, aad, writeBlocked]);

  const getCard = useCallback((id: string) => data.cards.find((c) => c.id === id), [data.cards]);

  const upsertCard = useCallback((card: Card) => {
    setData((d) => {
      const exists = d.cards.some((c) => c.id === card.id);
      return { ...d, cards: exists ? d.cards.map((c) => (c.id === card.id ? card : c)) : [...d.cards, card] };
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      cards: d.cards.filter((c) => c.id !== id),
      transactions: d.transactions.filter((t) => t.cardId !== id),
    }));
  }, []);

  // Resetting or clearing cards keeps the profile, onboarding state and developer settings.
  const resetDemo = useCallback(async () => {
    setData((d) => ({ ...buildDemoData(), profile: d.profile, onboarded: d.onboarded, devSettings: d.devSettings }));
  }, []);

  const clearAll = useCallback(async () => {
    setData((d) => ({
      version: 1,
      cards: [],
      transactions: [],
      profile: d.profile,
      onboarded: d.onboarded,
      devSettings: d.devSettings,
    }));
  }, []);

  const setDemoOutcome = useCallback((demoOutcome: DevSettings['demoOutcome']) => {
    setData((d) => ({ ...d, devSettings: { ...d.devSettings, demoOutcome } }));
  }, []);

  const setDevUnlocked = useCallback((unlocked: boolean) => {
    setData((d) => ({
      ...d,
      devSettings: { demoOutcome: d.devSettings?.demoOutcome ?? 'approved', unlocked },
    }));
  }, []);

  const wipeAll = useCallback(async () => {
    const keys = [STORAGE_KEY, LEGACY_STORAGE_KEY, ...(key ? [key] : [])];
    await AsyncStorage.multiRemove(keys).catch(() => {});
    // Fresh demo data for this account, introduction not yet seen. The save effect writes it back.
    setData({ ...buildDemoData(), onboarded: false });
  }, [key]);

  const setOnboarded = useCallback((onboarded: boolean) => {
    setData((d) => ({ ...d, onboarded }));
  }, []);

  const setProfile = useCallback((profile: Profile | undefined) => {
    setData((d) => ({
      ...d,
      profile: profile ? { displayName: profile.displayName.replace(/\s+/g, ' ').trim() } : undefined,
    }));
  }, []);

  const addDemoPayment = useCallback((payment: DemoPayment) => {
    setData((d) => ({
      ...d,
      demoPayments: [cleanDemoPayment(payment), ...(d.demoPayments ?? [])].slice(0, MAX_DEMO_PAYMENTS),
    }));
  }, []);

  const clearDemoPayments = useCallback(() => {
    setData((d) => ({ ...d, demoPayments: [] }));
  }, []);

  const importTransactions = useCallback((cardId: string, rows: ImportedRow[]) => {
    const added: Transaction[] = rows.map((r) => ({
      id: makeId('imp'),
      cardId,
      merchant: maskLongNumbers(r.merchant),
      category: r.category,
      amountRupees: r.amountRupees,
      date: r.date,
      isSample: false,
      source: 'imported',
    }));
    setData((d) => ({
      ...d,
      transactions: [...added, ...d.transactions]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, MAX_TRANSACTIONS),
    }));
    return added.length;
  }, []);

  const removeImported = useCallback(() => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.source !== 'imported') }));
  }, []);

  const removeSampleTransactions = useCallback(() => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.source === 'imported') }));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      data,
      getCard,
      upsertCard,
      removeCard,
      resetDemo,
      clearAll,
      setProfile,
      addDemoPayment,
      clearDemoPayments,
      setOnboarded,
      setDemoOutcome,
      setDevUnlocked,
      wipeAll,
      importTransactions,
      removeImported,
      removeSampleTransactions,
    }),
    [
      importTransactions,
      removeImported,
      removeSampleTransactions,
      setDevUnlocked,
      ready,
      data,
      getCard,
      upsertCard,
      removeCard,
      resetDemo,
      clearAll,
      setProfile,
      addDemoPayment,
      clearDemoPayments,
      setOnboarded,
      setDemoOutcome,
      wipeAll,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
