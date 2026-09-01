<template>
  <main class="screen about-screen">
    <header class="about-hero">
      <p class="eyebrow">The quiet details matter</p>
      <h1>Kindness without surveillance.</h1>
      <p class="lead">Pay It Sideways is designed to help one private message inspire another—not to build a public profile of anybody.</p>
    </header>

    <section class="about-section" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <p><strong>Pay It Sideways</strong> lets you send someone a genuine note of appreciation, optionally with claimable NIM in the same private link. You never need to ask for their wallet address.</p>
      <p class="about-callout">There is never an obligation to continue a chain or attach money. Message-only participation is complete participation.</p>
    </section>

    <section class="about-section" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy</h2>
      <h3>What is stored</h3>
      <ul>
        <li>The appreciation reason and positive message you submit.</li>
        <li>An unguessable recipient-link hash, chain relationship, and creation time.</li>
        <li>For NIM gifts: the amount, network, temporary public gift address, and public funding/claim transaction results.</li>
        <li>The one-use private gift key stays in the fragment of the shared link. A recovery copy remains in browser storage on the sender’s device. Browser URL fragments and that recovery copy are never sent to our database.</li>
        <li>Whether the recipient chose “keep” or reported the message.</li>
      </ul>
      <h3>Why it is stored</h3>
      <p>Only to deliver the private recipient experience, let a recipient continue the correct chain, prevent duplicate payment records, and calculate anonymous chain totals.</p>
      <h3>What is public</h3>
      <p>NIM transactions are recorded on the public Nimiq blockchain. The app does not publicly display wallet addresses. Chain views show counts and summed NIM amounts only; they never expose message text or individual rankings.</p>
      <h3>Who can read a message</h3>
      <p>Anyone who has its long, unguessable recipient link. Treat that link like a private letter and share it only with the intended recipient.</p>
      <p>If NIM is attached, anyone with the complete link can also claim that gift. Do not post or forward it publicly.</p>
      <h3>Removal</h3>
      <p>The recipient link includes a report control. Reporting immediately erases the stored reason and message. If NIM is still attached, the redacted link remains usable only to claim or pass that gift so reporting cannot strand money.</p>
      <h3>Analytics</h3>
      <p>We do not place message text, recipient references, wallet addresses, or transaction identifiers in analytics. No advertising trackers are loaded.</p>
    </section>

    <section class="about-section" aria-labelledby="terms-title">
      <h2 id="terms-title">Terms</h2>
      <ul>
        <li>Use the app only for lawful, respectful messages to people you know.</li>
        <li>Do not use it for harassment, threats, impersonation, spam, or unwanted financial solicitation.</li>
        <li>Funding and claiming NIM gifts creates final public blockchain transactions. Check the amount carefully before confirming.</li>
        <li>An attached gift is held by a temporary, one-use Nimiq account controlled by the complete private link—not by Pay It Sideways.</li>
        <li>Anyone with the complete recipient link can control an unclaimed gift. Pay It Sideways cannot recover a lost, leaked, or incorrectly shared link.</li>
        <li>A recipient may report a message, which removes it from the recipient link.</li>
      </ul>
      <p>This is a positive social utility, not therapy, financial advice, or an emergency service.</p>
    </section>

    <RouterLink class="button button--secondary button--wide" to="/">Return home</RouterLink>
  </main>
</template>
