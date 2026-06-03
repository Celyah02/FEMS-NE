/** Maintenance logging. */
const { query, ApiError, asyncHandler, validateBody, validateQuery } = require('@fems/shared');

const toDto = (r) => ({
  id: r.id,
  extinguisherId: r.extinguisher_id,
  serialNumber: r.serial_number,
  inspectionId: r.inspection_id,
  actionTaken: r.action_taken,
  maintenanceDate: r.maintenance_date,
  issuesIdentified: r.issues_identified,
  notes: r.notes,
  recommendations: r.recommendations,
  performedBy: r.performed_by,
  createdAt: r.created_at,
});

const SELECT = `
  SELECT m.*, e.serial_number
  FROM maintenance_logs m
  JOIN fire_extinguishers e ON e.id = m.extinguisher_id`;

// POST /maintenance
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    extinguisherId: { required: true, type: 'uuid' },
    inspectionId: { type: 'uuid' },
    actionTaken: { required: true, type: 'text', minLen: 2, maxLen: 255 },
    maintenanceDate: { required: true, type: 'date' },
    issuesIdentified: { type: 'text', maxLen: 2000 },
    notes: { type: 'text', maxLen: 2000 },
    recommendations: { type: 'text', maxLen: 2000 },
  });

  // Good practice: maintenance date should not be in the future.
  if (new Date(data.maintenanceDate) > new Date(new Date().toISOString().slice(0, 10))) {
    throw ApiError.badRequest('maintenanceDate cannot be in the future');
  }

  const ext = await query('SELECT id FROM fire_extinguishers WHERE id = $1', [data.extinguisherId]);
  if (!ext.rowCount) throw ApiError.badRequest('Extinguisher does not exist');

  const { rows } = await query(
    `INSERT INTO maintenance_logs
       (extinguisher_id, inspection_id, action_taken, maintenance_date,
        issues_identified, notes, recommendations, performed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.extinguisherId, data.inspectionId || null, data.actionTaken, data.maintenanceDate,
     data.issuesIdentified || null, data.notes || null, data.recommendations || null, req.user.id]
  );

  // Record that the unit was serviced today.
  await query('UPDATE fire_extinguishers SET last_inspected_at = now() WHERE id = $1', [data.extinguisherId]);

  const out = await query(`${SELECT} WHERE m.id = $1`, [rows[0].id]);
  res.status(201).json({ maintenance: toDto(out.rows[0]) });
});

// GET /maintenance  ?extinguisherId= &from= &to=
const list = asyncHandler(async (req, res) => {
  const qd = validateQuery(req.query, {
    extinguisherId: { type: 'uuid' },
    from: { type: 'date' },
    to: { type: 'date' },
  });
  const { extinguisherId, from, to } = qd;
  const where = [];
  const params = [];
  if (extinguisherId) { params.push(extinguisherId); where.push(`m.extinguisher_id = $${params.length}`); }
  if (from) { params.push(from); where.push(`m.maintenance_date >= $${params.length}`); }
  if (to) { params.push(to); where.push(`m.maintenance_date <= $${params.length}`); }
  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY m.maintenance_date DESC`;
  const { rows } = await query(sql, params);
  res.json({ count: rows.length, maintenance: rows.map(toDto) });
});

// GET /maintenance/:id
const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE m.id = $1`, [req.params.id]);
  if (!rows.length) throw ApiError.notFound('Maintenance record not found');
  res.json({ maintenance: toDto(rows[0]) });
});

module.exports = { create, list, getById };
