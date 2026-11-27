# TAPO architecture and study guide

This is written so every team member can **explain the code in a review without notes**. Read it with the
source open. Each section ends with questions an evaluator is likely to ask; practise answering them aloud.

## 1. The big picture

<img src="readme/architecture.svg" alt="TAPO's architecture in four layers. Screens in src/app (sign in, Wallet and Best, Import and Insights, the tap demo) use two providers through useAuth() and useWallet(): AuthProvider in auth.tsx handles sign-in, keeps the key in memory and runs the idle lock; WalletProvider in wallet.tsx keeps one wallet per account and sanitises it on load. Screens and providers call plain functions in src/lib: password and vault (PBKDF2 key, AES-256-GCM), rewards.ts, insights.ts, csvImport.ts, demoNfc.ts and validation.ts. The wallet provider saves, encrypted, to the device: AsyncStorage holds the accounts list (name, email, salt, verifier, no password) and the encrypted wallet. There is no backend and no AI. Outside the app, Vercel hosts the website and web app, GitHub Actions checks every change and EAS builds the Android app; none of them sees cards or spending." width="100%">

- **No backend and no AI.** There's no server of ours and no AI model; recommendations are arithmetic on the
  rates the user enters.
- **Outside services only build and host the app:** Vercel serves the website and web app as static files, GitHub
  Actions runs the checks on every push, and EAS builds the Android app. None of them receives cards or spending.
- **Everything lives on the device** in AsyncStorage (localStorage on web), with each wallet encrypted.
- **Pure logic is separate from UI.** `rewards.ts`, `insights.ts` and `csvImport.ts` are plain functions with
  no React, which is why they are easy to unit-test (`src/lib/__tests__`).
- **Two providers.** `AuthProvider` (in `auth.tsx`) handles accounts, sign-in and the wallet key; screens call
  `useAuth()`. `WalletProvider` (in `wallet.tsx`) holds the signed-in account's data and exposes actions like
  `upsertCard`, `importTransactions`, `setDemoOutcome`; screens call `useWallet()`.

## 2. Data model and safety (`src/lib/types.ts`)

- `Card` has a nickname, a **fictional** issuer, network, type, `last4`, a base rate and per-category rules.
  There is **no field** for a full card number, CVV, PIN, OTP, expiry, bank login or token. You cannot leak
  what you never store.
- `Transaction` has `source: 'sample' | 'imported'`.
- `sanitize()` in `wallet.tsx` runs on every load: it drops unknown fields, rejects malformed records, and masks
  any long number in a merchant name. Even if someone edits storage by hand, the app only keeps known-safe data.

**Likely questions**
- *Where would a full card number be stored?* Nowhere: the type has no field for it, and `validation.ts`
  rejects nicknames that look like card numbers (`looksLikeCardNumber`).
- *What happens if storage is corrupted?* `sanitize` returns `null` and the app falls back to fresh sample data.

## 3. Reward maths (`src/lib/rewards.ts`)

1. `effectiveRule(card, category)`: the card's rule for that category, or its base rate.
2. `rawReward(amount, rate)`: `amount × rate / 100`, **rounded down to the paisa** (never over-promise).
3. `evaluateCard(card, category, amount, txns, now)`: if the rule has a monthly cap, the reward is limited to
   `cap − rewards already earned in that category this month` (from the transactions).
4. `rankCards(...)`: sorts by estimated reward, then by headline rate, then by name (a stable, explainable order).
5. `rankByRate(cards, category, txns, now)`: the **one-tap answer**, before any amount is typed. It ranks cards by
   the rate they pay right now: a card whose monthly cap is used up pays 0 until next month. Ties go to the card
   with more cap room, then the name. If the top card's cap would run out on a big purchase, `switchAt` gives the
   amount from which another card earns more. That's the smallest amount where the other card's reward passes
   what's left of the top card's cap, worked out with the same rounding as `rankCards`. The tests check that
   `rankCards` agrees on both sides of that amount.
6. `monthSummary(card, txns, now)`: totals spend and reward per card for the month, applying caps per category.

**Worked example** (from the tests): a grocery card gives 5% with a ₹500 monthly cap. ₹2,000 of groceries
earned ₹100 already, so ₹400 of cap is left. A new ₹10,000 purchase would earn ₹500 uncapped, so it is
**limited to ₹400** and marked `capLimited`.

