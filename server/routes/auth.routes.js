const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  studentRegisterSchema,
  studentRegisterInitSchema,
  studentRegisterVerifySchema,
  forgotPasswordInitSchema,
  forgotPasswordVerifySchema,
  facultyRegisterInitSchema,
  facultyRegisterVerifySchema,
  facultyForgotInitSchema,
  facultyForgotVerifySchema,
  adminForgotInitSchema,
  adminForgotVerifySchema,
  studentLoginSchema,
  facultyLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

// ---- Student registration ----
router.post('/student/register/init', authLimiter, validate(studentRegisterInitSchema), ctrl.initStudentRegister);
router.post('/student/register/verify', authLimiter, validate(studentRegisterVerifySchema), ctrl.verifyStudentRegister);

// ---- Student forgot password ----
router.post('/student/forgot-password/init', authLimiter, validate(forgotPasswordInitSchema), ctrl.forgotPasswordInit);
router.post('/student/forgot-password/verify', authLimiter, validate(forgotPasswordVerifySchema), ctrl.forgotPasswordVerify);

// ---- Faculty registration ----
router.post('/faculty/register/init', authLimiter, validate(facultyRegisterInitSchema), ctrl.initFacultyRegister);
router.post('/faculty/register/verify', authLimiter, validate(facultyRegisterVerifySchema), ctrl.verifyFacultyRegister);

// ---- Faculty forgot password ----
router.post('/faculty/forgot-password/init', authLimiter, validate(facultyForgotInitSchema), ctrl.facultyForgotInit);
router.post('/faculty/forgot-password/verify', authLimiter, validate(facultyForgotVerifySchema), ctrl.facultyForgotVerify);

// ---- Admin forgot password ----
router.post('/admin/forgot-password/init', authLimiter, validate(adminForgotInitSchema), ctrl.adminForgotInit);
router.post('/admin/forgot-password/verify', authLimiter, validate(adminForgotVerifySchema), ctrl.adminForgotVerify);

// ---- Legacy direct register ----
router.post('/student/register', authLimiter, validate(studentRegisterSchema), ctrl.registerStudent);

// ---- Logins ----
router.post('/student/login', authLimiter, validate(studentLoginSchema), ctrl.studentLogin);
router.post('/faculty/login', authLimiter, validate(facultyLoginSchema), ctrl.facultyLogin);
router.post('/admin/login', authLimiter, validate(adminLoginSchema), ctrl.adminLogin);

// ---- Session ----
router.get('/me', requireAuth, ctrl.me);
router.put('/change-password', requireAuth, validate(changePasswordSchema), ctrl.changePassword);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;