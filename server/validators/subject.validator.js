const { z } = require('zod');

const createSubjectSchema = z.object({
  subjectName: z.string().min(2),
  subjectCode: z.string().min(2).toUpperCase().optional(),
  type: z.enum(['THEORY', 'LAB', 'ACTIVITY']).default('THEORY'),
  credits: z.number().min(0).max(6).optional(),
  year: z.number().int().min(2).max(4),
  semester: z.number().int().min(3).max(8).optional(),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  semesterId: z.string().optional(),
  facultyId: z.string().optional().nullable(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict();

const updateSubjectSchema = createSubjectSchema.partial();

module.exports = { createSubjectSchema, updateSubjectSchema };