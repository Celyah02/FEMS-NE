/**
 * Report Storage Service — persists generated reports to the database.
 *
 * Allows reports to be:
 * - Stored for later retrieval
 * - Audited for compliance
 * - Automatically expired/deleted after N days
 * - Retrieved from the /reports/stored endpoint
 */
const { query, ApiError, asyncHandler } = require('@fems/shared');

/**
 * Store a generated report in the database.
 * 
 * @param {string} userId - UUID of user who requested the report
 * @param {string} reportType - Type of report (inventory, compliance, etc.)
 * @param {string} format - Export format (pdf, csv)
 * @param {string} title - Report title
 * @param {Buffer|string} fileData - The exported file content (PDF bytes or CSV text)
 * @param {number} expiresInDays - Optional: auto-delete after N days (default: 30)
 * @returns {Promise<{id, reportType, format, title, generated_at}>}
 */
async function storeReport(userId, reportType, format, title, fileData, expiresInDays = 30) {
  const fileSizeBytes = Buffer.isBuffer(fileData) ? fileData.length : Buffer.byteLength(fileData, 'utf8');
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const { rows } = await query(
    `INSERT INTO reports (user_id, report_type, format, title, data, file_size_bytes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, report_type, format, title, generated_at`,
    [userId, reportType, format, title, fileData, fileSizeBytes, expiresAt]
  );

  return rows[0];
}

/**
 * Retrieve a stored report by ID.
 * 
 * @param {string} reportId - UUID of the report
 * @param {string} userId - UUID of user (for permission check)
 * @returns {Promise<{id, userId, reportType, format, title, data, file_size_bytes, generated_at}>}
 */
async function getReport(reportId, userId) {
  const { rows } = await query(
    `SELECT * FROM reports WHERE id = $1 AND user_id = $2`,
    [reportId, userId]
  );

  if (!rows.length) throw ApiError.notFound('Report not found');
  return rows[0];
}

/**
 * List stored reports for a user (with pagination).
 * 
 * @param {string} userId - UUID of user
 * @param {object} opts - Options: { type, limit, offset }
 * @returns {Promise<{reports, total}>}
 */
async function listReports(userId, opts = {}) {
  const { type, limit = 20, offset = 0 } = opts;

  let where = ['user_id = $1'];
  let params = [userId];

  if (type) {
    params.push(type);
    where.push(`report_type = $${params.length}`);
  }

  const countSql = `SELECT COUNT(*) as total FROM reports WHERE ${where.join(' AND ')}`;
  const { rows: countRows } = await query(countSql, params);

  const sql = `
    SELECT id, report_type, format, title, file_size_bytes, generated_at
    FROM reports
    WHERE ${where.join(' AND ')}
    ORDER BY generated_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const { rows } = await query(sql, [...params, limit, offset]);
  return {
    reports: rows,
    total: parseInt(countRows[0].total, 10),
  };
}

/**
 * Delete a stored report.
 * 
 * @param {string} reportId - UUID of the report
 * @param {string} userId - UUID of user (for permission check)
 */
async function deleteReport(reportId, userId) {
  const { rowCount } = await query(
    `DELETE FROM reports WHERE id = $1 AND user_id = $2`,
    [reportId, userId]
  );

  if (!rowCount) throw ApiError.notFound('Report not found');
}

/**
 * Delete expired reports (background maintenance job).
 * Called by the scheduled jobs service periodically.
 * 
 * @returns {Promise<number>} - Number of reports deleted
 */
async function cleanupExpiredReports() {
  const { rowCount } = await query(
    `DELETE FROM reports WHERE expires_at IS NOT NULL AND expires_at < now()`
  );

  return rowCount;
}

module.exports = {
  storeReport,
  getReport,
  listReports,
  deleteReport,
  cleanupExpiredReports,
};
