const { z } = require('zod');

const createStudentSchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  email: z.string().email(),
  academicYear: z.number().int().min(2).max(4),
}).strict();

const updateStudentSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict();

module.exports = { createStudentSchema, updateStudentSchema };