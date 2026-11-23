# User research kit

The sponsor's first question will be: **"How do you know people need this?"** This kit lets the team answer with
evidence. It contains **no findings**: you must run the interviews yourselves and record what real people said.
Never invent or "estimate" research results.

## Goal and hypotheses

We believe that **people in India who carry two or more payment cards** often use a card that earns less than
another card they already own, and would use a tool that tells them which card to use.

| # | Hypothesis | Evidence that would support it | Evidence that would kill it |
| --- | --- | --- | --- |
| H1 | Multi-card users don't know which card earns most for a given purchase | Most can't name the best card for 3 categories | Most answer correctly and quickly |
| H2 | They lose a meaningful amount of rewards every month | Missed rewards from imported statements ≥ ₹200/month for many | Missed rewards are near ₹0 |
| H3 | They would check an app before or after paying | Several say they'd use it weekly; ask to try it | "Not worth the effort" is the common answer |
| H4 | They'd share a statement CSV if it stays on the phone | Most agree after seeing the privacy note | Most refuse even with on-device processing |

## Who to recruit (screener)

Aim for **8–12 interviews**, at least 5 of them working professionals rather than classmates.

1. How many credit or debit cards do you use regularly? (**Continue only if 2 or more**)
2. Roughly how much do you spend on cards per month? (under ₹10k / ₹10–30k / ₹30–75k / over ₹75k)
3. Do you know your cards' reward rates? (yes, all / some / no)
4. Age band and city (for diversity only; don't record names with answers)

## Interview guide (20–25 minutes)

**Consent first.** "We're students researching how people choose which card to pay with. There are no right
answers. We won't record your name or any card details. Can we take notes?" Never ask for card numbers,
statements or screenshots containing account details.

1. **Context.** Tell me about the last time you paid for something with a card. Which card, and why that one?
2. **Knowledge.** Without checking, which of your cards is best for groceries? Fuel? Online shopping? (Note
   confidence and time taken; you can't verify, just record.)
3. **Pain.** Have you ever found out you used the "wrong" card? What happened?
4. **Current workaround.** Do you track rewards today? How (notes, spreadsheet, another app, nothing)?
5. **Concept test.** Show the TAPO Wallet and Best-card screens. "What do you think this does?" Then: "Would
   you use it? When: before paying, or after?"
6. **Missed rewards.** Show the missed-rewards card. "If this said ₹___, would that change what you do?"
7. **Privacy.** "Would you import a statement CSV if it never left your phone? Why or why not?"
8. **Willingness.** "If you could change one thing, what would it be?"

## Measuring missed rewards for real (optional, with consent)

Ask a participant to import **their own** statement CSV into TAPO **on their own phone**, set up their cards'
reward rules, and read out only the **Missed rewards · month** number. Don't collect the file or the
transactions. Record only the number.

## Recording template (one row per participant)

| P# | Cards | Monthly spend band | Knew best card? (0–3) | Story of using wrong card? | Would use (Y/N/maybe) | Before/after paying | Would import CSV? | Missed ₹ (if measured) | Best quote |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | | | | | | | | | |

## Synthesis for demo day

Present **one slide** with:

1. Number of people interviewed and who they were.
2. For each hypothesis: supported, unclear or rejected, with the count (for example "7 of 10 couldn't name the
   best card for fuel").
3. One or two real quotes (with permission, no names).
4. The median missed-rewards number, only if you measured it, with the sample size.
5. What you changed in the product because of what you heard.

## Success metrics for a pilot

| Metric | Definition |
| --- | --- |
| Activation | % of new users who add ≥ 2 cards and import one statement in the first week |
| Core value | Median missed rewards per user per month (should fall over time if TAPO works) |
| Engagement | % of users who open "Best card" at least once a week |
| Trust | % of users who import a statement after reading the privacy note |
