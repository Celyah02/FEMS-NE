/**
 * Notifications. Other services write rows into the `notifications` table; this
 * service is the read/manage surface for a user's notifications. Admins may
 * also broadcast a notification to a user (or to everyone).
 */
const { query, ApiError, asyncHandler, validateBody } = require('@fems/shared');

const toDto = (r) => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  title: r.title,
  message: r.message,
  relatedEntity: r.related_entity,
  relatedId: r.related_id,
  isRead: r.is_read,
  createdAt: r.created_at,
});

// GET /notifications  — current user's notifications (+ broadcasts)
const list = asyncHandler(async (req, res) => {
  const onlyUnread = req.query.unread === 'true';
  const { rows } = await query(
    `SELECT * FROM notifications
     WHERE (user_id = $1 OR user_id IS NULL) ${onlyUnread ? 'AND is_read = FALSE' : ''}
     ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  const unread = rows.filter((r) => !r.is_read).length;
  res.json({ count: rows.length, unread, notifications: rows.map(toDto) });
});

// PATCH /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) throw ApiError.notFound('Notification not found');
  res.json({ notification: toDto(rows[0]) });
});

// POST /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ message: 'All notifications marked as read' });
});

// POST /notifications  (admin) — create/broadcast
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    userId: { type: 'uuid' },         // omit for broadcast
    type: { enum: ['info', 'inspection', 'compliance', 'maintenance'] },
    title: { required: true, type: 'text', minLen: 2, maxLen: 160 },
    message: { required: true, type: 'text', minLen: 2, maxLen: 2000 },
  });
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ($1, COALESCE($2,'info'), $3, $4) RETURNING *`,
    [data.userId || null, data.type || null, data.title, data.message]
  );
  res.status(201).json({ notification: toDto(rows[0]) });
});

// DELETE /notifications/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM notifications WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw ApiError.notFound('Notification not found');
  res.status(204).send();
});

module.exports = { list, markRead, markAllRead, create, remove };
