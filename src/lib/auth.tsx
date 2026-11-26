import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes, type AESEncryptionKey } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { chooseIterations, derivePbkdf2, fromHex, needsStrongerHash, safeEqualHex, toHex, utf8 } from './password';
import { validateAccountEmail, validateAccountName, validateNewPassword } from './validation';
import { encryptionKeyBytesFrom, importKey, isEnvelope, openJson, sealJson, verifierFrom } from './vault';

/**
 * On-device accounts with encrypted wallets.
 *
 * - An account stores a name, email, salt and a password *verifier*. Neither the password nor the
 *   wallet key is ever stored at rest.
 * - Signing in derives the wallet's AES-256 key from the password; without it the wallet can't be read.
 * - Accounts hashed with fewer rounds than this device should use are upgraded on their next sign-in:
 *   the wallet is re-encrypted under the new key and saved together with the account, or not at all.
 * - Inactivity lock: after IDLE_LIMIT_MS without a touch, click or key press (or that long in the
 *   background) the session ends and the key is dropped.
 * - Web only: the session survives a page refresh within the same tab (sessionStorage, cleared when
 *   the tab closes). Native: restarting the app asks for the password again.
 */

const ACCOUNTS_KEY = 'tapo/accounts/v1';
const WEB_SESSION_KEY = 'tapo/session/v1';
const MAX_FAILURES = 5;
const LOCK_MS = 30_000;
export const IDLE_LIMIT_MS = 10 * 60_000;

export interface Account {
  id: string;
  name: string;
  email: string;
  salt: string;
  /** v2: HMAC-derived verifier. v1 (older accounts): the raw PBKDF2 output; upgraded on next sign-in. */
  hash: string;
  iterations: number;
  createdAt: string;
  version?: 1 | 2;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  /** The first account made on this device takes over data saved before accounts existed. */
  adoptLegacy: boolean;
  /** AES-256 key for this account's wallet. Lives only in memory (and, on web, the tab's session). */
  key: AESEncryptionKey;
}

export class AuthError extends Error {}

interface AuthValue {
  ready: boolean;
  session: Session | null;
  accountCount: number;
  /** Set when the last session ended because of inactivity, so the sign-in screen can say so. */
  lockedForIdle: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Records activity; call on any touch, click or key press. */
  touch: () => void;
  removeAccount: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

const normEmail = (e: string) => e.trim().toLowerCase();

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

/** Lets the UI paint a "working" state before hashing blocks the JS thread. */
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 30));

export function walletKeyFor(userId: string) {
  return `tapo/users/${userId}/wallet/v1`;
}

/** Associated data bound into each account's wallet encryption. */
export function walletAadFor(userId: string) {
  return `tapo-wallet:${userId}`;
}

/**
 * Re-encrypts a stored wallet from one key to another and returns the storage writes to make, so the
 * caller saves it in the same write as the account's new hash. Throws (changing nothing) if the
 * stored wallet can't be decrypted with the old key.
 */
export async function rekeyWallet(userId: string, oldKeyBytes: Uint8Array, newKeyBytes: Uint8Array): Promise<[string, string][]> {
  const storageKey = walletKeyFor(userId);
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];
  const outer: unknown = JSON.parse(raw);
  // Saved before encryption existed: the wallet provider re-saves it under whichever key signs in.
  if (!isEnvelope(outer)) return [];
  const aad = walletAadFor(userId);
  const value = await openJson(outer, await importKey(oldKeyBytes), aad);
  const newKey = await importKey(newKeyBytes);
  const sealed = await sealJson(value, newKey, aad);
  const check: unknown = JSON.parse(sealed);
  if (!isEnvelope(check)) throw new Error('Re-encryption produced an unexpected format.');
  await openJson(check, newKey, aad); // make sure the new copy opens before anything is written
  return [[storageKey, sealed]];
}

