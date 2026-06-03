/** Inspection scheduling + completion. */
const { query, withTransaction, ApiError, asyncHandler, validateBody, validateQuery } = require('@fems/shared');

/** Promote any pending inspection whose date has passed to 'overdue'. */
async function markOverdue() {
  await query(
    `UPDATE inspections SET status = 'overdue'
     WHERE status = 'pending' AND scheduled_date < CURRENT_DATE`
  );
}

const toDto = (r) => ({
  id: r.id,
  extinguisherId: r.extinguisher_id,
  serialNumber: r.serial_number,        // joined
  location: r.location,                 // joined
  scheduledDate: r.scheduled_date,
  scheduledTime: r.scheduled_time,
  status: r.status,
  result: r.result,
  assignedTo: r.assigned_to,
  scheduledBy: r.scheduled_by,
  notes: r.notes,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

const SELECT = `
  SELECT i.*, e.serial_number, e.location
  FROM inspections i
  JOIN fire_extinguishers e ON e.id = i.extinguisher_id`;

// POST /inspections  — schedule an inspection
const schedule = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    extinguisherId: { required: true, type: 'uuid' },
    scheduledDate: { required: true, type: 'date' },
    scheduledTime: { type: 'time' },
    assignedTo: { type: 'uuid' },
    notes: { type: 'text', maxLen: 2000 },
  });

  // Good practice: don't schedule into the past.
  if (new Date(data.scheduledDate) < new Date(new Date().toISOString().slice(0, 10))) {
    throw ApiError.badRequest('scheduledDate must be today or in the future');
  }

  const ext = await query('SELECT id FROM fire_extinguishers WHERE id = $1', [data.extinguisherId]);
  if (!ext.rowCount) throw ApiError.badRequest('Extinguisher does not exist');

  const created = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO inspections
         (extinguisher_id, scheduled_date, scheduled_time, assigned_to, scheduled_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.extinguisherId, data.scheduledDate, data.scheduledTime || null,
       data.assignedTo || null, req.user.id, data.notes || null]
    );
    const inspection = rows[0];

    // Notify the assigned inspector (Notification service reads this table).
    if (data.assignedTo) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
         VALUES ($1,'inspection','Inspection assigned',$2,'inspection',$3)`,
        [data.assignedTo,
         `An inspection has been scheduled for ${data.scheduledDate}.`,
         inspection.id]
      );
    }
    return inspection;
  });

  const { rows } = await query(`${SELECT} WHERE i.id = $1`, [created.id]);
  res.status(201).json({ inspection: toDto(rows[0]) });
});

// GET /inspections  ?status= &extinguisherId= &assignedTo= &from= &to=
const list = asyncHandler(async (req, res) => {
  await markOverdue();
  const qd = validateQuery(req.query, {
    status: { enum: ['pending', 'completed', 'overdue', 'cancelled'] },
    extinguisherId: { type: 'uuid' },
    assignedTo: { type: 'uuid' },
    from: { type: 'date' },
    to: { type: 'date' },
  });
  const { status, extinguisherId, assignedTo, from, to } = qd;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`i.status = $${params.length}`); }
  if (extinguisherId) { params.push(extinguisherId); where.push(`i.extinguisher_id = $${params.length}`); }
  if (assignedTo) { params.push(assignedTo); where.push(`i.assigned_to = $${params.length}`); }
  if (from) { params.push(from); where.push(`i.scheduled_date >= $${params.length}`); }
  if (to) { params.push(to); where.push(`i.scheduled_date <= $${params.length}`); }
  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.scheduled_date DESC`;
  const { rows } = await query(sql, params);
  res.json({ count: rows.length, inspections: rows.map(toDto) });
});

// GET /inspections/:id
const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE i.id = $1`, [req.params.id]);
  if (!rows.length) throw ApiError.notFound('Inspection not found');
  res.json({ inspection: toDto(rows[0]) });
});

// PATCH /inspections/:id  — reschedule / reassign
const update = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    scheduledDate: { type: 'date' },
    scheduledTime: { type: 'time' },
    assignedTo: { type: 'uuid' },
    status: { enum: ['pending', 'completed', 'overdue', 'cancelled'] },
    notes: { type: 'text', maxLen: 2000 },
  });
  const { rows } = await query(
    `UPDATE inspections SET
        scheduled_date = COALESCE($1, scheduled_date),
        scheduled_time = COALESCE($2, scheduled_time),
        assigned_to    = COALESCE($3, assigned_to),
        status         = COALESCE($4, status),
        notes          = COALESCE($5, notes)
     WHERE id = $6 RETURNING id`,
    [data.scheduledDate ?? null, data.scheduledTime ?? null, data.assignedTo ?? null,
     data.status ?? null, data.notes ?? null, req.params.id]
  );
  if (!rows.length) throw ApiError.notFound('Inspection not found');
  const out = await query(`${SELECT} WHERE i.id = $1`, [req.params.id]);
  res.json({ inspection: toDto(out.rows[0]) });
});

// POST /inspections/:id/complete  — record the inspection result
const complete = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    result: { required: true, enum: ['pass', 'fail', 'needs_maintenance'] },
    notes: { type: 'text', maxLen: 2000 },
  });

  const result = await withTransaction(async (client) => {
    const upd = await client.query(
      `UPDATE inspections
         SET status = 'completed', result = $1, notes = COALESCE($2, notes), completed_at = now()
       WHERE id = $3 RETURNING *`,
      [data.result, data.notes || null, req.params.id]
    );
    if (!upd.rowCount) throw ApiError.notFound('Inspection not found');
    const inspection = upd.rows[0];

    // Reflect the outcome on the extinguisher.
    const newStatus = data.result === 'needs_maintenance' ? 'maintenance' : 'active';
    await client.query(
      `UPDATE fire_extinguishers SET last_inspected_at = now(), status = $1 WHERE id = $2`,
      [newStatus, inspection.extinguisher_id]
    );

    // Notify the scheduler that results are in.
    if (inspection.scheduled_by) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
         VALUES ($1,'inspection','Inspection completed',$2,'inspection',$3)`,
        [inspection.scheduled_by, `Inspection result: ${data.result}.`, inspection.id]
      );
    }
    return inspection;
  });

  const out = await query(`${SELECT} WHERE i.id = $1`, [result.id]);
  res.json({ inspection: toDto(out.rows[0]) });
});

// DELETE /inspections/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM inspections WHERE id = $1', [req.params.id]);
  if (!rowCount) throw ApiError.notFound('Inspection not found');
  res.status(204).send();
});

module.exports = { schedule, list, getById, update, complete, remove, markOverdue };
