const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

router.use(authenticate);

// ──────────────── GET /api/kyc ────────────────
// Customer KYC status, latest submission, and active form configuration
router.get('/', (req, res) => {
  try {
    const activeSetting = db.prepare(`
      SELECT * FROM kyc_settings
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 1
    `).get();

    let parsedFields = [];
    if (activeSetting && activeSetting.fields) {
      try {
        parsedFields = JSON.parse(activeSetting.fields);
      } catch (e) {
        parsedFields = [];
      }
    }

    const latestSubmission = db.prepare(`
      SELECT ks.*, u.username, u.email
      FROM kyc_submissions ks
      JOIN users u ON ks.user_id = u.id
      WHERE ks.user_id = ?
      ORDER BY ks.id DESC
      LIMIT 1
    `).get(req.user.id);

    let parsedFormData = {};
    if (latestSubmission && latestSubmission.form_data) {
      try {
        parsedFormData = JSON.parse(latestSubmission.form_data);
      } catch (e) {
        parsedFormData = {};
      }
    }

    const currentStatus = latestSubmission ? latestSubmission.status : 'unsubmitted';

    return successResponse(res, {
      status: currentStatus,
      is_verified: currentStatus === 'approved',
      submission: latestSubmission ? {
        ...latestSubmission,
        form_data: parsedFormData
      } : null,
      setting: activeSetting ? {
        ...activeSetting,
        fields: parsedFields
      } : null
    }, 'KYC status and requirements retrieved');

  } catch (error) {
    console.error('Customer get KYC error:', error);
    return errorResponse(res, 'Failed to retrieve KYC details.', 500);
  }
});

// ──────────────── POST /api/kyc/submit ────────────────
// Submit verification documents
router.post('/submit', [
  body('form_data').notEmpty().withMessage('KYC form data is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 422, errors.array());
    }

    const activeSetting = db.prepare("SELECT * FROM kyc_settings WHERE status = 'active' LIMIT 1").get();
    if (!activeSetting) {
      return errorResponse(res, 'KYC verification is not currently active on this platform.', 400);
    }

    // Check if already approved
    const approvedRow = db.prepare("SELECT id FROM kyc_submissions WHERE user_id = ? AND status = 'approved'").get(req.user.id);
    if (approvedRow) {
      return errorResponse(res, 'Your identity is already verified. No resubmission required.', 400);
    }

    // Check if there is an existing pending submission
    const pendingRow = db.prepare("SELECT id FROM kyc_submissions WHERE user_id = ? AND status = 'pending'").get(req.user.id);
    if (pendingRow) {
      return errorResponse(res, 'You already have a pending verification request under review.', 400);
    }

    const { form_data } = req.body;
    const jsonString = typeof form_data === 'string' ? form_data : JSON.stringify(form_data);

    const result = db.prepare(`
      INSERT INTO kyc_submissions (
        user_id, kyc_setting_id, form_data, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(req.user.id, activeSetting.id, jsonString);

    const createdSubmission = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(result.lastInsertRowid);

    return successResponse(res, {
      submission: createdSubmission,
      status: 'pending'
    }, 'KYC verification submitted successfully! Our compliance team will review your documents shortly.', 201);

  } catch (error) {
    console.error('Submit KYC error:', error);
    return errorResponse(res, 'Failed to submit KYC documents.', 500);
  }
});

module.exports = router;

