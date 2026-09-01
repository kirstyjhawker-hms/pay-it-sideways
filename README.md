# Pay It Sideways

> Someone showed up for you. Show up for someone else.

Pay It Sideways is a mobile-first Nimiq Pay Mini App for sending a genuine, private note of appreciation, optionally with a small claimable NIM gift. The recipient can keep it with no obligation or let it inspire a new message for someone else. Words-only participation is deliberately a complete experience.

**Live app:** https://pay-it-sideways.grand-sugar.workers.dev

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

Recipient tokens and gift keys have separate security properties. Only the SHA-256 hash of the 256-bit recipient token is stored in D1. The one-use gift key is in the URL fragment, which is not sent in HTTP requests, plus a local recovery copy on the sender's device. Before relaying a claim, the backend decodes the signed transaction through Nimiq RPC and constrains it to the stored gift address, exact Luna value, basic account types, zero fee/data/flags, and recorded network. It then verifies the included claim independently before recording it.

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

The 29 automated tests cover exact Luna parsing/storage, gift-key validation, Nimiq network mapping, device-local link recovery, storage-failure protection, opt-in analytics consent, CSP drift protection, strict funding/claim transaction matching, and the complete Worker/D1 lifecycle in Cloudflare's local Workers runtime. That integration suite includes idempotent saves, private retrieval, keep/pass linkage, reporting, bounded analytics, fabricated-payment and raw-relay rejection, interrupted claim recovery, rebroadcast, and post-chain confirmation. The message-only UI, recent-link recovery, analytics preference, and Nimiq WebAssembly under production CSP are also verified through mobile-sized browser runs. Release acceptance included a real Testnet Send → Claim → Pass run and native share/copy inside Nimiq Pay.

## Deployment

1. Authenticate Wrangler with `npx wrangler login`, or use the documented one-hour claimable preview flow with `npx wrangler deploy --temporary`.
2. Run `npm run build` and `npx wrangler deploy`. For a new deployment, current Wrangler can provision an ID-less D1 binding and write its resource ID to the configuration.
3. Apply all migrations with `npx wrangler d1 migrations apply pay-it-sideways --remote`.
4. Deploy once more so the verified build and migrated database are the release pair.
5. Add the HTTPS deployment URL as a custom Mini App in Nimiq Pay and rerun the release checklist on Testnet, then Mainnet with the minimum amount.

## Privacy and safety

- No accounts, real names, public feed, public wallet addresses, or advertising trackers
- Messages are accessible only to anyone holding their unguessable recipient link
- NIM transactions remain public on the Nimiq blockchain
- A settling claim temporarily stores its already-signed transaction—including the chosen destination address—for safe retry, then removes the raw copy after verified confirmation
- Reporting permanently removes message text without blocking an attached gift claim
- Optional product analytics are disabled until the user explicitly opts in; accepted events are stored only as bounded daily counters
- Request size and field limits, prepared SQL, transaction verification, CSP, `no-referrer`, and no-store API responses reduce abuse and leakage risks
- No leaderboard, streak, pressure language, or financial ranking

See [SECURITY.md](SECURITY.md) for the threat model and [SUBMISSION.md](SUBMISSION.md) for competition copy and the final release checklist.

## Known operational dependency

The Worker uses public Nimiq RPC history endpoints to detect networks, verify confirmed funding/claims, read gift balances, decode signed claims before broadcast, and broadcast them. If those endpoints are temporarily unavailable, the app preserves a funded draft on the sender's device and asks the user to retry rather than paying twice. After a claim is prepared, its already-public signed transaction and hash are retained as pending so slow inclusion or an interrupted response can be confirmed or safely rebroadcast without creating a different claim.

## Licence

[MIT](LICENSE)
