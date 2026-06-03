/**
 * Audit logging for FEMS microservices.
 * 
 * Records admin actions for compliance, debugging, and security monitoring:
 * - User creation, updates, and deletion
 * - Permission changes
 * - Sensitive data access
 * 
 * In production, this should be:
 * - Persisted to a secure audit log table
 * - Potentially sent to a SIEM system (e.g., Splunk, ELK Stack)
 * - Protected from tampering
 */

/**
 * Create an audit log entry (currently logs to console; extend to DB in production).
 * 
 * @param {string} action - What happened (e.g., "USER_CREATED", "USER_DELETED")
 * @param {string} adminId - UUID of the admin performing the action
 * @param {string} adminEmail - Email of the admin (for readability)
 * @param {string} targetId - UUID of the resource affected (user id, extinguisher id, etc.)
 * @param {string} targetType - Type of resource ("user", "extinguisher", etc.)
 * @param {object} details - Additional context (previous values, new values, reason, etc.)
 */
function audit(action, adminId, adminEmail, targetId, targetType, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    adminId,
    adminEmail,
    targetId,
    targetType,
    details,
  };

  // TODO: In production, persist this to:
  // - A secure audit_logs table
  // - A SIEM system (for real-time alerts on suspicious patterns)
  // - Cloud logging service (AWS CloudTrail, Azure Monitor, etc.)

  console.log('[AUDIT]', JSON.stringify(logEntry));
  return logEntry;
}

/**
 * Middleware to attach audit function to request for easy access in controllers.
 * Usage: req.audit('USER_CREATED', req.user.id, req.user.email, newUserId, 'user', { ...details })
 */
function auditMiddleware(req, _res, next) {
  req.audit = audit;
  next();
}

module.exports = {
  audit,
  auditMiddleware,
};
