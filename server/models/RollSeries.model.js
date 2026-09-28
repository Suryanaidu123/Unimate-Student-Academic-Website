const mongoose = require('mongoose');

const rangeSchema = new mongoose.Schema({
  start: { type: String, required: true, trim: true },
  end: { type: String, required: true, trim: true },
}, { _id: false });

const rollSeriesSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true, min: 2, max: 4 },
  label: { type: String, required: true },           // "3rd Year"
  emailSuffix: { type: String, required: true },     // "24@sasi.ac.in" (no dot prefix)
  emailDomain: { type: String, default: 'sasi.ac.in' },
  batch: { type: String, required: true },           // "2024-2028"
  admissionYear: { type: Number, required: true },   // 2024
  ranges: [rangeSchema],                             // list of {start, end}
  singles: [{ type: String, trim: true }],           // individual roll numbers
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('RollSeries', rollSeriesSchema);