# Pay It Sideways

> Someone showed up for you. Show up for someone else.

Pay It Sideways is a mobile-first Nimiq Pay Mini App for sending a genuine, private note of appreciation, optionally with a small claimable NIM gift. The recipient can keep it with no obligation or let it inspire a new message for someone else. Words-only participation is deliberately a complete experience.

## Why Nimiq is integral

The optional gift is funded by a real NIM transaction confirmed inside Nimiq Pay. The sender does not need the recipient's wallet address: the app generates a one-use gift account, Nimiq Pay funds it, and the complete private link lets the recipient claim to an account they select. Passing it on creates a new message and, only if chosen, a new transaction. Pay It Sideways never receives or controls the private key and never custodies funds. A recent-links screen can reconstruct sent links on the original device without storing the note's words in that index.

This is an app-specific bearer gift, similar in principle to a Nimiq Cashlink. Anyone with the complete link can claim an unclaimed gift, so it must be shared privately.

## Product flow

1. Write why someone came to mind and what you want them to hear.
2. Send words only, or fund a private NIM gift through Nimiq Pay.
3. Share one private recipient link—no recipient address is required.
4. The recipient keeps the message/gift or starts the next act in the chain.
5. The chain shows anonymous totals, never names, rankings, or wallet addresses.

## Stack and architecture

- Vue 3, TypeScript, and Vite
- Official `@nimiq/mini-app-sdk` injected provider for wallet operations
- `@nimiq/core` loaded lazily for one-use gift keys and locally signed claims
- Cloudflare Worker API and D1
- Same-origin frontend/API with a strict CSP and no third-party scripts

Recipient tokens and gift keys have separate security properties. Only the SHA-256 hash of the 256-bit recipient token is stored in D1. The one-use gift key is in the URL fragment, which is not sent in HTTP requests, plus a local recovery copy on the sender's device. The backend stores only public blockchain data and verifies both the funding output and confirmed claim before recording them.

## Local development

Prerequisites: Node.js 22+, npm, and Nimiq Pay on a phone or emulator.

```sh
npm install
npm run db:migrate:local
npm run dev:api
```

In a second terminal:

```sh
npm run dev
```

Open Vite's `Network` URL from Nimiq Pay's custom Mini App URL field. The phone and computer must be on the same network; `localhost` will not work from the phone. For payment testing, switch Nimiq Pay to Testnet.

## Verification

```sh
npm test
npm run typecheck
npm run typecheck:worker
npm run build
npm audit --audit-level=high
```

The 26 automated tests cover exact Luna parsing, gift-key validation, Nimiq network mapping, device-local link recovery, storage-failure protection, strict funding/claim transaction matching, and the complete Worker/D1 lifecycle in Cloudflare's local Workers runtime. That integration suite includes idempotent saves, private retrieval, keep/pass linkage, reporting, bounded analytics, forged-claim rejection, broadcast, and post-chain confirmation. The message-only UI and recent-link recovery are also verified through a mobile-sized browser run. Final release acceptance includes a real Testnet Send → Claim → Pass run inside Nimiq Pay.

## Deployment

1. Authenticate Wrangler: `npx wrangler login`.
2. Create D1: `npx wrangler d1 create pay-it-sideways`.
3. Put the returned database ID in `wrangler.jsonc`.
4. Apply migrations: `npx wrangler d1 migrations apply pay-it-sideways --remote`.
5. Build and deploy: `npm run build` then `npx wrangler deploy`.
6. Add the HTTPS deployment URL as a custom Mini App in Nimiq Pay and rerun the release checklist on Testnet, then Mainnet with the minimum amount.

## Privacy and safety

- No accounts, real names, public feed, public wallet addresses, or advertising trackers
- Messages are accessible only to anyone holding their unguessable recipient link
- NIM transactions remain public on the Nimiq blockchain
- Reporting permanently removes message text without blocking an attached gift claim
- Request size and field limits, prepared SQL, transaction verification, CSP, `no-referrer`, and no-store API responses reduce abuse and leakage risks
- No leaderboard, streak, pressure language, or financial ranking

See [SECURITY.md](SECURITY.md) for the threat model and [SUBMISSION.md](SUBMISSION.md) for competition copy and the final release checklist.

## Known operational dependency

The Worker uses public Nimiq RPC history endpoints to detect networks, verify confirmed funding/claims, read gift balances, and broadcast signed claims. If those endpoints are temporarily unavailable, the app preserves a funded draft on the sender's device and asks the user to retry rather than paying twice.

## Licence

[MIT](LICENSE)
