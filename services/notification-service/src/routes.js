const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const c = require('./controller');

const router = Router();

router.get('/notifications', authenticate, c.list);
router.patch('/notifications/:id/read', authenticate, c.markRead);
router.post('/notifications/read-all', authenticate, c.markAllRead);
router.delete('/notifications/:id', authenticate, c.remove);

// Admin broadcast / direct send.
router.post('/notifications', authenticate, requireRole('admin'), c.create);

module.exports = router;
