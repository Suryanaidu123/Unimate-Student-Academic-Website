const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
  publishedAt: { type: Date },
}, { timestamps: true });

noteSchema.index({ subjectId: 1, status: 1 });

module.exports = mongoose.model('Note', noteSchema);