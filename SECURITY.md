# Security and privacy model

## Assets and trust boundaries

- Message text is private application data stored in D1.
- A 256-bit recipient token authorizes reading and acting on one message. D1 stores only its SHA-256 hash.
- A separate 256-bit Nimiq private key controls an optional one-use gift. It is carried in the URL fragment and retained locally by the sender for recovery; it is never sent to or stored by the API.
- Funding and claim transactions are public blockchain data.

## Important properties

- The server verifies the confirmed funding transaction's hash, recipient, and exact Luna value before creating a claimable gift record.
- The server broadcasts a locally signed claim but records it as claimed only after an included transaction is fetched and its hash, sender, value, and execution result match the stored gift.
- A client-generated recipient token makes creation idempotent. If a save response is interrupted after D1 commits, retrying returns the same link.
- A funded draft is persisted locally before wallet confirmation and restored after reload. Once funded, the UI will not silently switch it to words-only.
- Reporting erases the words but leaves an unclaimed gift reachable, preventing report abuse from stranding funds.

## Red-team cases covered

- Guessed recipient tokens: 256 bits of entropy and hash-only storage
- Gift secret leaking to the API/referrer: URL fragment plus `no-referrer`
- XSS from message content: Vue text interpolation; no raw HTML rendering
- SQL injection: bound D1 statements only
- Oversized payloads: 16 KiB JSON limit plus strict field limits
- Analytics storage spam: a fixed allowlist aggregated into bounded daily counters
- Duplicate saves/payments: client idempotency plus unique transaction hashes
- Forged funding records: on-chain output verification
- Forged or unrelated claims: post-inclusion sender/value/hash verification
- Double claim: blockchain balance rules plus one recorded confirmed claim
- Wrong network: transaction lookup across Testnet and Mainnet, then fixed per gift
- Multiple wallet accounts: recipient chooses the destination explicitly
- Lost/stripped fragment: sender warning, durable local recovery, and copy fallback
- Report griefing: message redaction does not disable financial recovery

## Residual risks

- Anyone who receives or copies a complete unclaimed gift link can claim it.
- A sender who deletes all browser storage before sharing a funded link can lose its recovery key; the server cannot recover it by design.
- Public RPC unavailability can delay creation, balance checks, or claims.
- Blockchain transactions are irreversible. Users must check the amount in the native Nimiq Pay confirmation.

Report vulnerabilities privately to the repository owner rather than placing a live gift link, message, private key, or wallet secret in a public issue.

## Automated evidence

`npm test` runs unit tests plus a deterministic integration suite inside Cloudflare's official Workers Vitest runtime with isolated D1 storage and mocked public RPC responses. It verifies both accepted flows and adversarial funding/claim cases without relying on a faucet or spending real funds.
