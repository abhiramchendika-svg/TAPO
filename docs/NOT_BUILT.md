# What we have not built, and why

| Not built | Why |
| --- | --- |
| **Real payments** (no payment provider, card network, tokenisation or approval from a bank) | Moving money in India needs regulated issuer and payment partners, RBI compliance, card-network certification and PCI DSS scope. None of that is possible or appropriate in a capstone, so the checkout is a clearly labelled simulation with dummy data. |
| **Reading or emulating a contactless bank card** | It would need card-network and platform-wallet approval and would put real card data on the phone. NFC is used only to read a short text code from a demo tag, and tags containing long numbers are rejected. |
| **A real approve/decline decision** | There is no bank behind the demo to decide. The result is set in a hidden developer screen so both outcomes can be shown. |
| **Linking bank accounts** (net banking, account aggregator) | Regulated, and it would mean holding bank credentials or tokens. Statement CSVs imported on the device give the same spending data without any login. |
| **Reward rates filled in automatically** | Issuers change rates and caps often and publish them in different formats, and we had no reliable source we could check. Users enter each card's rates, so the figures are theirs to verify. |
| **PDF statement import** | Statement layouts differ from bank to bank. Only CSV is supported, parsed on the device by [`src/lib/csvImport.ts`](../src/lib/csvImport.ts). |
| **Smarter merchant categorisation** | Purchases are sorted by keyword rules; unknown shops fall into "Other". A merchant database or a trained model was out of scope. |
| **Cloud sync, backup and password recovery** | All data stays on the device, encrypted with a key made from the password, so there is no server to breach. The trade-off: a forgotten password can't be recovered, and data doesn't move between devices. |
| **App Store and Play Store releases** | The bundle identifiers are still placeholders (`com.example.tapo`), and NFC on iPhone needs a paid Apple Developer account to sign. TAPO runs as a development build and on the web. |
| **Usage analytics** | Left out for privacy. The pilot metrics in [`PROBLEM.md`](PROBLEM.md) would need opt-in analytics before they could be measured. |
