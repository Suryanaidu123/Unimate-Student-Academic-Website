const mongoose = require('mongoose');

const DOCUMENT_TYPES = ['CERTIFICATE', 'OD', 'OFFER_LETTER', 'OTHER'];
const ALLOWED_MIME   = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const studentDocumentSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  year:        { type: Number, required: true },                // snapshot for visibility queries

  // Document metadata
  docType:     { type: String, enum: DOCUMENT_TYPES, required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  // B2 storage
  fileKey:     { type: String, required: true },
  fileName:    { type: String, required: true },
  fileSize:    { type: Number, default: 0 },
  mimeType:    { type: String, required: true },

  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' },
}, { timestamps: true });

studentDocumentSchema.index({ studentId: 1, createdAt: -1 });
studentDocumentSchema.index({ year: 1, docType: 1 });

module.exports = {
  StudentDocument: mongoose.models.StudentDocument || mongoose.model('StudentDocument', studentDocumentSchema),
  DOCUMENT_TYPES,
  ALLOWED_MIME,
};
