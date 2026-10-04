const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const Admin = require('../models/Admin.model');
const OtpRequest = require('../models/OtpRequest.model');
const ApiError = require('../utils/ApiError');
const { signAccess } = require('../utils/jwt');
const auditLog = require('./auditLog.service');
const { sendMail } = require('../utils/mailer');
const env = require('../config/env');

const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    studentId: user.studentId,
    facultyId: user.facultyId,
    adminId: user.adminId,
  };
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// ---------------------------------------------------------------
// Legacy direct register (kept because routes/controller still use it)
// ---------------------------------------------------------------
async function registerStudent({ rollNumber, email, password }) {
  const student = await Student.findOne({ rollNumber });
  if (!student) {
    throw ApiError.unprocessable(
      'This Roll Number is not registered. Please contact the college administration.'
    );
  }

  const existing = await User.findOne({
    $or: [{ email }, { studentId: student._id }],
  });
  if (existing) {
    throw ApiError.conflict('An account already exists for this student.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email,
    passwordHash,
    role: 'STUDENT',
    studentId: student._id,
  });

  await auditLog.log({
    actor: { userId: user._id, role: 'STUDENT' },
    action: 'STUDENT_REGISTER',
    entityType: 'User',
    entityId: user._id,
    description: `Student account created for roll ${rollNumber}`,
  });

  const accessToken = signAccess({
    sub: user._id, role: user.role, studentId: user.studentId,
  });

  return {
    user: publicUser(user),
    student: {
      rollNumber: student.rollNumber,
      name: student.name,
      year: student.year,
      semester: student.semester,
      section: student.section,
      batch: student.batch,
      academicYear: student.academicYear,
    },
    accessToken,
  };
}

// ---------------------------------------------------------------
// Step 1: student requests OTP — checks 3 fields only
// ---------------------------------------------------------------

