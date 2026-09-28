const { z } = require('zod');

const createStudentSchema = z.object({
  rollNumber: z.string().min(3).max(30).trim(),
  email: z.string().email(),
  academicYear: z.number().int().min(2).max(4),
}).strict();

// Update allows: email (editable), name (correctable), status
const updateStudentSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict();

module.exports = { createStudentSchema, updateStudentSchema };