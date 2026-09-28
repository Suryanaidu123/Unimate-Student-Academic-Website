const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  studentRegisterSchema,
  studentRegisterInitSchema,
  studentRegisterVerifySchema,
  studentLoginSchema,
  facultyLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

// 2-step student registration (OTP)
router.post('/student/register/init', authLimiter, validate(studentRegisterInitSchema), ctrl.initStudentRegister);
router.post('/student/register/verify', authLimiter, validate(studentRegisterVerifySchema), ctrl.verifyStudentRegister);

// legacy direct register — kept for compat
router.post('/student/register', authLimiter, validate(studentRegisterSchema), ctrl.registerStudent);

router.post('/student/login', authLimiter, validate(studentLoginSchema), ctrl.studentLogin);
router.post('/faculty/login', authLimiter, validate(facultyLoginSchema), ctrl.facultyLogin);
router.post('/admin/login', authLimiter, validate(adminLoginSchema), ctrl.adminLogin);

router.get('/me', requireAuth, ctrl.me);
router.put('/change-password', requireAuth, validate(changePasswordSchema), ctrl.changePassword);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;