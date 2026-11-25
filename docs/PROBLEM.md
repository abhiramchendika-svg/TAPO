# Problem statement

## In one sentence

People in India who carry two or more payment cards often pay with a card that earns less than another card
they already own, because no one can keep every card's reward rules and monthly caps in their head at the
moment of paying.

## Who has this problem

- Working professionals and students with **two or more credit or debit cards**, each with different reward
  rates for different kinds of spending (groceries, dining, fuel, travel, online, and so on).
- Typically people who chose their cards *for* their rewards, so the rewards matter to them, but who decide
  which card to use in a few seconds at a counter or checkout page.

## Why it happens

1. **The rules are per card and per category.** One card pays well on groceries, another on dining, a third on
   everything at a flat rate.
2. **Rewards are capped.** Many category rates stop after a monthly cap, so the best card for a purchase can
   change partway through the month.
3. **The decision is made at checkout**, in a hurry, from memory. Card apps show each card on its own; none
   compares *your* cards against each other for *this* purchase.
4. **The loss is invisible.** A statement shows what you earned, never what the card you didn't use would have
   earned, so people don't notice the gap.

## What we set out to learn

These are the hypotheses our interviews tested. The results and the notes behind them are in
[`INTERVIEWS.md`](INTERVIEWS.md); the method and questions are in [`RESEARCH.md`](RESEARCH.md).

| # | Hypothesis |
| --- | --- |
| H1 | Multi-card users don't know which of their cards earns the most for a given purchase. |
| H2 | They lose a meaningful amount of rewards every month as a result. |
| H3 | They would check an app before or after paying. |
| H4 | They would import a statement if it never leaves their phone. |

### What we heard (8 interviews)

- **7 of 8** couldn't name their best card for groceries, fuel and online shopping; only one person could.
- **7 of 8** described paying with a card that earned less, or not knowing which card earned more.
- **6 of 8** would use TAPO and one more said maybe. The one person who already knew their best cards said no.
- **5 of 8** would import a statement; 3 wouldn't.
- We did **not** measure how much people miss in rupees; that's the next round of research.

## What TAPO does about it

TAPO is a rewards wallet. You add your cards with their reward rates and monthly caps (never a card number),
and TAPO:

1. **Recommends the best card for a purchase**, explaining why, and accounting for caps already used this month
   ([`src/lib/rewards.ts`](../src/lib/rewards.ts)).
2. **Shows the rewards you missed**: import a statement CSV on the device and TAPO compares each purchase with
   the best card you had ([`src/lib/insights.ts`](../src/lib/insights.ts)).
3. **Puts the decision at the moment of paying**: a tap on an NFC tag starts a checkout that uses the recommended
   card. In this capstone that checkout is a simulation with dummy data; see the README.

## How we would know it works

| Metric | Definition |
| --- | --- |
| Activation | Share of new users who add 2 or more cards and import one statement in their first week |
| Core value | Median missed rewards per user per month, which should fall over time |
| Engagement | Share of users who open "Best card" at least once a week |
| Trust | Share of users who import a statement after reading the privacy note |

What we deliberately did not build, and why, is in [`NOT_BUILT.md`](NOT_BUILT.md).
