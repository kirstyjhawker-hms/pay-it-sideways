# Cycle II submission pack

## Portal fields

| Field | Value |
| --- | --- |
| App name | Pay It Sideways |
| Category | Social |
| Tagline | Someone showed up for you. Show up for someone else. |
| Pricing | Free |
| Repository | https://github.com/kirstyjhawker-hms/pay-it-sideways |
| Demo | https://pay-it-sideways.grand-sugar.workers.dev |
| Video | Add walkthrough URL if recorded |
| GitHub login | `kirstyjhawker-hms` |
| Contact email | Add in the submission portal; do not commit if you prefer it private |
| Nimiq payout address | Add in the submission portal; never use a gift address |

## Description (under 250 words)

Pay It Sideways begins with a three-beat story: think of one person, send one private link, and let them choose what follows. It turns a private note of appreciation into an invitation—not an obligation—to create another kind moment.

A sender answers two simple prompts, then sends their own genuine words. They can optionally add a small NIM gift through Nimiq Pay, but “Words are enough” is the default and is treated as a complete experience. The sender never needs the recipient’s wallet address: one private link carries both the note and, when present, a one-use claimable NIM gift.

The recipient sees the message, the calm promise that nothing is expected in return, and two choices: keep this kindness or pass it sideways. Keep claims an attached gift into an account they choose. Pass moves that exact gift directly into the next one-use private link alongside a fresh message—without routing it through the recipient’s wallet or Pay It Sideways.

Anonymous chain totals show recipient links actually opened, notes created, words-only acts, and NIM attached across notes. A separate private trail lets the sender watch the ripple without seeing messages, identities, recipient choices, or wallet addresses. There are no leaderboards, streaks, guilt prompts, or “biggest giver” mechanics.

Nimiq is integral to the addressless gift experience. Nimiq Pay confirms the funding transaction, while the complete private link lets the recipient claim to their chosen Nimiq account or relay the same gift link-to-link. Pay It Sideways never custodies funds or stores the gift key on its server.

## Builder story

Crypto gifting normally begins with plumbing: “What is your wallet address?” Pay It Sideways begins with the person. I wanted a product where a sincere sentence still feels whole at 0 NIM, while a tiny payment can add something tangible without becoming a score, status symbol, or social debt. The difficult part was making one link preserve the recipient’s choice. The resulting addressless bearer gift keeps wallet mechanics quiet, uses real NIM, and lets a message reach someone who has never exchanged an address with the sender.

## 60-second walkthrough

1. Open Pay It Sideways inside Nimiq Pay; let the three-beat story establish person → private link → choice.
2. Tap **Start with someone** and answer the two prompts.
3. Choose **Add a little NIM**, select 0.5 NIM, and show the native confirmation.
4. Share the resulting private link to a second device/account.
5. Open it and show the message, attached NIM, and “nothing you need to do.”
6. Tap **Pass this gift forward**, write a new note, and show “Carry 0.5 NIM forward—the same gift, not a new payment.”
7. Send the next private link and open it on a third device to show the gift genuinely travelled with the chain.
8. Open the sender’s private trail, then use **Keep** to claim into a chosen Nimiq account.

## Required media

- `icon.png`: square app icon
- `thumbnail.png`: landscape showcase thumbnail
- Four portrait screenshots: home, message creation, optional NIM, recipient choice
- Optional 45–60 second walkthrough video following the script above

## Release gate

- [x] MIT licence and no committed credentials
- [x] Official Mini Apps SDK used for the real wallet transaction
- [x] NIM is central and words-only remains first-class
- [x] Message-only Send → Receive → Keep/Pass works
- [x] Claimable link requires no recipient address
- [x] Funding and claim records are verified against the blockchain
- [x] Mobile widths, tap targets, focus states, and reduced motion checked
- [x] 31 unit/Worker-D1 integration tests, type checks, production build, and dependency audit pass
- [ ] Real Testnet Send → link-to-link Pass → Claim rerun in the current Nimiq Pay build
- [x] Cloudflare authentication, D1 creation/migration, and production deployment
- [x] Public GitHub repository published and URL inserted above
- [x] Production link tested inside Nimiq Pay, including native share/copy
- [x] Icon, thumbnail, and four final screenshots prepared in `submission-assets/`
- [ ] Optional video recorded and uploaded
- [ ] Contact email, confirmed GitHub login, and personal payout NIM address entered
- [ ] Submission portal review completed—but do not press final submit until ready
