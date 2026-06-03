/**
 * Access + refresh token issuance and revocation.
 *
 * - Access token: short-lived JWT (stateless, validated by every service).
 * - Refresh token: long-lived opaque-ish JWT whose hash is stored in the
 *   refresh_tokens table so it can be revoked on logout.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('@fems/shared');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_access_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 7);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

async function issueRefreshToken(user) {
  const token = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, sha256(token), expiresAt]
  );
  return token;
}

/** Verify a refresh token JWT *and* confirm it is still active in the DB. */
async function verifyRefreshToken(token) {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET); // throws if invalid/expired
  const { rows } = await query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = FALSE AND expires_at > now()`,
    [sha256(token)]
  );
  if (!rows.length) throw new Error('refresh token revoked');
  return payload.sub;
}

async function revokeRefreshToken(token) {
  await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [sha256(token)]);
}

async function revokeAllForUser(userId) {
  await query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [userId]);
}

module.exports = {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  sha256,
};
