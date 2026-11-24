# TAPO (Demo)

A cross-platform (iOS, Android, web) **prototype** of an India-focused multi-card rewards wallet, built with
Expo SDK 58, Expo Router and TypeScript.

It helps you organise payment cards and pick the best one for a purchase based on reward rules.
**It does not make payments.** All issuers, cards, reward rules and transactions are fictional sample data. There is
no partnership, approval or affiliation with any bank, card network or payment provider.

## Features

| Screen | What it does |
| --- | --- |
| **Wallet** (home) | Sample cards carousel, “Choose a card” action, recent sample transactions, this month’s sample spend |
| **Add / edit card** | Nickname, fictional issuer, network, credit/debit, last four digits, base rate and editable per-category rules with optional monthly caps. Live card preview and inline validation |
| **Card details** | Safe display info, reward rules, mock monthly spend by category with estimated rewards, recent sample transactions, remove card |
| **Choose card** | Merchant category + amount (₹) → ranked recommendation with a plain-language explanation and full comparison |
| **Activity** | Sample transactions with category filters and totals |
| **Import statement** | Load real spending from a bank or card statement CSV (file picker or paste). Parsed on the device; only date, merchant and amount are kept; credits and duplicates are skipped; long or bank-masked numbers are masked to the last four digits; purchases are categorised automatically. Wallet → *Import statement* |
| **Missed rewards** | The core metric on the Wallet screen: how much more your best cards would have earned this month |
| **Insights** | This month / last month: total spend, estimated rewards and overall rate, spend by category, rewards by card, and “Ways to earn more” tips that show where another card's rules would have earned more (before monthly caps), with a link to compare cards |
| **Settings** | Profile, reset demo data, remove all cards (with inline confirmation), privacy notes, How TAPO works, replay the introduction |
| **Developer** (hidden) | Tap **Version 1.0.0** in Settings → About seven times. Build info, the demo's approve/decline result, an NFC tester (support status, tag-text validator, scan without paying), local storage counts and raw JSON, and **Wipe all local data** |
| **Pay** | States clearly: “Tap to pay is not available in this prototype.” Links to the labelled demo below |
| **Tap-to-pay demo** | A clearly labelled **simulation** (“Demo mode — no real money is charged”): dummy merchant + amount → scan a demo NFC tag or *Simulate tap* → review → simulated processing → approved or declined (set in the developer screen) → dummy receipt |

### Design

- **Card faces** ([`CardTile.tsx`](src/components/CardTile.tsx)) use real ID-1 proportions (85.6 × 53.98 mm),
  layered SVG gradients, a soft highlight and sheen, an original ring pattern, an illustrated contact chip, a generic
  contactless mark, a masked number, a placeholder cardholder name, and the network name as plain text (no logos).
  Every card carries a **SAMPLE** badge, and all issuers are fictional.
