import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { PBKDF2_ITERATIONS, pbkdf2Sha256, safeEqualHex, toHex, fromHex, utf8 } from './password';
import { validateAccountEmail, validateAccountName, validateNewPassword } from './validation';

/**
 * On-device accounts.
 *
 * - Accounts (name, email, salt, password hash) are saved in this device's storage. The password
 *   itself is never stored.
 * - The signed-in session lives only in memory. Restarting the app or reloading the page signs
 *   the person out, by design.
 * - Each account has its own wallet data on the device (see WalletProvider's `userId`).
 */

const ACCOUNTS_KEY = 'tapo/accounts/v1';
const MAX_FAILURES = 5;
const LOCK_MS = 30_000;

export interface Account {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  /** True for the first account made on this device: it takes over data saved before accounts existed. */
  adoptLegacy: boolean;
}

export class AuthError extends Error {}

interface AuthValue {
  ready: boolean;
  session: Session | null;
  accountCount: number;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Removes an account and all of its data from this device. */
  removeAccount: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

function isAccount(a: unknown): a is Account {
  const x = a as Account;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.email === 'string' &&
    typeof x.name === 'string' &&
    /^[0-9a-f]{32}$/.test(String(x.salt)) &&
    /^[0-9a-f]{64}$/.test(String(x.hash)) &&
    Number.isInteger(x.iterations) &&
    x.iterations >= 1000
  );
}

/** Lets the UI paint a "working" state before the hashing blocks the JS thread. */
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 30));

export function walletKeyFor(userId: string) {
  return `tapo/users/${userId}/wallet/v1`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const failures = useRef<{ count: number; until: number }>({ count: 0, until: 0 });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ACCOUNTS_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (!cancelled && Array.isArray(parsed)) setAccounts(parsed.filter(isAccount));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: Account[]) => {
    setAccounts(next);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const cleanName = name.replace(/\s+/g, ' ').trim();
      const e = normEmail(email);
      const problem = validateAccountName(cleanName) ?? validateAccountEmail(e) ?? validateNewPassword(password);
      if (problem) throw new AuthError(problem);
      if (accounts.some((a) => a.email === e)) throw new AuthError('An account with this email already exists on this device. Sign in instead.');
      await nextFrame();
      const salt = getRandomBytes(16);
      const hash = toHex(pbkdf2Sha256(utf8(password), salt, PBKDF2_ITERATIONS));
      const account: Account = {
        id: toHex(getRandomBytes(12)),
        name: cleanName,
        email: e,
        salt: toHex(salt),
        hash,
        iterations: PBKDF2_ITERATIONS,
        createdAt: new Date().toISOString(),
      };
      await save([...accounts, account]);
      setSession({ userId: account.id, name: account.name, email: account.email, adoptLegacy: accounts.length === 0 });
    },
    [accounts, save],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const now = Date.now();
      if (failures.current.until > now) {
        const s = Math.ceil((failures.current.until - now) / 1000);
        throw new AuthError(`Too many attempts. Try again in ${s} seconds.`);
      }
      await nextFrame();
      const account = accounts.find((a) => a.email === normEmail(email));
      // Hash even when the email is unknown, so both cases take the same time.
      const salt = account ? fromHex(account.salt) : new Uint8Array(16);
      const hash = toHex(pbkdf2Sha256(utf8(password), salt, account?.iterations ?? PBKDF2_ITERATIONS));
      if (!account || !safeEqualHex(hash, account.hash)) {
        failures.current.count += 1;
        if (failures.current.count >= MAX_FAILURES) {
          failures.current = { count: 0, until: Date.now() + LOCK_MS };
          throw new AuthError('Too many attempts. Try again in 30 seconds.');
        }
        throw new AuthError('Email or password is incorrect.');
      }
      failures.current = { count: 0, until: 0 };
      setSession({ userId: account.id, name: account.name, email: account.email, adoptLegacy: false });
    },
    [accounts],
  );

  const signOut = useCallback(() => setSession(null), []);

  const removeAccount = useCallback(
    async (email: string) => {
      const account = accounts.find((a) => a.email === normEmail(email));
      if (!account) return false;
      await AsyncStorage.removeItem(walletKeyFor(account.id)).catch(() => {});
      await save(accounts.filter((a) => a.id !== account.id));
      if (session?.userId === account.id) setSession(null);
      return true;
    },
    [accounts, save, session],
  );

  const value = useMemo(
    () => ({ ready, session, accountCount: accounts.length, signUp, signIn, signOut, removeAccount }),
    [ready, session, accounts.length, signUp, signIn, signOut, removeAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