async function initStudentRegistration({ rollNumber, name, email, academicYear }) {
  const student = await Student.findOne({ rollNumber });
  if (!student) {
    throw ApiError.unprocessable(
      'This Roll Number is not registered. Please contact the college administration.'
    );
  }

  // Cross-check ONLY email + academic year (name is NOT verified)
  const norm = (s) => String(s || '').trim().toLowerCase();
  const failed = [];
  if (norm(student.email) !== norm(email)) failed.push('college email');
  if (Number(student.academicYear) !== Number(academicYear)) failed.push('academic year');

  if (failed.length) {
    throw ApiError.unprocessable(
      `The details you entered do not match our records (${failed.join(', ')}). ` +
      `Please verify or contact the college administration.`
    );
  }

  const existing = await User.findOne({
    $or: [{ email: student.email }, { studentId: student._id }],
  });
  if (existing) throw ApiError.conflict('An account already exists for this student.');

  // Invalidate prior unconsumed OTPs
  await OtpRequest.updateMany(
    { rollNumber, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber,
    email: student.email,
    studentId: student._id,
    pendingName: name.trim(),       // ← store chosen name
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Verify your student account';
  const text =
`Hi ${name},

Your UniMate verification code is: ${code}

This code expires in ${env.OTP_TTL_MINUTES} minutes.

If you didn't request this, ignore this email.

— UniMate`;

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <h2 style="margin:0 0 8px">UniMate verification code</h2>
    <p>Hi ${name},</p>
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#4f46e5">${code}</p>
    <p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
    <p style="color:#64748b;font-size:12px">If you didn't request this, ignore this email.</p>
  </div>`;

  try {
    await sendMail({ to: student.email, subject, text, html });
  } catch (e) {
    console.error('Failed to send OTP email:', e.message);
    throw ApiError.badRequest('Could not send verification email. Try again later.');
  }

  return {
    sentTo: student.email.replace(/(.{2}).+(@.*)/, '$1***$2'),
    expiresInMinutes: env.OTP_TTL_MINUTES,
  };
}

// ---------------------------------------------------------------
// Step 2: verify OTP + create account
// ---------------------------------------------------------------
async function verifyStudentRegistration({ rollNumber, code, password }) {
  const req = await OtpRequest
    .findOne({ rollNumber, consumed: false })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending verification. Please start again.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Verification code expired. Please request a new one.');
  if (req.attempts >= env.OTP_MAX_ATTEMPTS) throw ApiError.forbidden('Too many incorrect attempts. Please request a new code.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) {
    req.attempts += 1;
    await req.save();
    const left = Math.max(0, env.OTP_MAX_ATTEMPTS - req.attempts);
    throw ApiError.unprocessable(`Incorrect code. ${left} attempt(s) left.`);
  }

  const student = await Student.findById(req.studentId);
  if (!student) throw ApiError.notFound('Student record missing.');

  const existing = await User.findOne({
    $or: [{ email: student.email }, { studentId: student._id }],
  });
  if (existing) throw ApiError.conflict('An account already exists for this student.');

  // Write the name into the Student record (from what they entered at registration)
  if (req.pendingName) {
    student.name = req.pendingName;
    await student.save();
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: student.email,
    passwordHash,
    role: 'STUDENT',
    studentId: student._id,
  });

  req.consumed = true;
  await req.save();

  await auditLog.log({
    actor: { userId: user._id, role: 'STUDENT' },
    action: 'STUDENT_REGISTER_VERIFIED',
    entityType: 'User',
    entityId: user._id,
    description: `Student account verified for roll ${student.rollNumber}`,
  });

  const accessToken = signAccess({
    sub: user._id, role: user.role, studentId: user.studentId,
  });

  return {
    user: publicUser(user),
    student: {
      rollNumber: student.rollNumber,
      name: student.name,
      year: student.year,
      semester: student.semester,
      section: student.section,
      batch: student.batch,
      academicYear: student.academicYear,
    },
    accessToken,
  };
}

// ---------------------------------------------------------------
// Login / me / change password
// ---------------------------------------------------------------
async function loginEmailPassword({ email, password, expectedRole }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (expectedRole && user.role !== expectedRole) throw ApiError.unauthorized('Invalid credentials');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is inactive');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccess({
    sub: user._id, role: user.role, studentId: user.studentId, facultyId: user.facultyId,
  });
  return { user: publicUser(user), accessToken };
}

async function loginFaculty({ employeeId, password }) {
  const faculty = await Faculty.findOne({ employeeId });
  if (!faculty) throw ApiError.unauthorized('Invalid credentials');

  const user = await User.findOne({ facultyId: faculty._id }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is inactive');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccess({ sub: user._id, role: user.role, facultyId: faculty._id });
  return {
    user: publicUser(user),
    faculty: {
      employeeId: faculty.employeeId,
      name: faculty.name,
      designation: faculty.designation,
    },
    accessToken,
  };
}

async function me(userId) {
  const user = await User.findById(userId)
    .populate('studentId')
    .populate('facultyId')
    .populate('adminId');
  if (!user) throw ApiError.notFound('User not found');
  const out = publicUser(user);
  if (user.role === 'STUDENT' && user.studentId) {
    const s = user.studentId;
    out.profile = {
      rollNumber: s.rollNumber, name: s.name, email: s.email, year: s.year,
      semester: s.semester, section: s.section, batch: s.batch,
      academicYear: s.academicYear, department: s.department, course: s.course,
    };
  }
  if (user.role === 'FACULTY' && user.facultyId) {
    const f = user.facultyId;
    out.profile = {
      employeeId: f.employeeId, name: f.name, email: f.email,
      designation: f.designation, department: f.department,
    };
  }
  if (user.role === 'ADMIN' && user.adminId) {
    out.profile = { name: user.adminId.name, email: user.adminId.email };
  }
  return out;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Current password incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  return { ok: true };
}
// ---------- Forgot password ----------
async function initStudentPasswordReset({ rollNumber, email }) {
  const student = await Student.findOne({ rollNumber });
  if (!student) {
    throw ApiError.unprocessable(
      'This Roll Number is not registered. Please contact the college administration.'
    );
  }
  if (String(student.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
    throw ApiError.unprocessable('The email does not match our records for this Roll Number.');
  }

  const user = await User.findOne({ studentId: student._id });
  if (!user) {
    throw ApiError.unprocessable('No account exists for this student. Please register first.');
  }

  // Invalidate prior OTPs
  await OtpRequest.updateMany(
    { rollNumber, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber,
    email: student.email,
    studentId: student._id,
    pendingName: '__PASSWORD_RESET__',
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Password reset code';
  const text =
`Hi ${student.name || 'Student'},

Your UniMate password reset code is: ${code}

This code expires in ${env.OTP_TTL_MINUTES} minutes.

If you didn't request this, ignore this email.

— UniMate`;

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <h2 style="margin:0 0 8px">Password reset code</h2>
    <p>Your UniMate code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#4f46e5">${code}</p>
    <p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
  </div>`;

  try {
    await sendMail({ to: student.email, subject, text, html });
  } catch (e) {
    console.error('Failed to send reset email:', e.message);
    throw ApiError.badRequest('Could not send reset email. Try again later.');
  }

  return {
    sentTo: student.email.replace(/(.{2}).+(@.*)/, '$1***$2'),
    expiresInMinutes: env.OTP_TTL_MINUTES,
  };
}

async function verifyStudentPasswordReset({ rollNumber, code, newPassword }) {
  const req = await OtpRequest
    .findOne({ rollNumber, consumed: false, pendingName: '__PASSWORD_RESET__' })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending reset. Please start again.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Reset code expired. Please request a new one.');
  if (req.attempts >= env.OTP_MAX_ATTEMPTS) throw ApiError.forbidden('Too many attempts. Please request a new code.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) {
    req.attempts += 1;
    await req.save();
    const left = Math.max(0, env.OTP_MAX_ATTEMPTS - req.attempts);
    throw ApiError.unprocessable(`Incorrect code. ${left} attempt(s) left.`);
  }

  const user = await User.findOne({ studentId: req.studentId });
  if (!user) throw ApiError.notFound('User account not found.');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  req.consumed = true;
  await req.save();

  await auditLog.log({
    actor: { userId: user._id, role: 'STUDENT' },
    action: 'STUDENT_PASSWORD_RESET',
    entityType: 'User',
    entityId: user._id,
    description: `Password reset for roll ${rollNumber}`,
  });

  return { ok: true };
}
// ---------- Faculty registration (2-step with OTP) ----------
async function initFacultyRegistration({ employeeId, name, email, designation }) {
  const faculty = await Faculty.findOne({ employeeId });
  if (!faculty) {
    throw ApiError.unprocessable(
      'This Employee ID is not registered. Please contact the college administration.'
    );
  }
  if (faculty.name) {
    // already fully registered
    const existingUser = await User.findOne({ facultyId: faculty._id });
    if (existingUser) {
      throw ApiError.conflict('An account already exists for this Employee ID.');
    }
  }

  // Reject if another user with this email exists
  const emailDup = await User.findOne({ email });
  if (emailDup) throw ApiError.conflict('An account already exists with this email.');

  // Invalidate prior OTPs
  await OtpRequest.updateMany(
    { rollNumber: employeeId, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber: employeeId,
    email,
    studentId: faculty._id,       // reuse studentId field as generic "entityId"
    pendingName: JSON.stringify({ name, designation }),
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Verify your faculty account';
  const text =
`Hi ${name},

Your UniMate faculty verification code is: ${code}

This code expires in ${env.OTP_TTL_MINUTES} minutes.

If you didn't request this, ignore this email.

— UniMate`;

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <h2>UniMate faculty verification</h2>
    <p>Hi ${name},</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#4f46e5">${code}</p>
    <p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
  </div>`;

  try {
    await sendMail({ to: email, subject, text, html });
  } catch (e) {
    console.error('Failed to send faculty OTP:', e.message);
    throw ApiError.badRequest('Could not send verification email. Try again later.');
  }

  return { sentTo: email.replace(/(.{2}).+(@.*)/, '$1***$2'), expiresInMinutes: env.OTP_TTL_MINUTES };
}

async function verifyFacultyRegistration({ employeeId, code, password }) {
  const req = await OtpRequest
    .findOne({ rollNumber: employeeId, consumed: false })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending verification. Please start again.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Verification code expired.');
  if (req.attempts >= env.OTP_MAX_ATTEMPTS) throw ApiError.forbidden('Too many attempts.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) {
    req.attempts += 1;
    await req.save();
    const left = Math.max(0, env.OTP_MAX_ATTEMPTS - req.attempts);
    throw ApiError.unprocessable(`Incorrect code. ${left} attempt(s) left.`);
  }

  const faculty = await Faculty.findById(req.studentId);
  if (!faculty) throw ApiError.notFound('Faculty record missing.');

  const meta = req.pendingName ? JSON.parse(req.pendingName) : {};

  // Update faculty record with the chosen values
  faculty.name = meta.name || faculty.name || '';
  faculty.email = req.email;
  faculty.designation = meta.designation || faculty.designation || 'Assistant Professor';
  faculty.status = 'ACTIVE';
  await faculty.save();

  // Create the User account
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: faculty.email,
    passwordHash,
    role: 'FACULTY',
    facultyId: faculty._id,
    status: 'ACTIVE',
  });

  req.consumed = true;
  await req.save();

  await auditLog.log({
    actor: { userId: user._id, role: 'FACULTY' },
    action: 'FACULTY_REGISTER_VERIFIED',
    entityType: 'User',
    entityId: user._id,
    description: `Faculty account verified for ${faculty.employeeId}`,
  });

  const accessToken = signAccess({ sub: user._id, role: user.role, facultyId: faculty._id });

  return {
    user: publicUser(user),
    faculty: {
      employeeId: faculty.employeeId,
      name: faculty.name,
      email: faculty.email,
      designation: faculty.designation,
    },
    accessToken,
  };
}
async function initFacultyPasswordReset({ employeeId, email }) {
  const faculty = await Faculty.findOne({ employeeId });
  if (!faculty) {
    throw ApiError.unprocessable('This Employee ID is not registered.');
  }
  if (!faculty.email || faculty.email.toLowerCase() !== String(email).trim().toLowerCase()) {
    throw ApiError.unprocessable('The email does not match our records for this Employee ID.');
  }

  const user = await User.findOne({ facultyId: faculty._id });
  if (!user) throw ApiError.unprocessable('No account exists for this faculty.');

  await OtpRequest.updateMany(
    { rollNumber: employeeId, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber: employeeId,
    email: faculty.email,
    studentId: faculty._id,   // reused as generic entityId
    pendingName: '__FACULTY_RESET__',
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Faculty password reset';
  const text = `Hi ${faculty.name},\n\nYour UniMate password reset code is: ${code}\n\nThis code expires in ${env.OTP_TTL_MINUTES} minutes.\n\n— UniMate`;
  const html = `<p>Your code: <b style="font-size:24px">${code}</b></p>`;

  try { await sendMail({ to: faculty.email, subject, text, html }); }
  catch (e) { throw ApiError.badRequest('Could not send reset email.'); }

  return {
    sentTo: faculty.email.replace(/(.{2}).+(@.*)/, '$1***$2'),
    expiresInMinutes: env.OTP_TTL_MINUTES,
  };
}
async function loginStaff({ employeeId, password }) {
  const Staff = require('../models/Staff.model');
  const staff = await Staff.findOne({ employeeId });
  if (!staff) throw ApiError.unauthorized('Invalid credentials');

  const user = await User.findOne({ staffId: staff._id }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account is inactive');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccess({ sub: user._id, role: user.role, staffId: staff._id });
  return {
    user: publicUser(user),
    staff: { employeeId: staff.employeeId, name: staff.name, role: staff.role },
    accessToken,
  };
}

async function initStaffRegistration({ employeeId, name, email }) {
  const Staff = require('../models/Staff.model');
  const staff = await Staff.findOne({ employeeId });
  if (!staff) throw ApiError.unprocessable('This Employee ID is not registered.');
  if (staff.name) {
    const existing = await User.findOne({ staffId: staff._id });
    if (existing) throw ApiError.conflict('An account already exists for this Employee ID.');
  }

  const emailDup = await User.findOne({ email });
  if (emailDup) throw ApiError.conflict('An account already exists with this email.');

  await OtpRequest.updateMany(
    { rollNumber: employeeId, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber: employeeId,
    email,
    studentId: staff._id,   // reused as generic entityId
    pendingName: JSON.stringify({ name }),
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Verify your attendance staff account';
  const text = `Hi ${name},\n\nYour UniMate verification code is: ${code}\n\nThis code expires in ${env.OTP_TTL_MINUTES} minutes.\n\n— UniMate`;
  const html = `<p>Your code: <b style="font-size:24px">${code}</b></p>`;
  try { await sendMail({ to: email, subject, text, html }); }
  catch (e) { throw ApiError.badRequest('Could not send verification email.'); }

  return { sentTo: email.replace(/(.{2}).+(@.*)/, '$1***$2'), expiresInMinutes: env.OTP_TTL_MINUTES };
}

async function verifyStaffRegistration({ employeeId, code, password }) {
  const Staff = require('../models/Staff.model');
  const req = await OtpRequest
    .findOne({ rollNumber: employeeId, consumed: false })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending verification.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Code expired.');
  if (req.attempts >= env.OTP_MAX_ATTEMPTS) throw ApiError.forbidden('Too many attempts.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) {
    req.attempts += 1;
    await req.save();
    throw ApiError.unprocessable(`Incorrect code. ${Math.max(0, env.OTP_MAX_ATTEMPTS - req.attempts)} left.`);
  }

  const staff = await Staff.findById(req.studentId);
  if (!staff) throw ApiError.notFound('Staff record missing.');

  const meta = req.pendingName ? JSON.parse(req.pendingName) : {};

  staff.name = meta.name || staff.name || '';
  staff.email = req.email;
  staff.status = 'ACTIVE';
  await staff.save();

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: staff.email,
    passwordHash,
    role: 'ATTENDANCE_STAFF',
    staffId: staff._id,
    status: 'ACTIVE',
  });

  req.consumed = true;
  await req.save();

  const accessToken = signAccess({ sub: user._id, role: user.role, staffId: staff._id });

  return {
    user: publicUser(user),
    staff: { employeeId: staff.employeeId, name: staff.name, email: staff.email },
    accessToken,
  };
}
async function verifyFacultyPasswordReset({ employeeId, code, newPassword }) {
  const req = await OtpRequest
    .findOne({ rollNumber: employeeId, consumed: false, pendingName: '__FACULTY_RESET__' })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending reset.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Reset code expired.');
  if (req.attempts >= env.OTP_MAX_ATTEMPTS) throw ApiError.forbidden('Too many attempts.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) {
    req.attempts += 1;
    await req.save();
    throw ApiError.unprocessable(`Incorrect code. ${Math.max(0, env.OTP_MAX_ATTEMPTS - req.attempts)} left.`);
  }

  const user = await User.findOne({ facultyId: req.studentId });
  if (!user) throw ApiError.notFound('Faculty user not found.');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  req.consumed = true;
  await req.save();

  await auditLog.log({
    actor: { userId: user._id, role: 'FACULTY' },
    action: 'FACULTY_PASSWORD_RESET',
    entityType: 'User',
    entityId: user._id,
    description: `Faculty password reset for ${employeeId}`,
  });

  return { ok: true };
}
const ADMIN_RECOVERY_EMAIL = 'suryanaidu652@gmail.com';

async function initAdminPasswordReset({ email }) {
  const user = await User.findOne({ email: String(email).trim().toLowerCase(), role: 'ADMIN' });
  if (!user) {
    // Do not reveal whether the email exists — respond success regardless
    return { sentTo: ADMIN_RECOVERY_EMAIL.replace(/(.{2}).+(@.*)/, '$1***$2') };
  }

  // Always send to the recovery email, regardless of the admin's own address
  await OtpRequest.updateMany(
    { rollNumber: `ADMIN_${user._id}`, consumed: false },
    { $set: { consumed: true } }
  );

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await OtpRequest.create({
    rollNumber: `ADMIN_${user._id}`,
    email: ADMIN_RECOVERY_EMAIL,
    studentId: user._id,
    pendingName: '__ADMIN_RESET__',
    codeHash,
    expiresAt,
  });

  const subject = 'UniMate — Admin password reset';
  const text = `Your UniMate admin reset code is: ${code}\n\nExpires in ${env.OTP_TTL_MINUTES} minutes.`;
  const html = `<p>Your code: <b style="font-size:24px">${code}</b></p>`;

  try { await sendMail({ to: ADMIN_RECOVERY_EMAIL, subject, text, html }); }
  catch { throw ApiError.badRequest('Could not send reset email.'); }

  return { sentTo: ADMIN_RECOVERY_EMAIL.replace(/(.{2}).+(@.*)/, '$1***$2') };
}

async function verifyAdminPasswordReset({ email, code, newPassword }) {
  const user = await User.findOne({ email: String(email).trim().toLowerCase(), role: 'ADMIN' });
  if (!user) throw ApiError.unprocessable('Invalid request.');

  const req = await OtpRequest
    .findOne({ rollNumber: `ADMIN_${user._id}`, consumed: false, pendingName: '__ADMIN_RESET__' })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!req) throw ApiError.unprocessable('No pending reset.');
  if (req.expiresAt < new Date()) throw ApiError.unprocessable('Reset code expired.');

  const ok = await bcrypt.compare(code, req.codeHash);
  if (!ok) { req.attempts += 1; await req.save(); throw ApiError.unprocessable('Incorrect code.'); }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  req.consumed = true;
  await req.save();

  await auditLog.log({
    actor: { userId: user._id, role: 'ADMIN' },
    action: 'ADMIN_PASSWORD_RESET',
    entityType: 'User', entityId: user._id,
    description: `Admin password reset for ${user.email}`,
  });

  return { ok: true };
}
module.exports = {
  // Student
  registerStudent,
  initStudentRegistration,
  verifyStudentRegistration,
  initStudentPasswordReset,
  verifyStudentPasswordReset,

  // Faculty
  initFacultyRegistration,
  verifyFacultyRegistration,
  initFacultyPasswordReset,
  verifyFacultyPasswordReset,
  loginFaculty,

  // Staff (attendance staff)
  loginStaff,
  initStaffRegistration,
  verifyStaffRegistration,

  // Admin
  initAdminPasswordReset,
  verifyAdminPasswordReset,

  // Shared
  loginEmailPassword,
  me,
  changePassword,
};