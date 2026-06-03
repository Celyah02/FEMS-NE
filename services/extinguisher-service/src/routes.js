const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const c = require('./controller');

const router = Router();

// Any authenticated user can read.
router.get('/extinguishers', authenticate, c.list);
router.get('/extinguishers/:id', authenticate, c.getById);

// Admin + inspector can create / update.
router.post('/extinguishers', authenticate, requireRole('admin', 'inspector'), c.create);
router.patch('/extinguishers/:id', authenticate, requireRole('admin', 'inspector'), c.update);

// Only admin can delete.
router.delete('/extinguishers/:id', authenticate, requireRole('admin'), c.remove);

module.exports = router;
