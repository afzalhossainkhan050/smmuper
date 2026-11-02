const db = require('./database');
const { generateReferralCode } = require('../utils/helpers');

try {
  const users = db.prepare('SELECT id, username FROM users WHERE referral_code IS NULL').all();
  for (const user of users) {
    const code = generateReferralCode(user.username);
    db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
  }
  console.log(`Backfilled referral codes for ${users.length} users.`);
} catch (e) {
  console.error('Failed to backfill referral codes:', e.message);
}
