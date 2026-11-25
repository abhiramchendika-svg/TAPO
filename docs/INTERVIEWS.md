# Interview notes

The questions we asked are in [`RESEARCH.md`](RESEARCH.md); the problem these interviews test is in
[`PROBLEM.md`](PROBLEM.md). No names, card numbers or statements were recorded.

## Who we spoke to

- **8 people** who regularly pay with **2 to 5 cards** (median 3).
- Monthly card spend from **₹12,000 to ₹65,000**.
- **"Knew best card?"** is how many of three categories (groceries, fuel, online shopping) they could name their
  best card for without checking.
- **Missed rewards were not measured.** Doing that needs a participant to import their own statement into TAPO on
  their phone (see [`RESEARCH.md`](RESEARCH.md)), which we didn't do in these sessions.

| P# | Cards | Monthly card spend | Knew best card? (0–3) | Story of using the wrong card | Would use TAPO? | Before or after paying? | Would import a CSV? | Missed ₹ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | 3 | ₹28,000 | 1 | Often forgets which card gives rewards at supermarkets | Yes | Before | Yes | Not measured |
| P2 | 2 | ₹15,000 | 2 | Used a low-reward card for a large electronics purchase | Yes | Before | No | Not measured |
| P3 | 4 | ₹42,000 | 1 | Chooses whichever card is easiest to reach | Yes | After | Yes | Not measured |
| P4 | 2 | ₹12,000 | 3 | Usually knows which card to use and rarely switches | No | Before | No | Not measured |
| P5 | 5 | ₹65,000 | 0 | Has several cards but doesn't track their reward categories | Yes | After | Yes | Not measured |
| P6 | 3 | ₹35,000 | 2 | Realised after checkout that another card offered better rewards | Yes | Before | Yes | Not measured |
| P7 | 2 | ₹22,000 | 1 | Missed a promotional offer because they forgot which card qualified | Yes | After | No | Not measured |
| P8 | 4 | ₹51,000 | 2 | Uses one preferred card for most purchases despite having alternatives | Maybe | Before | Yes | Not measured |

## What we found

| # | Hypothesis | Result | Evidence |
| --- | --- | --- | --- |
| H1 | Multi-card users don't know which card earns most for a purchase | **Supported** | 7 of 8 couldn't name their best card for all three categories; 4 of 8 could name it for one or none. Only P4 got all three. |
| H2 | They lose a meaningful amount of rewards each month | **Unclear** | 7 of 8 described paying with a card that earned less, or not knowing which earned more. We didn't measure the amount, so we can't say how much it is. |
| H3 | They would check an app before or after paying | **Supported** | 6 of 8 said they would use TAPO and 1 said maybe. Of those 7, 4 would check *before* paying and 3 *after*. |
| H4 | They would import a statement CSV | **Mostly supported** | 5 of 8 said yes; 3 said no (P2, P4, P7). |

## Patterns worth noting

- **The less people knew, the more they wanted TAPO.** All four people who could name their best card for one
  category or none (P1, P3, P5, P7) said yes. The only person who knew all three (P4) said no.
- **People pick by habit, not by rewards.** P3 uses whichever card is easiest to reach, and P8 uses one preferred
  card despite having others. A tool has to be faster than reaching for the usual card.
- **Before and after are both real moments.** The split (4 before, 3 after among likely users) supports having both
  the best-card check before paying and the missed-rewards view after.
- **Not everyone will import a statement.** Three people wouldn't, including two who would use TAPO (P2, P7).
- **Offers matter too.** P7's story was a time-limited promotional offer, not a standing reward rate.

## What this means for TAPO

| What we heard | What it means for TAPO |
| --- | --- |
| Habit wins at the counter (P3, P8) | The answer must come in a moment; this supports starting the checkout with a single tap |
| 4 would check before paying, 3 after | Keep both **Best card** (before) and **Missed rewards** (after) |
| 3 of 8 wouldn't import a statement | Best card has to be useful on its own, without an import |
| A missed offer, not a missed rate (P7) | Time-limited offers aren't tracked today; they're a candidate for a later version |
| Missed rewards not measured | Next round: measure missed ₹ with participants' own statements on their own phones |
