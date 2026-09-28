require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const RollSeries = require('../models/RollSeries.model');

const DEFAULTS = [
  {
    year: 3,
    label: '3rd Year',
    emailSuffix: '24@sasi.ac.in',
    emailDomain: 'sasi.ac.in',
    batch: '2024-2028',
    admissionYear: 2024,
    ranges: [
      { start: '24K61A6101', end: '24K61A6164' },
      { start: '25K65A6101', end: '25K65A6101' },
    ],
    singles: ['24K65A6102', '23K61A6104', '23K61A6119'],
  },
  {
    year: 2,
    label: '2nd Year',
    emailSuffix: '25@sasi.ac.in',
    emailDomain: 'sasi.ac.in',
    batch: '2025-2029',
    admissionYear: 2025,
    ranges: [],       // admin adds later via UI
    singles: [],
  },
  {
    year: 4,
    label: '4th Year',
    emailSuffix: '23@sasi.ac.in',
    emailDomain: 'sasi.ac.in',
    batch: '2023-2027',
    admissionYear: 2023,
    ranges: [],       // admin adds later via UI
    singles: [],
  },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const cfg of DEFAULTS) {
    await RollSeries.updateOne({ year: cfg.year }, { $setOnInsert: cfg }, { upsert: true });
  }
  console.log('✅ Roll series seeded');
  process.exit(0);
})();