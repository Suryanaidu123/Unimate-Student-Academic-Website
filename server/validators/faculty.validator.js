const { z } = require('zod');

const createFacultySchema = z.object({
  employeeId: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  email: z.string().email(),
  department: z.string().default('AI & ML'),
  designation: z.string().default('Assistant Professor'),
  assignedSections: z.array(z.string()).default([]),
  assignedSubjects: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const updateFacultySchema = createFacultySchema.partial();

module.exports = { createFacultySchema, updateFacultySchema };