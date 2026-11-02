const crypto = require('crypto');

// Standard RFC 4648 Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret string (16-32 chars)
 */
function generateBase32Secret(length = 20) {
  let secret = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

/**
 * Decode a Base32 string to Buffer
 */
function base32Decode(base32Str) {
  const clean = base32Str.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate RFC 6238 TOTP 6-digit code for a given timestamp
 */
function generateTOTP(secret, timeMs = Date.now()) {
  const key = base32Decode(secret);
  const epoch = Math.floor(timeMs / 1000);
  const timeStep = Math.floor(epoch / 30);

  // 8-byte big-endian counter
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP token allowing clock skew window of +/- 1 interval (30s)
 */
function verifyTOTP(secret, token, window = 1) {
  if (!secret || !token) return false;
  const cleanToken = token.toString().trim();
  if (cleanToken.length !== 6) return false;

  const now = Date.now();
  for (let step = -window; step <= window; step++) {
    const checkTime = now + (step * 30 * 1000);
    const expected = generateTOTP(secret, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate standard otpauth:// URL for Google Authenticator / Authy
 */
function generateOtpauthUri(username, secret, issuer = 'SMMuper') {
  const encIssuer = encodeURIComponent(issuer);
  const encUser = encodeURIComponent(username);
  return `otpauth://totp/${encIssuer}:${encUser}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateOtpauthUri
};

