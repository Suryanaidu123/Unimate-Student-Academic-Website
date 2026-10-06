const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
}, { _id: true });

const responseSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  // For single-choice the array has one entry; for multi-choice it can have many
  choices:    [{ type: String }],
  textAnswer: { type: String, default: '' },
  submittedAt:{ type: Date, default: Date.now },
}, { _id: true });

const activitySchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // ANNOUNCEMENT | IMPORTANT_ANNOUNCEMENT | SINGLE_CHOICE | MULTIPLE_CHOICE
  // | QUESTION | SURVEY | OTHER
  type: {
    type: String,
    enum: ['ANNOUNCEMENT', 'IMPORTANT_ANNOUNCEMENT', 'SINGLE_CHOICE',
           'MULTIPLE_CHOICE', 'QUESTION', 'SURVEY', 'OTHER'],
    required: true,
  },

  // Targeting: 2, 3, 4 or 0 = All Years
  targetYears: [{ type: Number }], // e.g. [2,3] or [0] for all

  // Poll / survey options (required for SINGLE_CHOICE, MULTIPLE_CHOICE, SURVEY)
  options: [optionSchema],

  // Timing
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  // Responses (embedded for simplicity; student subdocs keyed by studentId)
  responses: [responseSchema],

  // Creator
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorRole: { type: String, enum: ['ADMIN', 'FACULTY'] },
  facultyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }, // set when creatorRole=FACULTY

  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

// Index for efficient "active now, targets this year" queries
activitySchema.index({ startDate: 1, endDate: 1, status: 1 });
activitySchema.index({ createdBy: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
