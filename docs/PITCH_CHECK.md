# Pitch claim check

The shared plan's step 6 says every claim in the pitch must be backed by interview notes or user feedback. We checked
the 31 claims in the 11 slides and their speaker notes (`docs/slides/TAPO Presentation.pptx`, as of 2026-11-27):

- **19 are backed:** 5 by our interviews, 4 by outside sources and 10 by the working product.
- **12 need work before the pitch is rebuilt:** 4 to reword, 4 to check on a real phone, 2 out of date and 2 to
  reframe.

No claim about what users *do* is backed yet. Everything we know about users is what they told us. The
[field test](FIELD_TEST.md) is what turns that into proof.

## Claim by claim

Verdicts: **Backed** · **Reword** (the evidence supports something weaker) · **Check first** (true in the code,
not yet seen on a real device) · **Out of date** · **Reframe** (true, but leads with the wrong thing for the panel).

| Slide | Claim | Backed by | Verdict |
| --- | --- | --- | --- |
| 1 | "A prototype of an NFC-triggered payment flow, inside a rewards wallet" | The product | **Reframe:** the panel wants the pitch to open with the problem and field proof, not the NFC demo |
| 1, notes | "TAPO is my capstone" | — | **Reword:** it's a venture with two founders |
| 2 | 8 people with 2 to 5 cards, spending ₹12,000–₹65,000 a month | [Interviews](INTERVIEWS.md) | Backed |
| 2 | 7 of 8 couldn't name their best card for groceries, fuel and online shopping | Interviews, H1 | Backed |
| 2 | 7 of 8 had paid with a card that earned less, or didn't know which earned more | Interviews, H2 | Backed |
| 2, notes | "Seven had a story of paying with a card that earned less" | Interviews: only some told such a story; others said they don't track | **Reword** to the slide's wording |
| 2 | 6 of 8 would use TAPO, plus 1 maybe; 4 would check before paying, 3 after | Interviews, H3 | Backed, as what they *said* |
| 2 | The only person who knew all their best cards didn't want TAPO | Interviews, patterns | Backed |
| 3 | 12.4 crore cards; ₹2 lakh crore spent a month | RBI via Angel One ([market note](MARKET.md)) | Backed. Check for a newer month |
| 3 | 22% of cardholders hold 3 or more cards | TransUnion CIBIL via Business Today | Backed |
| 3 | 92% use cards that don't fit how they spend | 1 Finance study of 129 people | Backed; always say "in a study of 129 people" |
| 3 | What CheQ Wisor, PointsFly, CRED, CardPointers and MaxRewards do | YourStory, App Store listings | Backed, as the companies' own claims |
| 3 | TAPO stays on your phone, with no linked accounts | The product | Backed |
| 4 | TAPO compares reward rules and the monthly caps already used | `rewards.ts` and its tests | Backed |
| 4, notes | "I am not making claims about market size here" | — | **Out of date:** slide 3 now gives market figures |
| 5 | Best card ranks your cards and counts monthly caps | `rewards.ts` and its tests | Backed |
| 5 | Missed rewards "shows what the wrong card cost" | `insights.ts` | **Reword:** it's an estimate that ignores caps; say "about" |
| 5 | "Runs on iOS, Android and the web" | One Expo codebase | **Check first:** if it hasn't been run on an iPhone, say "built for iOS" |
| 5, notes | The NFC checkout "is the focus of today" | — | **Reframe** around the problem, proof and live demo |
| 6 | Nothing is sent over the network at any step | `demo-pay.tsx`; the site's security policy | Backed |
| 7, notes | Every demo screen carries the "Demo mode" banner | `DemoModeBanner` on both demo screens | Backed |
| 8 | Native NFC in Android and iOS app builds | `nativeNfc.native.ts` | **Check first:** confirm a tag has been read on a real Android build; the iPhone build needs a paid Apple account |
| 8 | Wallet encrypted with AES-256-GCM, key from the password (PBKDF2) | `vault.ts`, `auth.tsx` | Backed |
| 8 | Static website and web app "set up for Vercel" | `vercel.json` | **Reword:** it's live at tapo-seven.vercel.app |
| 9 | 3 platforms from one codebase | One Expo codebase | **Check first:** same as slide 5 |
| 9 | 2 real NFC paths, Web NFC and native NFC | `demoNfc.ts`, `nativeNfc.native.ts` | **Check first:** confirm each has read a real tag |
| 9 | 0 fields for card numbers, CVV, PIN or OTP | `types.ts` | Backed |
| 9 | Unit and end-to-end tests; CI checks every push | 68 unit tests and 16 browser tests; CI runs the unit tests | Backed |
| 9 | Password never stored; wallet locks after inactivity | `auth.tsx` | Backed |
| 10 | What TAPO is not, and where tag scanning works | The product and `NOT_BUILT.md` | Backed |
| 11 | Next step: "Run usability sessions" | [`FIELD_TEST.md`](FIELD_TEST.md) | **Out of date** once the sessions run: replace with the results and the top fixes |

## What the rebuilt pitch is missing

Step 6 asks for the problem, field proof, a live demo and next steps. Today's deck has:

- **No field proof.** The field-test results go here, measured against the pass marks fixed in advance.
- **No mention of the one-tap best card**, now the core flow. It should be the live demo, run on someone's own cards.
- **Nothing on what's unproven.** The [market note](MARKET.md) lists it; say it before the panel asks.
- **Next steps that predate the panel's feedback.** Take them from the open items in
  [`CARRY_FORWARD.md`](CARRY_FORWARD.md).
