/**
 * Google Sign-In helpers (Google Identity Services ID-token flow).
 * The ID token is verified server-side by Google's tokeninfo endpoint, then
 * audience, issuer, expiry and email verification are checked here.
 * No client secret is needed for this flow, only the public Client ID.
 */
const db = require('../db/database');

const SETTING_DEFAULTS = {
  google_login_enabled: '0',
  google_client_id: '',
  google_allow_signup: '1',
  google_allow_staff: '0'
};

function getGoogleSettings() {
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE group_name = 'google_auth'").all();
  const s = { ...SETTING_DEFAULTS };
  for (const r of rows) s[r.key] = r.value;
  return {
    enabled: s.google_login_enabled === '1' && !!s.google_client_id,
    login_enabled_flag: s.google_login_enabled === '1',
    client_id: s.google_client_id || '',
    allow_signup: s.google_allow_signup === '1',
    allow_staff: s.google_allow_staff === '1'
  };
}

const CLIENT_ID_PATTERN = /^[0-9A-Za-z._-]+\.apps\.googleusercontent\.com$/;

async function verifyGoogleIdToken(idToken, expectedClientId) {
  if (typeof idToken !== 'string' || idToken.length > 4096 || idToken.split('.').length !== 3) {
    throw new Error('Malformed token');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let payload;
  try {
    const resp = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { signal: controller.signal }
    );
    if (!resp.ok) throw new Error('Token rejected by Google');
    payload = await resp.json();
  } finally {
    clearTimeout(timer);
  }

  if (!payload || payload.aud !== expectedClientId) throw new Error('Token audience mismatch');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('Bad issuer');
  if (!(Number(payload.exp) * 1000 > Date.now())) throw new Error('Token expired');
  if (String(payload.email_verified) !== 'true') throw new Error('Email not verified');
  if (!payload.sub || !payload.email) throw new Error('Missing identity fields');

  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: payload.name || '',
    picture: payload.picture || null
  };
}

/** Mirror express-validator's normalizeEmail() so Gmail users match accounts made via /register. */
function normalizeGmail(email) {
  const [local, domain] = email.toLowerCase().split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.split('+')[0].replace(/\./g, '') + '@gmail.com';
  }
  return email.toLowerCase();
}

module.exports = { getGoogleSettings, verifyGoogleIdToken, normalizeGmail, CLIENT_ID_PATTERN };
