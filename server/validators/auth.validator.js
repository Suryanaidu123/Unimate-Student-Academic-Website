const { z } = require('zod');

const passwordRule = z.string().min(8, 'Password must be at least 8 characters');

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRule,
}).strict();

module.exports = {
  studentRegisterSchema,
  studentRegisterInitSchema,
  studentRegisterVerifySchema,
  studentLoginSchema,
  facultyLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
};