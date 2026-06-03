/**
 * User profile + admin user management.
 *
 * Handles:
 * - User self-service: profile updates, password changes
 * - Admin user management: create, read, update, delete users with different roles
 * - Audit logging for all admin actions (create, update, delete) for compliance
 */
const bcrypt = require('bcryptjs');
const { query, ApiError, asyncHandler, validateBody } = require('@fems/shared');
const { publicUser } = require('./authController');

const ROLES = ['admin', 'inspector', 'user'];

// GET /users/me
const getMe = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows.length) throw ApiError.notFound('User not found');
  res.json({ user: publicUser(rows[0]) });
});

// PATCH /users/me  (update own profile: first/last name, email)
const updateMe = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    firstName: { type: 'name', maxLen: 80 },
    lastName: { type: 'name', maxLen: 80 },
    email: { type: 'email', maxLen: 255, lowercase: true },
  });
  if (!Object.keys(data).length) throw ApiError.badRequest('No fields to update');

  if (data.email) {
    const taken = await query(
      'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2',
      [data.email, req.user.id]
    );
    if (taken.rowCount) throw ApiError.conflict('Email already in use');
  }

  const { rows } = await query(
    `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        email      = COALESCE($3, email)
     WHERE id = $4 RETURNING *`,
    [data.firstName || null, data.lastName || null, data.email || null, req.user.id]
  );
  res.json({ user: publicUser(rows[0]) });
});

// POST /users/me/change-password
const changePassword = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    currentPassword: { required: true, maxLen: 200 },
    newPassword: { required: true, type: 'password' },
  });
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  const ok = await bcrypt.compare(data.currentPassword, user.password_hash);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  res.json({ message: 'Password updated' });
});

// ---- Admin-only user management ------------------------------------------

// GET /users
const listUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const where = [];
  const params = [];
  if (role) { params.push(role); where.push(`role = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const sql = `SELECT * FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ users: rows.map(publicUser) });
});

// GET /users/:id
const getUser = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!rows.length) throw ApiError.notFound('User not found');
  res.json({ user: publicUser(rows[0]) });
});

// POST /users  (admin creates a user with a role)
const createUser = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    firstName: { required: true, type: 'name', maxLen: 80 },
    lastName: { required: true, type: 'name', maxLen: 80 },
    email: { required: true, type: 'email', maxLen: 255, lowercase: true },
    password: { required: true, type: 'password' },
    role: { required: true, enum: ROLES },
  });
  const exists = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [data.email]);
  if (exists.rowCount) throw ApiError.conflict('A user with that email already exists');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.firstName, data.lastName, data.email, passwordHash, data.role]
  );
  const newUser = rows[0];

  // Audit log: admin created a new user with a role
  req.audit('USER_CREATED', req.user.id, req.user.email, newUser.id, 'user', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role,
  });

  res.status(201).json({ user: publicUser(newUser) });
});

// PATCH /users/:id  (admin updates role / active status / names)
const updateUser = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    firstName: { type: 'name', maxLen: 80 },
    lastName: { type: 'name', maxLen: 80 },
    role: { enum: ROLES },
    isActive: { type: 'boolean' },
  });

  // Fetch old user state for audit comparison
  const { rows: oldRows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!oldRows.length) throw ApiError.notFound('User not found');
  const oldUser = oldRows[0];

  const { rows } = await query(
    `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        role       = COALESCE($3, role),
        is_active  = COALESCE($4, is_active)
     WHERE id = $5 RETURNING *`,
    [data.firstName ?? null, data.lastName ?? null, data.role ?? null,
     typeof data.isActive === 'boolean' ? data.isActive : null, req.params.id]
  );
  const newUser = rows[0];

  // Audit log: admin updated user with changes tracked
  req.audit('USER_UPDATED', req.user.id, req.user.email, req.params.id, 'user', {
    changes: {
      firstName: data.firstName ? { from: oldUser.first_name, to: data.firstName } : undefined,
      lastName: data.lastName ? { from: oldUser.last_name, to: data.lastName } : undefined,
      role: data.role ? { from: oldUser.role, to: data.role } : undefined,
      isActive: typeof data.isActive === 'boolean' ? { from: oldUser.is_active, to: data.isActive } : undefined,
    },
  });

  res.json({ user: publicUser(newUser) });
});

// DELETE /users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');

  // Fetch user to be deleted for audit logging
  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!userRows.length) throw ApiError.notFound('User not found');
  const deletedUser = userRows[0];

  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (!rowCount) throw ApiError.notFound('User not found');

  // Audit log: admin deleted a user
  req.audit('USER_DELETED', req.user.id, req.user.email, req.params.id, 'user', {
    firstName: deletedUser.first_name,
    lastName: deletedUser.last_name,
    email: deletedUser.email,
    role: deletedUser.role,
  });

  res.status(204).send();
});

module.exports = {
  getMe, updateMe, changePassword,
  listUsers, getUser, createUser, updateUser, deleteUser,
};