/** Tab-scoped storage on web; unavailable (null) on native. */
function tabStore(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [lockedForIdle, setLockedForIdle] = useState(false);
  const failures = useRef({ count: 0, until: 0 });
  const lastActive = useRef(0);

  // Load accounts, then (web) resume a session from this tab if it's still fresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list: Account[] = [];
      try {
        const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) list = parsed.filter(isAccount);
      } catch {}
      let resumed: Session | null = null;
      const store = tabStore();
      try {
        const saved = store?.getItem(WEB_SESSION_KEY);
        if (saved) {
          const s = JSON.parse(saved) as { userId: string; keyHex: string; lastActive: number };
          const acct = list.find((a) => a.id === s.userId);
          if (acct && /^[0-9a-f]{64}$/.test(s.keyHex) && Date.now() - s.lastActive < IDLE_LIMIT_MS) {
            resumed = { userId: acct.id, name: acct.name, email: acct.email, adoptLegacy: false, key: await importKey(fromHex(s.keyHex)) };
          } else store?.removeItem(WEB_SESSION_KEY);
        }
      } catch {
        store?.removeItem(WEB_SESSION_KEY);
      }
      if (cancelled) return;
      setAccounts(list);
      setSession(resumed);
      lastActive.current = Date.now();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: Account[]) => {
    setAccounts(next);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  }, []);

  const begin = useCallback(async (acct: Account, keyBytes: Uint8Array, adoptLegacy: boolean) => {
    const key = await importKey(keyBytes);
    lastActive.current = Date.now();
    tabStore()?.setItem(WEB_SESSION_KEY, JSON.stringify({ userId: acct.id, keyHex: toHex(keyBytes), lastActive: lastActive.current }));
    setLockedForIdle(false);
    setSession({ userId: acct.id, name: acct.name, email: acct.email, adoptLegacy, key });
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
      const iterations = chooseIterations();
      const master = await derivePbkdf2(utf8(password), salt, iterations);
      const account: Account = {
        id: toHex(getRandomBytes(12)),
        name: cleanName,
        email: e,
        salt: toHex(salt),
        hash: toHex(verifierFrom(master)),
        iterations,
        createdAt: new Date().toISOString(),
        version: 2,
      };
      await save([...accounts, account]);
      await begin(account, encryptionKeyBytesFrom(master), accounts.length === 0);
    },
    [accounts, save, begin],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const now = Date.now();
      if (failures.current.until > now) {
        throw new AuthError(`Too many attempts. Try again in ${Math.ceil((failures.current.until - now) / 1000)} seconds.`);
      }
      await nextFrame();
      const account = accounts.find((a) => a.email === normEmail(email));
      // Hash even when the email is unknown, so both cases take about the same time.
      const master = await derivePbkdf2(utf8(password), account ? fromHex(account.salt) : new Uint8Array(16), account?.iterations ?? chooseIterations());
      const v2 = account?.version === 2;
      const ok = !!account && safeEqualHex(toHex(v2 ? verifierFrom(master) : master), account.hash);
      if (!ok || !account) {
        failures.current.count += 1;
        if (failures.current.count >= MAX_FAILURES) {
          failures.current = { count: 0, until: Date.now() + LOCK_MS };
          throw new AuthError('Too many attempts. Try again in 30 seconds.');
        }
        throw new AuthError('Email or password is incorrect.');
      }
      failures.current = { count: 0, until: 0 };
      // Older account: replace the raw hash with a verifier so the stored value can't double as a key.
      let acct: Account = v2 ? account : { ...account, hash: toHex(verifierFrom(master)), version: 2 };
      let keyBytes = encryptionKeyBytesFrom(master);
      let saved = false;
      if (needsStrongerHash(account.iterations)) {
        // Fewer rounds than this device should use: re-derive with more, re-encrypt the wallet under the
        // new key, and save both in one write. If anything fails, keep the current setting and try next time.
        try {
          const iterations = chooseIterations();
          const stronger = await derivePbkdf2(utf8(password), fromHex(account.salt), iterations);
          const nextKeyBytes = encryptionKeyBytesFrom(stronger);
          const upgraded: Account = { ...acct, hash: toHex(verifierFrom(stronger)), iterations, version: 2 };
          const walletWrites = await rekeyWallet(account.id, keyBytes, nextKeyBytes);
          const nextAccounts = accounts.map((a) => (a.id === upgraded.id ? upgraded : a));
          await AsyncStorage.multiSet([[ACCOUNTS_KEY, JSON.stringify(nextAccounts)], ...walletWrites]);
          setAccounts(nextAccounts);
          acct = upgraded;
          keyBytes = nextKeyBytes;
          saved = true;
        } catch {}
      }
      if (!v2 && !saved) await save(accounts.map((a) => (a.id === acct.id ? acct : a)));
      await begin(acct, keyBytes, false);
    },
    [accounts, save, begin],
  );

  const signOut = useCallback(() => {
    tabStore()?.removeItem(WEB_SESSION_KEY);
    setSession(null);
  }, []);

  const touch = useCallback(() => {
    lastActive.current = Date.now();
  }, []);

  // Inactivity lock: check every 20 s, and when the app comes back from the background.
  useEffect(() => {
    if (!session) return;
    const check = () => {
      const idle = Date.now() - lastActive.current;
      if (idle >= IDLE_LIMIT_MS) {
        setLockedForIdle(true);
        signOut();
        return;
      }
      // Keep the tab's session timestamp fresh so a refresh after activity resumes it.
      const store = tabStore();
      const saved = store?.getItem(WEB_SESSION_KEY);
      if (saved) {
        try {
          store?.setItem(WEB_SESSION_KEY, JSON.stringify({ ...JSON.parse(saved), lastActive: lastActive.current }));
        } catch {}
      }
    };
    const timer = setInterval(check, 20_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    let off: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onAny = () => (lastActive.current = Date.now());
      document.addEventListener('keydown', onAny, true);
      document.addEventListener('pointerdown', onAny, true);
      document.addEventListener('wheel', onAny, { capture: true, passive: true });
      off = () => {
        document.removeEventListener('keydown', onAny, true);
        document.removeEventListener('pointerdown', onAny, true);
        document.removeEventListener('wheel', onAny, true);
      };
    }
    return () => {
      clearInterval(timer);
      sub.remove();
      off?.();
    };
  }, [session, signOut]);

  const removeAccount = useCallback(
    async (email: string) => {
      const account = accounts.find((a) => a.email === normEmail(email));
      if (!account) return false;
      await AsyncStorage.removeItem(walletKeyFor(account.id)).catch(() => {});
      await save(accounts.filter((a) => a.id !== account.id));
      if (session?.userId === account.id) signOut();
      return true;
    },
    [accounts, save, session, signOut],
  );

  const value = useMemo(
    () => ({ ready, session, accountCount: accounts.length, lockedForIdle, signUp, signIn, signOut, touch, removeAccount }),
    [ready, session, accounts.length, lockedForIdle, signUp, signIn, signOut, touch, removeAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
