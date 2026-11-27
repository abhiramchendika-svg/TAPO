# Carry-forward register

What we've decided, what we've learned and what's still open. It keeps the product and the pitch in step, and it
lets Semester 4 start where we stopped.

**Roles in the shared plan:** CEO, Abhiram · CTO, Saanvi.

**The rule:** if either of us wants to add a feature or change direction, we talk it through first, update the
shared plan and record it here. Mark a decision "Agreed" only once both of us have read it.

## Decisions

"Recorded" is the date of the first commit that put the decision into the code or the docs, not necessarily the day
we made it.

| Recorded | Decision | Why | Both agreed |
| --- | --- | --- | --- |
| 2026-11-23 | Everything stays on the device: no server and no bank linking | No server to breach. Bank access is regulated and would mean holding credentials | To confirm |
| 2026-11-23 | No real payments. NFC only starts a labelled, simulated checkout | Moving money needs regulated partners, RBI compliance and card-network approval | To confirm |
| 2026-11-23 | Users type their own reward rates; issuer names are made up | No reliable source for rates, and we must never suggest a bank partnership | To confirm |
| 2026-11-24 | Accounts on the device, each wallet encrypted with a key made from the password | Spending data is private; without the password it can't be read | To confirm |
| 2026-11-24 | A public website, with the web app under `/app`, hosted on Vercel | Anyone can try it from a link, with no install | To confirm |
| 2026-11-23 | Statements come in as CSV only, not PDF or a bank connection | CSV columns can be found reliably; PDFs differ by bank ([`NOT_BUILT.md`](NOT_BUILT.md)) | To confirm |
| 2026-11-26 | Passwords hashed with 600,000 rounds on the web, at least 100,000 timed per phone; older accounts upgraded at sign-in | 20,000 rounds was below current guidance | To confirm |
| 2026-11-27 | Best card answers in one tap; the amount is optional | Interviews showed habit wins at the counter. **Built before both of us agreed it in the shared plan** | To confirm |
| 2026-11-27 | Field-test pass marks fixed before the first session | So results can't be bent to fit them afterwards ([`FIELD_TEST.md`](FIELD_TEST.md)) | To confirm |
| 2026-11-27 | A new user chooses "Add my cards" (an empty wallet, straight into Add card) or "Explore with sample cards" at the end of the introduction. "Sample" labels now appear only on sample data | Shared plan step 4: the core flow has to run on real data without help. Before, a real user had to find "Remove all cards" in Settings | To confirm |

## Lessons

- **What people say isn't what they do.** Our 8 interviews recorded intentions. The field test measures behaviour.
- **Measure the number that matters while people are in front of you.** We didn't measure missed rupees in the
  interviews, so that hypothesis (H2) is still "Unclear".
- **Record who ran each interview and where.** The panel asks for 5 off campus and 3 led by the CTO, and we
  hadn't written it down.
- **Test the live site, not just the build on a laptop.** Direct links to app screens returned 404 on Vercel until
  we gave each screen its own page (2026-11-25).
- **Check security settings against current guidance early.** Password hashing started at 20,000 rounds and had to
  be raised (2026-11-26).
- **Agree a change before building it.** The one-tap best card went in before it was in the shared plan.

## Open items

Step numbers refer to the shared project plan in the panel's report.

| # | Item | Owner | Step | Status |
| --- | --- | --- | --- | --- |
| 1 | Fill in where each interview was held, who led it and the person's exact words in [`INTERVIEWS.md`](INTERVIEWS.md). If fewer than 5 were off campus or 3 led by the CTO, run more | CEO (CTO for the 3) | 1 | Columns ready to fill |
| 2 | Run at least 6 field-test sessions, then write a summary of the six and the top fixes | Both | 5 | Kit ready |
| 3 | Add a "where they got stuck" field to the field-test sheet | CTO | 5 | Done 2026-11-27 |
| 4 | Decide whether a new account can start empty instead of with sample cards | Both | 4 | Built 2026-11-27 as a choice; confirm the decision above |
| 5 | On a real phone, go through sign-up, "Add my cards", two cards and a one-tap answer | CTO | 4 | Open |
| 6 | On the demo phone, note the hashing rounds and time (Settings, tap the version 7 times, Developer, Password hashing) | CTO | 3 | Open |
| 7 | Label the architecture diagram: no backend, no AI, and the outside services (Vercel, GitHub Actions, EAS) | CTO | 3 | Done 2026-11-27 ([`ARCHITECTURE.md`](ARCHITECTURE.md)); walk through it together |
| 8 | Rebuild the pitch on field proof. [`PITCH_CHECK.md`](PITCH_CHECK.md) lists the 12 claims that need work and what's missing | CEO | 6 | Claims checked; rebuild after the field test |
| 9 | Practise the swap demo: the CEO demos the product, the CTO answers business questions | Both | 7 | Open |
| 10 | Each write the problem in one line without looking at the other's, then compare | Both | Self-check | Open |
| 11 | Work out the cost to serve one user: hosting, storage and any paid service | CEO | CEO path, stage 3 | Open |
| 12 | Check RBI for figures newer than August 2026 before presenting ([`MARKET.md`](MARKET.md)) | CEO | 2 | Open |
| 13 | Tick and sign [`AI_USAGE.md`](AI_USAGE.md) | Both | — | Open |
| 14 | Find out whether real cards drop to the base rate once a cap is used up, and model it if they do | CTO | — | Open |
| 15 | Run the browser tests in CI, not only on our laptops | CTO | — | Open |
| 16 | Decide whether a user's own card should still show the SAMPLE badge and "DEMO CARDHOLDER" on its picture. Today every card picture does, because it uses a made-up bank name | Both | 4 | To discuss |
