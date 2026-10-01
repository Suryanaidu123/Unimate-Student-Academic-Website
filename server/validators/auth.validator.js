const { z } = require('zod');

const passwordRule = z.string().min(8, 'Password must be at least 8 characters');

// ---------- Student registration ----------
const studentRegisterSchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  email: z.string().email(),
  password: passwordRule,
  confirmPassword: passwordRule,
})
.strict()
.refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const studentRegisterInitSchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  name: z.string().min(2).trim(),
  email: z.string().email().toLowerCase(),
  academicYear: z.number().int().min(2).max(4),
}).strict();

const studentRegisterVerifySchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  password: passwordRule,
}).strict();

// ---------- Student forgot password ----------
const forgotPasswordInitSchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  email: z.string().email().toLowerCase(),
}).strict();

const forgotPasswordVerifySchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: passwordRule,
}).strict();

// ---------- Faculty registration ----------
const facultyRegisterInitSchema = z.object({
  employeeId: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  email: z.string().email().toLowerCase(),
  designation: z.enum(['Professor', 'Associate Professor', 'Assistant Professor']),
}).strict();

const facultyRegisterVerifySchema = z.object({
  employeeId: z.string().min(2).trim(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  password: passwordRule,
}).strict();

// ---------- Faculty forgot password ----------
const facultyForgotInitSchema = z.object({
  employeeId: z.string().min(2).trim(),
  email: z.string().email().toLowerCase(),
}).strict();

const facultyForgotVerifySchema = z.object({
  employeeId: z.string().min(2).trim(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: passwordRule,
}).strict();

// ---------- Admin forgot password ----------
const adminForgotInitSchema = z.object({
  email: z.string().email().toLowerCase(),
}).strict();

const adminForgotVerifySchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: passwordRule,
}).strict();

// ---------- Logins ----------
const studentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).strict();

const facultyLoginSchema = z.object({
  employeeId: z.string().min(2).trim(),
  password: z.string().min(1),
}).strict();

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).strict();

// ---------- Change password ----------
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRule,
}).strict();

module.exports = {
  // student
  studentRegisterSchema,
  studentRegisterInitSchema,
  studentRegisterVerifySchema,
  forgotPasswordInitSchema,
  forgotPasswordVerifySchema,
  // faculty
  facultyRegisterInitSchema,
  facultyRegisterVerifySchema,
  facultyForgotInitSchema,
  facultyForgotVerifySchema,
  // admin
  adminForgotInitSchema,
  adminForgotVerifySchema,
  // logins
  studentLoginSchema,
  facultyLoginSchema,
  adminLoginSchema,
  // change pwd
  changePasswordSchema,
};