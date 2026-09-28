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