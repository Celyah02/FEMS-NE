const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const insp = require('./inspectionController');
const maint = require('./maintenanceController');

const router = Router();

// ---- Inspections ----------------------------------------------------------
// Any authenticated user can schedule and view inspections.
router.post('/inspections', authenticate, insp.schedule);
router.get('/inspections', authenticate, insp.list);
router.get('/inspections/:id', authenticate, insp.getById);

// Inspectors/admins manage and complete them.
router.patch('/inspections/:id', authenticate, requireRole('admin', 'inspector'), insp.update);
router.post('/inspections/:id/complete', authenticate, requireRole('admin', 'inspector'), insp.complete);
router.delete('/inspections/:id', authenticate, requireRole('admin'), insp.remove);

// ---- Maintenance ----------------------------------------------------------
router.get('/maintenance', authenticate, maint.list);
router.get('/maintenance/:id', authenticate, maint.getById);
router.post('/maintenance', authenticate, requireRole('admin', 'inspector'), maint.create);

module.exports = router;
