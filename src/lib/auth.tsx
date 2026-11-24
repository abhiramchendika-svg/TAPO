import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes, type AESEncryptionKey } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { fromHex, PBKDF2_ITERATIONS, pbkdf2Sha256, safeEqualHex, toHex, utf8 } from './password';
import { validateAccountEmail, validateAccountName, validateNewPassword } from './validation';
import { encryptionKeyBytesFrom, importKey, verifierFrom } from './vault';

/**
 * On-device accounts with encrypted wallets.
 *
 * - An account stores a name, email, salt and a password *verifier*. Neither the password nor the
 *   wallet key is ever stored at rest.
 * - Signing in derives the wallet's AES-256 key from the password; without it the wallet can't be read.
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
      const master = pbkdf2Sha256(utf8(password), salt, PBKDF2_ITERATIONS);
      const account: Account = {
        id: toHex(getRandomBytes(12)),
        name: cleanName,
        email: e,
        salt: toHex(salt),
        hash: toHex(verifierFrom(master)),
        iterations: PBKDF2_ITERATIONS,
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
      // Hash even when the email is unknown, so both cases take the same time.
      const master = pbkdf2Sha256(utf8(password), account ? fromHex(account.salt) : new Uint8Array(16), account?.iterations ?? PBKDF2_ITERATIONS);
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
      let acct = account;
      if (!v2) {
        // Older account: replace the raw hash with a verifier so the stored value can't double as a key.
        acct = { ...account, hash: toHex(verifierFrom(master)), version: 2 };
        await save(accounts.map((a) => (a.id === acct.id ? acct : a)));
      }
      await begin(acct, encryptionKeyBytesFrom(master), false);
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