- **"Gallery at night" theme**: a dark navy scene, soft spotlight glows and Title Case Satoshi text.
- **Floating gallery** ([`Gallery.tsx`](src/components/Gallery.tsx)): cards float in the dark with a glow in their
  own colour and a pool of light beneath, bobbing gently (turned off when the system's Reduce Motion is on). The
  carousel swipes and snaps card by card, angles neighbouring cards in 3D perspective, and has ← → arrow buttons
  plus page dots. A Gallery | List switch offers a simple list view.
- **App icon and splash**: the TAPO mark on a cream tile (`assets/icon.png`), an Android adaptive icon with a
  monochrome layer for themed icons, and a dark splash screen configured through the `expo-splash-screen` plugin.
- **Tokens** in [`theme.ts`](src/theme.ts): colours, fonts, type scale and cross-platform `boxShadow` elevation.
  Text pairs meet WCAG AA contrast.
- **Icons** are original SVG strokes ([`Icon.tsx`](src/components/Icon.tsx)); `react-native-svg` is the only
  dependency added for the redesign and ships with Expo Go.

### Fonts

- **Satoshi** (Indian Type Foundry, via [Fontshare](https://www.fontshare.com)) for body text, buttons and headings.
  The official `.otf` files live in `assets/fonts/satoshi/` with the licence (`LICENSE-FFL.txt`, ITF Free Font
  License 2.0), which allows embedding in apps and self-hosting on your own sites. It does **not** allow modifying the
  files or redistributing them, so keep `assets/fonts/satoshi/` out of any *public* repository. Anyone else working
  on the project should download their own copy from Fontshare.
- **Inter** draws only the ₹ symbol, because Satoshi has no ₹ glyph. The `<Text>` component swaps it in
  automatically at a matching weight.
- **JetBrains Mono** for card numbers and demo transaction IDs.

### How recommendations work

For each card: `reward = amount × rate`, where `rate` is the card’s rule for that category or its base rate.
If the rule has a monthly cap, the reward is limited to `cap − rewards already earned this month` (from sample
transactions). Cards are ranked by estimated reward, then headline rate, then name. The logic lives in
[`src/lib/rewards.ts`](src/lib/rewards.ts) and every result shows the reasons behind it.

### Safety and privacy by design

- The data model ([`src/lib/types.ts`](src/lib/types.ts)) has **no fields** for full card numbers, CVV, PIN, OTP,
  expiry, bank credentials or payment tokens. Only the last four digits are stored, as a label.
- The last-four field accepts digits only (max 4); nicknames that look like card numbers are rejected and never shown
  on the card preview.
- Issuers can only be chosen from a fixed list of obviously fictional names.
- Data is stored locally with AsyncStorage and sanitised on load. No network calls, analytics or tracking.
- No host card emulation, tokenisation, provisioning or payment-provider code. NFC is used only by the demo, to
  *read* a harmless text code from a sticker; the app never writes to tags.

## Tap-to-pay demo (NFC simulation)

Open it from **Wallet → Tap-to-pay demo**, or **Card details → Pay → Try the tap-to-pay demo**.

**What it is:** a capstone demonstration of an NFC-triggered checkout using dummy data. Every screen shows
“Demo mode — no real money is charged”. Results are labelled *simulated*. The result is approve by default; switch
it to decline in the developer screen. Demo
receipts (dummy `DEMO-YYYYMMDD-XXXXXX` IDs) are saved locally with the rest of the app's data, and **Recent demo
receipts → Clear demo receipts** removes them. Nothing is sent over the network.

**What it isn't:** a website can't read, emulate or charge a contactless bank card. Web NFC only reads NDEF messages
on ordinary NFC Forum tags, and TAPO uses it only as a trigger.

### Testing with a real NFC tag (Android + Chrome)

1. **Phone:** an Android phone with NFC turned on (Settings → Connected devices → NFC), and Chrome 89 or newer.
2. **Prepare a demo tag** (any blank NFC Forum sticker or card, e.g. NTAG213). With a free tag-writing app such as
   *NFC Tools*, write **one Text record** containing exactly:

   ```
   TAPO-DEMO:CAPSTONE-01
   ```

   The code after `TAPO-DEMO:` can be 3–32 letters, numbers or dashes. **Never write card numbers, PINs or any
   payment data to a tag.** TAPO rejects tags without that prefix, and any that contain long numbers.
3. **Open the web app over a secure origin.** Web NFC only works on HTTPS or `localhost`; a LAN address like
   `http://192.168.1.5:8081` won't work. Either:
   - **USB port forwarding (easiest):** enable USB debugging on the phone, connect it, open `chrome://inspect/#devices`
     on your computer, turn on *Port forwarding* for `8081 → localhost:8081`, run `npm run web`, then open
     `http://localhost:8081` in Chrome on the phone; or
   - **HTTPS hosting:** `npx expo export --platform web` and deploy the `dist/` folder to any HTTPS static host.
4. In the demo, choose a merchant and amount → **Continue to tap** → **Scan demo NFC tag**. Allow NFC when Chrome
   asks, then hold the tag against the back of the phone. The tag code appears on the review screen and receipt.

Error cases you can demonstrate: deny the NFC permission prompt, tap a tag with different text (invalid tag), press
**Cancel scan**, or turn NFC off (unavailable).

### Native NFC in the iOS / Android app

The app uses [`react-native-nfc-manager`](https://github.com/revtel/react-native-nfc-manager) to read the same
`TAPO-DEMO:` text record with the phone's NFC hardware. It reads NDEF text only: it never selects payment
applications, never reads bank cards, never emulates a card and never writes to tags.

**Expo Go can't use it.** Expo Go only contains Expo's built-in native modules. In Expo Go the demo says it needs a
development build and offers **Simulate tap**. To scan real tags, build TAPO itself:

- **Android** (any NFC phone, free):
  - Local: install Android Studio, plug in the phone with USB debugging on, then run `npx expo run:android`.
  - Or cloud: `npx eas-cli@latest build --profile development --platform android`, then install the APK.
- **iPhone** (iPhone 7 or newer):
  - NFC tag reading is a restricted capability, so you need a **paid Apple Developer account**. Free provisioning
    can't sign the NFC entitlement.
  - Local (macOS + Xcode): `npx expo run:ios --device`.
  - Or cloud: `npx eas-cli@latest build --profile development --platform ios`.
- Then start the dev server with `npx expo start --dev-client` and open TAPO from the development build, not Expo Go.

The config plugin (in `app.json`) adds the Android `NFC` permission, the iOS `NFCReaderUsageDescription` text, and the
iOS `com.apple.developer.nfc.readersession.formats` entitlement. No ISO 7816 select identifiers are declared, so the
app can't select payment applications on cards.

**In the app:**
- **Android:** tap **Scan demo NFC tag** and hold the tag to the back of the phone. If NFC is off, the demo offers
  **Open NFC settings** and **Check again**.
- **iPhone:** tap **Scan demo NFC tag**. iOS shows its own scanning sheet; hold the tag near the top of the phone.
  Closing the sheet counts as cancelling.
- Phones without NFC, and Expo Go, fall back to **Simulate tap**.

### Simulating on iOS browsers, desktop and Expo Go

Safari and every iOS browser, desktop browsers, and Expo Go can't scan tags. The demo detects this, explains why,
and offers **Simulate tap**, which runs the same review → processing → result → receipt flow.

## Project structure

```
src/
  app/                 Expo Router routes (each file is a screen)
    _layout.tsx        Root stack + providers
    (tabs)/            Wallet, Best card, Activity, Insights, Settings tabs
    onboarding.tsx     First-run introduction
    developer.tsx      Hidden developer screen
    how-it-works.tsx   How TAPO works
    card/add.tsx       Add / edit card (modal; ?id= for edit)
    card/[id].tsx      Card details
    pay.tsx            “Tap to pay not available” screen
    demo-pay.tsx       Tap-to-pay demo (simulation): set up → tap → review → result
    demo-receipt/[id]  Saved demo receipt
    transaction/[id]   Sample transaction details
  components/          UI primitives, CardTile, TransactionRow
  lib/                 Types, sample data, rewards engine, insights, validation, storage,
                       demoNfc (shared tag checks + Web NFC), nativeNfc.native.ts (iOS/Android NFC), nativeNfc.ts (web stub)
  lib/__tests__/       Jest unit tests (formatting, rewards, validation, NFC tag parsing, insights)
  theme.ts             Colour/spacing tokens (WCAG AA contrast)
eas.json               EAS Build profiles: development (dev client), preview (installable APK), production
```

## Setup

Requirements: Node.js 20+ and npm. For devices: the **Expo Go** app (iOS App Store / Google Play), or Xcode
(macOS only) / Android Studio for simulators and emulators.

```bash
npm install
```

## Run

Start the dev server and scan the QR code with Expo Go (Android) or the Camera app (iOS):

```bash
npm start
```

Or launch directly:

```bash
npm run android   # Android emulator or connected device (Android Studio required)
npm run ios       # iOS Simulator (macOS + Xcode required)
npm run web       # Browser at http://localhost:8081
```

Everything runs in Expo Go except native NFC scanning in the tap-to-pay demo, which needs a development build (see
"Native NFC in the iOS / Android app"). In Expo Go the demo falls back to **Simulate tap**.

### Building installable apps

Use EAS Build (cloud, no local Xcode/Android Studio needed). The first time, link the project to your Expo account
(this adds a project ID to `app.json`):

```bash
npx eas-cli@latest init
```

The `development` profile builds TAPO with `expo-dev-client` (needed for native NFC); start it with
`npx expo start --dev-client`. The `preview` profile builds an installable app:

```bash
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

Or generate native projects locally with `npx expo run:android` / `npx expo run:ios`. Replace the placeholder
`com.example.tapo` identifiers in `app.json` before distributing.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint (ESLint)
npm test            # Jest unit tests (jest-expo)
npm run doctor      # expo-doctor
npx expo export --platform android --platform ios --platform web
```

> **Windows note:** if `expo export` fails with `spawn ...hermesc.exe ENOENT`, the project path is too long for
> Windows (MAX_PATH 260). Move the project to a shorter path such as `C:\dev\tapo`, or verify the JS bundles
> with `--no-bytecode`. If the web app shows stale content after moving the folder, start once with
> `npx expo start --clear`.

## Accounts and sign-in

Both the app and the website require an account. Accounts are **on-device**: there is no server.

- **Create account:** name, email and a password (8+ characters with a letter and a number). Only a random salt and a
  PBKDF2-SHA256 hash are stored (app: 20,000 iterations in [`src/lib/password.ts`](src/lib/password.ts), unit-tested
  against Node's PBKDF2; website: 210,000 iterations with Web Crypto). The password itself is never stored.
- **Sessions are memory-only:** restarting the app or reloading the page signs you out. The logo intro plays on the
  sign-in screen each time.
- **Each account has its own wallet** on the device. The first account created takes over any data saved before
  accounts existed.
- Wrong passwords get a generic "Email or password is incorrect"; five failures lock sign-in for 30 seconds.
- **Forgotten password:** it can't be recovered. "Can't sign in?" removes that account and its data from the device.
- Signed-out users can't open app screens: the router's `Stack.Protected` guards every screen except `sign-in`.

## Docs and showcase website

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the code works, with questions to practise before a review.
- [`docs/RESEARCH.md`](docs/RESEARCH.md): user-interview kit (hypotheses, screener, guide, recording template).
- [`docs/AI_USAGE.md`](docs/AI_USAGE.md): AI usage declaration for the team to complete and sign.
- `website/`: the project showcase page. Edit `website/template.html`, then run `npm run build:website` to produce
  `website/index.html` (it inlines Satoshi and the app's real CSV parser).
- CI: `.github/workflows/ci.yml` runs typecheck, lint, tests and a web build on every push.
- Host the web app under a sub-path with `EXPO_BASE_URL=/tapo npm run export:web` (see `app.config.js`).

## Before real contactless payments could be explored

This prototype is intentionally far from a payments product. At minimum, a real product would need:

1. **Regulatory standing in India** – partnering with RBI-regulated issuers/PA-PGs, compliance with RBI card
   tokenisation (CoFT) and card-data storage rules, KYC/AML, and the Digital Personal Data Protection Act, 2023.
2. **Network and issuer programmes** – formal agreements and certification with card networks (e.g. RuPay/NPCI,
   Visa, Mastercard) and their token service providers; real issuer reward data via official APIs.
3. **Platform wallet access** – Android HCE requires network-certified SDKs and Google approval; on iOS, NFC payments
   go through Apple Pay / the regionally restricted NFC & SE entitlement, which requires Apple approval.
4. **Security** – PCI DSS scope analysis, hardware-backed key storage, device attestation, secure provisioning with
   step-up authentication (issuer OTP flows handled by the issuer, not the app), fraud monitoring, pen testing and
   independent audits.
5. **Operations** – dispute and chargeback handling, customer support, incident response and a clear consumer
   disclosures/T&C process reviewed by legal counsel.

## Disclaimer

Sample data only. Reward estimates are illustrative and do not reflect real card terms. Not financial advice.
