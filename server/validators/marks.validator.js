const { z } = require('zod');

const midSchema = z.object({
  written: z.number().min(0).max(30),
  online: z.number().min(0).max(10),
  assignment: z.number().min(0).max(5),
});

const upsertMarksSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  mid1: midSchema.optional(),
  mid2: midSchema.optional(),
}).strict(); // reject internalMarks, writtenConverted, total

module.exports = { upsertMarksSchema, midSchema };