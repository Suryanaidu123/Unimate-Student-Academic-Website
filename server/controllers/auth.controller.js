const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

exports.registerStudent = async (req, res, next) => {
  try {
    const data = await authService.registerStudent(req.body);
    return success(res, data, 'Student account created successfully.', 201);
  } catch (e) { next(e); }
};

exports.studentLogin = async (req, res, next) => {
  try {
    const data = await authService.loginEmailPassword({ ...req.body, expectedRole: 'STUDENT' });
    return success(res, data, 'Logged in successfully');
  } catch (e) { next(e); }
};

exports.facultyLogin = async (req, res, next) => {
  try {
    const data = await authService.loginFaculty(req.body);
    return success(res, data, 'Logged in successfully');
  } catch (e) { next(e); }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const data = await authService.loginEmailPassword({ ...req.body, expectedRole: 'ADMIN' });
    return success(res, data, 'Logged in successfully');
  } catch (e) { next(e); }
};
exports.facultyForgotInit = async (req, res, next) => {
  try { return success(res, await authService.initFacultyPasswordReset(req.body), 'Reset code sent.'); }
  catch (e) { next(e); }
};
exports.adminForgotInit = async (req, res, next) => {
  try { return success(res, await authService.initAdminPasswordReset(req.body), 'Reset code sent to the recovery email.'); }
  catch (e) { next(e); }
};

exports.adminForgotVerify = async (req, res, next) => {
  try { return success(res, await authService.verifyAdminPasswordReset(req.body), 'Password reset.'); }
  catch (e) { next(e); }
};
exports.facultyForgotVerify = async (req, res, next) => {
  try { return success(res, await authService.verifyFacultyPasswordReset(req.body), 'Password reset.'); }
  catch (e) { next(e); }
};
exports.me = async (req, res, next) => {
  try {
    const data = await authService.me(req.user.userId);
    return success(res, data);
  } catch (e) { next(e); }
};
exports.initStudentRegister = async (req, res, next) => {
  try {
    const data = await authService.initStudentRegistration(req.body);
    return success(res, data, 'Verification code sent to your college email.', 200);
  } catch (e) { next(e); }
};
exports.forgotPasswordInit = async (req, res, next) => {
  try {
    const data = await authService.initStudentPasswordReset(req.body);
    return success(res, data, 'Reset code sent to your college email.');
  } catch (e) { next(e); }
};
exports.initFacultyRegister = async (req, res, next) => {
  try {
    const data = await authService.initFacultyRegistration(req.body);
    return success(res, data, 'Verification code sent to your email.');
  } catch (e) { next(e); }
};

exports.verifyFacultyRegister = async (req, res, next) => {
  try {
    const data = await authService.verifyFacultyRegistration(req.body);
    return success(res, data, 'Faculty account created successfully.', 201);
  } catch (e) { next(e); }
};
exports.forgotPasswordVerify = async (req, res, next) => {
  try {
    const data = await authService.verifyStudentPasswordReset(req.body);
    return success(res, data, 'Password reset successful. You can now log in.');
  } catch (e) { next(e); }
};
exports.verifyStudentRegister = async (req, res, next) => {
  try {
    const data = await authService.verifyStudentRegistration(req.body);
    return success(res, data, 'Student account created successfully.', 201);
  } catch (e) { next(e); }
};
exports.changePassword = async (req, res, next) => {
  try {
    const data = await authService.changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
    return success(res, data, 'Password changed');
  } catch (e) { next(e); }
};

exports.logout = async (_req, res) => success(res, { ok: true }, 'Logged out');