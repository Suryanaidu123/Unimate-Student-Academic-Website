const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/student', ctrl.student);
router.get('/faculty', ctrl.faculty);
router.get('/admin', ctrl.admin);

module.exports = router;