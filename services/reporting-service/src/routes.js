const { Router } = require('express');
const { authenticate } = require('@fems/shared');
const c = require('./controller');

const router = Router();

// ============================================================================
// On-Demand Reports (generated fresh each request)
// ============================================================================

// All reports require authentication (any role may view).
router.get('/reports/summary', authenticate, c.getSummary);
router.get('/reports/inventory', authenticate, c.getInventory);
router.get('/reports/inspections', authenticate, c.getInspections);
router.get('/reports/compliance', authenticate, c.getCompliance);
router.get('/reports/maintenance', authenticate, c.getMaintenance);

// Export: /reports/{inventory|inspections|compliance|maintenance}/export?format=pdf|csv
// Generates report and stores it for later retrieval
router.get('/reports/:type/export', authenticate, c.exportReport);

// ============================================================================
// Stored Reports (retrieved from database)
// ============================================================================
// List, view, and delete previously generated reports for audit trail.

// GET /reports/stored — list all stored reports for the authenticated user
router.get('/reports/stored', authenticate, c.listStoredReports);

// GET /reports/stored/:id — retrieve a specific stored report by ID
router.get('/reports/stored/:id', authenticate, c.getStoredReport);

// DELETE /reports/stored/:id — delete a stored report
router.delete('/reports/stored/:id', authenticate, c.deleteStoredReport);

module.exports = router;
