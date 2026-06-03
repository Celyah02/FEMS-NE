/** Authentication: register, login, refresh, logout, password recovery. */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query, ApiError, asyncHandler, validateBody } = require('@fems/shared');
const tokens = require('./tokenService');

const publicUser = (u) => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  role: u.role,
  isActive: u.is_active,
  createdAt: u.created_at,
});

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    firstName: { required: true, type: 'name', maxLen: 80 },
    lastName: { required: true, type: 'name', maxLen: 80 },
    email: { required: true, type: 'email', maxLen: 255, lowercase: true },
    password: { required: true, type: 'password' },
    // Self-registration is always a plain "user". Admins assign elevated roles.
  });

  const exists = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [data.email]);
  if (exists.rowCount) throw ApiError.conflict('A user with that email already exists');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1,$2,$3,$4,'user') RETURNING *`,
    [data.firstName, data.lastName, data.email, passwordHash]
  );
  res.status(201).json({ user: publicUser(rows[0]) });
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    email: { required: true, type: 'email', maxLen: 255, lowercase: true },
    password: { required: true, maxLen: 200 },
  });

  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [data.email]);
  const user = rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(data.password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const accessToken = tokens.signAccessToken(user);
  const refreshToken = await tokens.issueRefreshToken(user);
  res.json({ accessToken, refreshToken, user: publicUser(user) });
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  let userId;
  try {
    userId = await tokens.verifyRefreshToken(refreshToken);
  } catch (_) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Account unavailable');

  res.json({ accessToken: tokens.signAccessToken(user) });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await tokens.revokeRefreshToken(refreshToken);
  res.json({ message: 'Logged out' });
});

// POST /auth/forgot-password
// No email service is wired up for the demo, so the reset token is returned in
// the response. In production this would be emailed and never exposed via API.
const forgotPassword = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, { email: { required: true, type: 'email', maxLen: 255, lowercase: true } });
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [data.email]);

  const generic = { message: 'If that account exists, a reset token has been issued.' };
  if (!rows.length) return res.json(generic); // do not leak which emails exist

  const rawToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [rows[0].id, tokens.sha256(rawToken), expiresAt]
  );
  res.json({ ...generic, resetToken: rawToken }); // demo-only field
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    token: { required: true, minLen: 48, maxLen: 48, pattern: /^[a-f0-9]{48}$/i, message: 'must be a valid reset token' },
    newPassword: { required: true, type: 'password' },
  });

  const { rows } = await query(
    `SELECT * FROM password_resets
     WHERE token_hash = $1 AND used = FALSE AND expires_at > now()`,
    [tokens.sha256(data.token)]
  );
  const reset = rows[0];
  if (!reset) throw ApiError.badRequest('Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id]);
  await query('UPDATE password_resets SET used = TRUE WHERE id = $1', [reset.id]);
  await tokens.revokeAllForUser(reset.user_id); // force re-login everywhere

  res.json({ message: 'Password has been reset. Please log in.' });
});

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, publicUser };