**Likely questions**
- *Why round down?* So the estimate never promises more than the bank would pay.
- *How are ties broken?* Headline rate, then card name, so the result is the same every time.
- *Why answer without an amount?* Our interviews found people pay by habit, so the answer has to come quicker
  than reaching for the usual card. One tap is enough when no cap is close to running out. When one is,
  `switchAt` says from what amount to switch, so the quick answer is never silently wrong.

## 4. Insights and the "missed rewards" metric (`src/lib/insights.ts`)

`buildInsights(cards, txns, month)` returns totals, spend by category, rewards by card and **tips**. For each
category, it compares what you earned on the card you used against the best card's rate. The sum of those
differences is **missed rewards**, the headline number on the Wallet screen. It is TAPO's core value metric:
how much money the user left on the table.

- Tips compare rates **before caps** and say so in the UI, to stay honest.

## 5. Statement import (`src/lib/csvImport.ts`, screen `src/app/import.tsx`)

1. `parseCsv` handles quotes, commas inside quotes, CRLF, and `;` or tab delimiters.
2. `findHeaderRow` skips account-info lines at the top of real statements until it finds date, description and
   amount/debit columns.
3. Amounts like `₹1,23,456.70`, `Rs. 450`, `(250.00)` and `1,200 Cr` are parsed. Credits (money in) are skipped.
   Files where spends are negative are detected automatically.
4. Dates are read **day-first** (Indian format) and impossible dates like 31/02 are rejected.
5. **Privacy:** only date, merchant and amount are kept. Every other column is ignored. Any run of 9+ digits is
   masked to `••1234`. Parsing happens on the device; nothing is uploaded.
6. `categorise` maps merchant keywords (Swiggy → dining, IRCTC → travel, …) to TAPO's categories.
7. Re-importing the same file is safe: duplicates (same date, amount and merchant) are skipped.

**Likely questions**
- *Why not connect to the bank directly?* That needs a licensed Account Aggregator integration (RBI framework) and
  user consent flows; CSV import proves the value first with zero regulatory risk.
- *What if a statement has a card-number column?* It's ignored, and a test proves no 9+ digit number survives.

## 6. NFC demo (`demoNfc.ts`, `nativeNfc.native.ts`, `nativeNfc.ts`)

- NFC is only a **trigger**: TAPO reads a text record `TAPO-DEMO:<code>` from an ordinary sticker. It never reads
  bank cards, emulates a card or writes to tags. The payment that follows is **simulated** and labelled as such.
- Platform split: Metro picks `nativeNfc.native.ts` on iOS/Android (react-native-nfc-manager, loaded lazily so
  Expo Go doesn't crash) and `nativeNfc.ts` on web (a stub; web uses the browser's `NDEFReader`).
- `parseDemoTagText` rejects tags without the prefix and any that contain 12+ digits.

## 7. Screens worth knowing (`src/app`)

| File | What to say about it |
| --- | --- |
| `(tabs)/index.tsx` | Wallet: **Paying now?** (one tap → card to use, from `components/BestNow.tsx`), floating card gallery, month stats, **missed rewards**, recent activity |
| `(tabs)/recommend.tsx` | Best: tap a category → card to use at once (`rankByRate`); add an amount → exact rewards and caps (`rankCards`) |
| `(tabs)/insights.tsx` | Monthly insights and tips |
| `import.tsx` | Statement import: choose card → file/paste → preview → import |
| `developer.tsx` | Hidden tools (7 taps on the version in Settings), linked both ways with Settings |
| `_layout.tsx` | Loads fonts, wraps the app in `WalletProvider`, declares the stack |

## 8. Quality

- `npm run typecheck`, `npm run lint`, `npm test` (unit tests for formatting, rewards, validation, NFC parsing,
  insights and CSV import).
- `.github/workflows/ci.yml` runs all of these plus a web build on every push and pull request.

## Practise these five out loud

1. Walk through what happens, file by file, when a user imports a statement.
2. Explain how a monthly cap changes the recommended card.
3. Show where TAPO guarantees it never stores a full card number.
4. Explain why the NFC demo can't take a real payment.
5. Explain what "missed rewards" means and how it's calculated.
