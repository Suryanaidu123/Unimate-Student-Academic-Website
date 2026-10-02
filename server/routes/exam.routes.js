const router = require('express').Router();
const ctrl = require('../controllers/exam.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// Everyone authenticated can list
router.get('/', ctrl.list);

// Admin and Faculty can create/update/delete
// (service layer enforces that faculty only touch their own subjects)
router.post('/', requireRole('ADMIN', 'FACULTY'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'FACULTY'), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'FACULTY'), ctrl.remove);

module.exports = router;