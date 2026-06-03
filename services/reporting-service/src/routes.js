const { Router } = require('express');
const { authenticate } = require('@fems/shared');
const c = require('./controller');

const router = Router();

// All reports require authentication (any role may view).
router.get('/reports/summary', authenticate, c.getSummary);
router.get('/reports/inventory', authenticate, c.getInventory);
router.get('/reports/inspections', authenticate, c.getInspections);
router.get('/reports/compliance', authenticate, c.getCompliance);
router.get('/reports/maintenance', authenticate, c.getMaintenance);

// Export: /reports/{inventory|inspections|compliance|maintenance}/export?format=pdf|csv
router.get('/reports/:type/export', authenticate, c.exportReport);

module.exports = router;
