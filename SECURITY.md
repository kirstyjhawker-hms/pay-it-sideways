# Security and privacy model

## Assets and trust boundaries

- Message text is private application data stored in D1.
- A 256-bit recipient token authorizes reading and acting on one message. D1 stores only its SHA-256 hash.
- A separate 256-bit sender trail token authorizes aggregate chain totals only. D1 stores only its SHA-256 hash; it cannot retrieve message text, recipient links, claim data, or wallet addresses.
- A separate 256-bit Nimiq private key controls an optional one-use gift. It is carried in the URL fragment and retained locally by the sender for recovery; it is never sent to or stored by the API.
- Funding and claim transactions are public blockchain data.
- A signed pending claim contains its chosen destination address. D1 retains that public transaction temporarily for idempotent rebroadcast, then deletes the raw copy after verified confirmation or replaces it only after definite expiry and on-chain absence.
- The founder campaign stores separately funded bearer gift links only as ciphertext. Its private campaign token derives the browser-side encryption key and is stored server-side only as a one-way hash, so the Worker cannot decrypt or spend campaign gifts.

## Important properties

- The server verifies the confirmed funding transaction's hash, recipient, and exact Luna value before creating a claimable gift record.
- The server broadcasts a locally signed claim but records it as claimed only after an included transaction is fetched and its hash, sender, value, and execution result match the stored gift.
- A pass signs the same constrained transaction to the next one-use gift account instead of a personal wallet. The next note is not saved until that relay is independently confirmed on-chain.
- A client-generated recipient token makes creation idempotent. If a save response is interrupted after D1 commits, retrying returns the same link.
- A funded draft is persisted locally before wallet confirmation and restored after reload. Once funded, the UI will not silently switch it to words-only.
- The recent-links index contains only local recovery metadata, including the separate trail token and public funding receipt when present—not message text or wallet addresses. If both local and session storage reject a gift key, navigation stops with a retryable error rather than exposing an incomplete funded link.
- Reporting erases the words but leaves an unclaimed gift reachable, preventing report abuse from stranding funds.
- A sender who still has the locally stored complete link can reclaim an unclaimed gift through the normal recipient claim flow. This is recovery, not a revocation guarantee: whoever claims the bearer gift first controls it.
- Write-heavy API routes are throttled with short-lived HMAC identifiers derived from Cloudflare's connecting address. Raw network addresses are not stored.
- With explicit in-app consent, unique-device evidence stores only a second one-way hash of Nimiq Pay's origin-scoped device identifier.
- Founder-campaign allocation uses a separate keyed hash of that origin-scoped device identifier to return the same allocation on retry and prevent ordinary duplicate claims. This is required for that limited campaign, not analytics consent, and is never used for advertising.
- Messages are stored server-side so the private bearer link can retrieve them. They are not end-to-end encrypted; link secrecy is the access boundary.

## Red-team cases covered

- Guessed recipient tokens: 256 bits of entropy and hash-only storage
- Guessed sender trail tokens: independent 256-bit entropy, hash-only storage, and an aggregate-only response contract
- Gift secret leaking to the API/referrer: URL fragment plus `no-referrer`
- XSS from message content: Vue text interpolation; no raw HTML rendering
- SQL injection: bound D1 statements only
- Oversized payloads: 16 KiB JSON limit plus strict field limits
- Analytics storage spam: a fixed allowlist aggregated into bounded daily counters
- Analytics consent: client events are disabled by default and enabled only by a locally stored explicit opt-in
- Duplicate saves/payments: client idempotency plus unique transaction hashes
- Interrupted/slow claims: the public signed transaction and hash are retained as pending, rebound on retry, and never treated as claimed before independent inclusion verification
- Forged funding records: on-chain output verification
- Forged or unrelated claims: post-inclusion sender/value/hash verification
- Raw-transaction relay abuse: RPC decoding must match the stored gift sender, exact value, basic types, zero fee/data/flags, and network before broadcast
- Fabricated legacy payments: new payment records must use the verified claimable mode; legacy direct records remain read-only compatible
- Double claim: blockchain balance rules plus one recorded confirmed claim
- Wrong network: transaction lookup across Testnet and Mainnet, then fixed per gift
- Multiple wallet accounts: recipient chooses the destination explicitly
- Lost/stripped fragment: sender warning, durable local recovery, and copy fallback
- Disabled/quota-exhausted storage: fail closed before leaving the funded creation flow
- CSP breakage of the wallet path: self-hosted scripts plus the narrow `wasm-unsafe-eval` capability required by official Nimiq WebAssembly; no general `unsafe-eval`
- Report griefing: message redaction does not disable financial recovery
- Campaign database disclosure: stored gift links remain encrypted under a key derived from the fragment-only 256-bit campaign token
- Campaign replay: a device receives its existing allocation rather than consuming another; allocation and uniqueness are enforced atomically in D1

## Residual risks

- Anyone who receives or copies a complete unclaimed gift link can claim it.
- A sender who deletes all browser storage before sharing a funded link can lose its recovery key; the server cannot recover it by design.
- Public RPC unavailability can delay creation, balance checks, or claims.
- A pending signed claim and destination address remain in D1 until it confirms or an expired, definitely absent transaction is safely replaced.
- Blockchain transactions are irreversible. Users must check the amount in the native Nimiq Pay confirmation.
- A determined person who possesses the private campaign invitation may attempt to spoof device identifiers or rotate network addresses. The 20-gift cap, Nimiq Pay device check, keyed deduplication, and IP throttling reduce but cannot eliminate this risk; the invitation should be shared with intended testers rather than posted as a public cash promotion.

Report vulnerabilities privately to the repository owner rather than placing a live gift link, message, private key, or wallet secret in a public issue.

## Automated evidence

`npm test` runs unit tests plus a deterministic integration suite inside Cloudflare's official Workers Vitest runtime with isolated D1 storage and mocked public RPC responses. It verifies both accepted flows and adversarial funding/claim cases without relying on a faucet or spending real funds.
