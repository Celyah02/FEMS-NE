/** Fire extinguisher CRUD. */
const { query, ApiError, asyncHandler, validateBody, validateQuery } = require('@fems/shared');

const TYPES = ['water', 'co2', 'foam', 'dry_chemical'];
const SIZES = ['2.5lb', '5lb', '9lb', '12lb'];
const STATUSES = ['active', 'maintenance', 'expired', 'decommissioned'];

const toDto = (r) => ({
  id: r.id,
  serialNumber: r.serial_number,
  location: r.location,
  type: r.type,
  size: r.size,
  installationDate: r.installation_date,
  expiryDate: r.expiry_date,
  status: r.status,
  lastInspectedAt: r.last_inspected_at,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// POST /extinguishers
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    serialNumber: { required: true, type: 'serial', maxLen: 64 },
    location: { required: true, type: 'text', minLen: 2, maxLen: 255 },
    type: { required: true, enum: TYPES },
    size: { required: true, enum: SIZES },
    installationDate: { required: true, type: 'date' },
    expiryDate: { required: true, type: 'date' },
    status: { enum: STATUSES },
  });
  if (new Date(data.expiryDate) < new Date(data.installationDate)) {
    throw ApiError.badRequest('expiryDate must be on or after installationDate');
  }
  const { rows } = await query(
    `INSERT INTO fire_extinguishers
       (serial_number, location, type, size, installation_date, expiry_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'active'),$8) RETURNING *`,
    [data.serialNumber, data.location, data.type, data.size,
     data.installationDate, data.expiryDate, data.status || null, req.user.id]
  );
  res.status(201).json({ extinguisher: toDto(rows[0]) });
});

// GET /extinguishers   ?status= &type= &q= &expiringInDays=
const list = asyncHandler(async (req, res) => {
  const qd = validateQuery(req.query, {
    status: { enum: STATUSES },
    type: { enum: TYPES },
    q: { maxLen: 80, type: 'text' },
    expiringInDays: { type: 'int', custom: (n) => n >= 0 && n <= 3650, message: 'must be between 0 and 3650' },
  });
  const { status, type, q, expiringInDays } = qd;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (type) { params.push(type); where.push(`type = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(serial_number ILIKE $${params.length} OR location ILIKE $${params.length})`);
  }
  if (expiringInDays) {
    params.push(expiringInDays);
    where.push(`expiry_date <= (CURRENT_DATE + ($${params.length} || ' days')::interval) AND expiry_date >= CURRENT_DATE`);
  }
  const sql = `SELECT * FROM fire_extinguishers
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ count: rows.length, extinguishers: rows.map(toDto) });
});

// GET /extinguishers/:id
const getById = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!rows.length) throw ApiError.notFound('Extinguisher not found');
  res.json({ extinguisher: toDto(rows[0]) });
});

// PATCH /extinguishers/:id
const update = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    serialNumber: { type: 'serial', maxLen: 64 },
    location: { type: 'text', minLen: 2, maxLen: 255 },
    type: { enum: TYPES },
    size: { enum: SIZES },
    installationDate: { type: 'date' },
    expiryDate: { type: 'date' },
    status: { enum: STATUSES },
  });
  if (!Object.keys(data).length) throw ApiError.badRequest('No fields to update');

  // Friendly date ordering validation (DB has a CHECK too, but this gives a clearer error).
  if (data.installationDate && data.expiryDate) {
    if (new Date(data.expiryDate) < new Date(data.installationDate)) {
      throw ApiError.badRequest('expiryDate must be on or after installationDate');
    }
  }

  const { rows } = await query(
    `UPDATE fire_extinguishers SET
        serial_number     = COALESCE($1, serial_number),
        location          = COALESCE($2, location),
        type              = COALESCE($3, type),
        size              = COALESCE($4, size),
        installation_date = COALESCE($5, installation_date),
        expiry_date       = COALESCE($6, expiry_date),
        status            = COALESCE($7, status)
     WHERE id = $8 RETURNING *`,
    [data.serialNumber ?? null, data.location ?? null, data.type ?? null, data.size ?? null,
     data.installationDate ?? null, data.expiryDate ?? null, data.status ?? null, req.params.id]
  );
  if (!rows.length) throw ApiError.notFound('Extinguisher not found');
  res.json({ extinguisher: toDto(rows[0]) });
});

// DELETE /extinguishers/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!rowCount) throw ApiError.notFound('Extinguisher not found');
  res.status(204).send();
});

module.exports = { create, list, getById, update, remove };
