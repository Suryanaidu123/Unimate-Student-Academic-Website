const { z } = require('zod');

const createSubjectSchema = z.object({
  subjectName: z.string().min(2),
  subjectCode: z.string().min(2).toUpperCase(),
  type: z.enum(['THEORY', 'LAB']).default('THEORY'),
  credits: z.number().min(0.5).max(6),
  year: z.number().int().min(2).max(4),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  semesterId: z.string().optional(),
  facultyId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const updateSubjectSchema = z.object({
  subjectName: z.string().min(2).optional(),
  subjectCode: z.string().min(2).toUpperCase().optional(),
  type: z.enum(['THEORY', 'LAB']).optional(),
  credits: z.number().min(0.5).max(6).optional(),
  year: z.number().int().min(2).max(4).optional(),
  facultyId: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

module.exports = { createSubjectSchema, updateSubjectSchema };