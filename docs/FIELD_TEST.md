# Field test: real people, their own cards, the live app

Our [8 interviews](INTERVIEWS.md) showed what people *say*. This test checks what they *do*: whether people pick
their best card without TAPO, whether TAPO gets them to it, what it costs them in time and setup, and how much
they actually missed last month.

This plan was written and committed **before the first session**. The thresholds below are fixed now, so the
results can't be bent to fit them afterwards. If anything changes after session 1, add it to the change log at the
bottom with the date.

Kit:

- This page (the plan and the script)
- [`field-test/session-sheet.pdf`](field-test/session-sheet.pdf): print page 1 once and page 2 once per participant
- [`field-test/results.csv`](field-test/results.csv): type each session in, one row per participant

## What we're testing

| # | Question | How we'll know | Fixed in advance |
| --- | --- | --- | --- |
| H1 | Without help, do multi-card users pick their best card? | Their choice for 3 checkout scenarios, before they use TAPO | **Supported** if fewer than half of all choices without TAPO are the best card |
| H2 | How much do they miss in a month? | The "could have earned" figure from their own statement, read off their own phone | No threshold: this is the first measurement. Report how many people, the median and the range |
| H5 | Does TAPO get a real person to the best card? | Their choice for the same scenarios, using TAPO | **Supported** if at least 90% of choices with TAPO are the best card **and** the median time is 20 seconds or less |
| H6 | Is setup bearable? | Time to add all their cards | **Supported** if the median is 2 minutes or less per card |
| H3 | Do they use it on their own afterwards? | A message 7 days later | **Supported** if at least half say they opened Best card before paying at least once |

H1 to H3 are numbered as in [`INTERVIEWS.md`](INTERVIEWS.md); H5 and H6 are new.

## Who to recruit

- **10 to 15 people**, coded **F1, F2, …** (the interviews used P1–P8). The panel asks for at least 6.
- Each holds **2 or more cards** they actually use and pays by card at least once a week.
- **Not** someone who has already seen a TAPO demo. The 8 interviewees can take part; note it in their row.
- Aim for a spread of monthly card spend. Write down how each person was found (friend, family, classmate,
  referral, someone new). The panel will ask, so report the mix honestly.

## Before each session

- Ask them to bring **their own phone** (Android or iPhone, any browser) and, if they can, to download **last
  month's statement as a CSV** from their bank's website or app. Not every bank offers CSV; that's fine, the
  statement step is optional.
- Bring a printed participant record (page 2 of the session sheet), a pen and a stopwatch (a phone timer is fine).
- Open <https://tapo-seven.vercel.app/app/> on your own phone once, to check the site is up.

## The session (about 30 minutes)

One founder runs the session and reads the script; the other, if present, times and writes. **Never hold the
participant's phone, never look at their statement, and never write down a card number.**

### 1. Consent (2 min)

Read this aloud:

> Thanks for helping. We're testing TAPO, a student project that suggests which of your cards to use when you pay.
> It's a prototype: it doesn't make payments, and it never asks for your card number, CVV, PIN, OTP or bank login.
> Anything you type stays on your phone; we don't see it. We'll note your answers and timings under a code, not your
> name. You can skip any part or stop at any time. Is it OK if we quote something you say, without your name? Shall
> we start?

Tick consent and quote permission on the record. If they say no to consent, stop there and thank them.

### 2. Without TAPO (3 min)

Ask them to name each card they use with a letter and a few words, for example *"A: supermarket card"*. Write
these on the record, and use the same letters for the rest of the session. They can leave the bank name out.

Read each scenario, then start the timer. Stop it when they name a card. Don't react to their answer.

| # | Scenario (read exactly) |
| --- | --- |
| S1 | "You're paying **₹1,200** for **groceries** at a supermarket. Which of your cards do you use?" |
| S2 | "You're filling up **₹2,500** of **fuel** at a petrol pump. Which card?" |
| S3 | "You're paying **₹4,000** for **online shopping**. Which card?" |

After each answer ask: "How sure are you: not sure, fairly sure, or certain?"

The categories match the three we asked about in the interviews.

### 3. Set up TAPO on their phone (10 min, timed)

Start the timer when they open the link, and stop it when their last card is saved.

1. Open **<https://tapo-seven.vercel.app/app/>** and choose **Create account**. Any name, any email and a password
   they'll remember (there's no password reset).
2. Skip the introduction. A new account starts with **sample cards**, so go to **Settings → Remove all cards →
   Yes, remove**.
