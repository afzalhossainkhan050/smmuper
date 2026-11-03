/**
 * Seeds the default legal/info pages (Terms, Privacy, Refund policy).
 * Safe to run on every start: INSERT OR IGNORE never overwrites pages you have edited in the admin panel.
 */
const db = require('./database');

const defaultPages = [
  {
    name: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions of Service',
    content: `<h3>1. Introduction</h3><p>Welcome to SMMuper. By registering and placing orders on smmuper.com, you agree to comply with all applicable terms, laws, and guidelines set forth herein.</p><h3>2. Service Delivery</h3><p>SMMuper will deliver services as ordered. Delivery start times are estimates and may vary during peak server utilization. Refill guarantees apply exclusively to services explicitly labeled with Refill tags.</p><h3>3. Account Responsibility</h3><p>Customers are responsible for maintaining the confidentiality of their credentials and API keys. SMMuper enforces Two-Factor Authentication (2FA) for sensitive operations.</p>`,
    meta_title: 'Terms of Service | SMMuper',
    meta_description: 'Read the official terms and conditions for SMMuper wholesale SMM reseller services.'
  },
  {
    name: 'Privacy Policy',
    slug: 'privacy-policy',
    title: 'Privacy and Data Protection Policy',
    content: `<h3>1. Information We Collect</h3><p>SMMuper collects account credentials, order targets (public links), and transaction histories required to fulfill social media marketing orders.</p><h3>2. Security & Encryption</h3><p>All passwords are encrypted with bcrypt. We never store raw payment credentials or third-party provider keys in plain text.</p><h3>3. Data Retention</h3><p>Customer data is maintained according to standard audit and accounting ledger requirements.</p>`,
    meta_title: 'Privacy Policy | SMMuper',
    meta_description: 'Learn how SMMuper protects your privacy, transaction records, and personal account data.'
  },
  {
    name: 'Refund Policy',
    slug: 'refund-policy',
    title: 'Order Refund & Cancellation Policy',
    content: `<h3>1. Wallet Balance Refunds</h3><p>Once funds are deposited to SMMuper, they may be utilized for any wholesale service in our catalog. Remaining funds are maintained in your account indefinitely.</p><h3>2. Order Cancellations</h3><p>If an order fails or is cancelled by our network, the exact deducted amount is automatically refunded back to your wallet balance instantly.</p><h3>3. Partial Deliveries</h3><p>For orders partially fulfilled, your wallet receives an immediate partial refund proportionate to the undelivered remainder.</p>`,
    meta_title: 'Refund Policy | SMMuper',
    meta_description: 'Review the refund, cancellation, and partial delivery terms for SMMuper orders.'
  }
];

let added = 0;
const insert = db.prepare(`
  INSERT OR IGNORE INTO pages (name, slug, title, content, meta_title, meta_description)
  VALUES (?, ?, ?, ?, ?, ?)
`);
for (const p of defaultPages) {
  const r = insert.run(p.name, p.slug, p.title, p.content, p.meta_title, p.meta_description);
  if (r.changes) added++;
}
console.log(added ? `Seeded ${added} default website page(s).` : 'Default website pages already present.');
