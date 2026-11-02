const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

// All customer referral endpoints require authentication
router.use(authenticate);

// ──────────────── GET /api/referrals ────────────────
// Customer's referral dashboard, link, commission stats, and referred users
router.get('/', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, referral_code, balance FROM users WHERE id = ?').get(req.user.id);
    if (!user) return errorResponse(res, 'User not found', 404);

    // Get system settings
    const rateRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_commission_rate'").get();
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'referral_system_enabled'").get();
    const commissionRate = rateRow ? parseFloat(rateRow.value) : 5.0;
    const isEnabled = enabledRow ? enabledRow.value === '1' : true;

    const referralCode = user.referral_code || user.username;
    const referralUrl = `https://smmuper.com/register?ref=${referralCode}`;

    // Statistics
    const referredCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE referred_by = ?').get(user.id).count;

    const earningsRow = db.prepare(`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COUNT(*) as total_commissions_count
      FROM referral_commissions
      WHERE referrer_id = ? AND status = 'credited'
    `).get(user.id);

    // Referred users catalog
    const referredUsers = db.prepare(`
      SELECT 
        u.id, u.username, u.created_at, u.status,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orders_count,
        COALESCE((SELECT SUM(rc.commission_amount) FROM referral_commissions rc WHERE rc.referrer_id = ? AND rc.referred_user_id = u.id), 0) as earned_from_user
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
      LIMIT 50
    `).all(user.id, user.id);

    // Recent commission logs
    const recentCommissions = db.prepare(`
      SELECT 
        rc.*,
        u.username as referred_username
      FROM referral_commissions rc
      JOIN users u ON rc.referred_user_id = u.id
      WHERE rc.referrer_id = ?
      ORDER BY rc.created_at DESC
      LIMIT 20
    `).all(user.id);

    return successResponse(res, {
      referral_code: referralCode,
      referral_url: referralUrl,
      commission_rate: commissionRate,
      is_enabled: isEnabled,
      stats: {
        referred_count: referredCount,
        total_earned: Math.round(earningsRow.total_earned * 100) / 100,
        commissions_count: earningsRow.total_commissions_count
      },
      referred_users: referredUsers,
      recent_commissions: recentCommissions
    }, 'Referral program details retrieved successfully');

  } catch (error) {
    console.error('Customer get referrals error:', error);
    return errorResponse(res, 'Failed to retrieve referral details', 500);
  }
});

module.exports = router;