3. For each card, tap **+** at the top of **Wallet**.
   - Put the letter and description in **Nickname** (for example "A supermarket card").
   - **Issuer** is a sample list, so any choice is fine. Pick the right network and card type.
   - For **Last four digits**, any four digits will do: they're only a label. Say so.
   - Enter the **base reward rate** and any **category rates and monthly caps**. Ask them to check these on
     their bank's site if they can. Write down whether they **checked** them or **estimated** them.

**From here to the end of step 5, note where they get stuck:** a pause of more than about 10 seconds, a question
about what to do, or a wrong screen. Write the screen and what happened, for example "Add card, rates: didn't know
what a cap is". Only help once they've been stuck for 30 seconds or they ask, and count each time you do.

### 4. With TAPO (3 min)

Read S1 to S3 again, in the same order. Before each one, the app should be open on **Wallet**. They tap the
category under **Paying now?** and name the card. If TAPO says another card earns more from some amount up, they
should go by the scenario's amount. Time from the end of your sentence to them naming the card.

Then, for scoring, ask them to open **Best**, tap each category and type that scenario's amount. The card at the
top is **TAPO's top card**: the "best card" used to score both rounds. If two cards tie at the top, either counts.

### 5. Last month's missed rewards (optional, 5 min)

Only if they have a CSV statement on their phone and are happy to import it.

1. **Insights → Import your statement**, pick the card the statement is for, choose the file and import it.
   TAPO keeps only the date, the shop name and the amount from each row, on their phone.
2. Back on **Insights**, choose **Last Month**, and ask them to read out the line *"You could have earned about
   ₹… more by switching cards"*.

Write down that figure and the month. Don't look at the screen yourself unless they turn it to you. The figure is
only as good as the rates they entered, which is why "checked or estimated" is on the record.

### 6. Questions (5 min)

Ask these in order and write down their words. Don't explain or defend TAPO.

1. What, if anything, surprised you?
2. What was the hardest part of setting it up?
3. Think of the last time you paid by card. Would TAPO have changed the card you used? Why?
4. Would you keep TAPO on your phone after today? (Yes, maybe or no.) Why?
5. What would make you stop using it?
6. Some similar apps charge a monthly fee. If TAPO did, what's the most you'd pay, if anything?

Then ask if you can message them in a week. If they'd rather not keep TAPO, show them **Settings → Delete account**.

### 7. Seven days later

Send this, word for word:

> Hi, thanks again for trying TAPO last week. Two quick questions: in the last 7 days, how many times did you open
> Best before paying (0, 1–2, or 3 or more)? And did it change which card you used? An example would help.

## Recording and reporting

- Type each record into [`field-test/results.csv`](field-test/results.csv) the same day. One row per participant.
  Leave a cell empty if you didn't get the answer; never fill it in from memory later.
- Card columns hold the letter (A, B, C…). The best-card columns hold TAPO's top card, or "A/B" for a tie.
- Use the same words every time:
  - `monthly_card_spend`: `under 15k`, `15-30k`, `30-50k` or `over 50k`.
  - `*_sure`: `not sure`, `fairly` or `certain`.
  - `rates_checked_or_estimated`: `checked`, `estimated` or `mixed`.
  - `keep_using`: `yes`, `maybe` or `no`.
  - `day7_best_opens`: `0`, `1-2` or `3+`.
  - `stuck_points`: each one as `screen: what happened`, separated by semicolons. `times_helped`: a number.
  - Yes/no columns: `Y` or `N`.
- **After the first 6 sessions,** write a short summary: how many people got through setup and the three
  scenarios without help, the stuck points grouped by screen, and the top fixes (the problems that came up most).
  Add the fixes to [`CARRY_FORWARD.md`](CARRY_FORWARD.md) as open items.
- **Report every participant**, including people who stopped early or whose answers don't help us. Say how many
  sessions were run, how many finished, and how people were recruited.
- Write the results up in a new section below, with the numbers against each threshold, then update
  [`PROBLEM.md`](PROBLEM.md) and the slides. Keep paper records until the panel review is over, then shred them.

## Limits to state up front

- 10 to 15 people, mostly found through our own networks, can show a pattern; they can't prove the size of a market.
- "Best card" depends on the rates each person entered. Checked rates are more reliable than estimates, so we
  report both.
- Seven-day use is self-reported, because TAPO has no analytics (see [`NOT_BUILT.md`](NOT_BUILT.md)).
- The tap-to-pay demo is left out on purpose. It uses a sample shop and amount, and this test is about each
  person's own cards.

## Results

*Not run yet.*

## Change log

| Date | Change | Why |
| --- | --- | --- |
| 2026-11-27 | Added a record of where people get stuck and when we help, and a summary after 6 sessions | The panel's shared plan asks for a written summary of where 6 users struggle, and the top fixes. Added before the first session; no pass mark changed |
