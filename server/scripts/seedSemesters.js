require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const Semester = require('../models/Semester.model');

const SEMESTERS = [
  { number: 1, label: 'Semester 1' },
  { number: 2, label: 'Semester 2' },
  { number: 3, label: 'Semester 3' },
  { number: 4, label: 'Semester 4' },
  { number: 5, label: 'Semester 5' },
  { number: 6, label: 'Semester 6' },
  { number: 7, label: 'Semester 7' },
  { number: 8, label: 'Semester 8' },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const s of SEMESTERS) {
    await Semester.updateOne({ number: s.number }, { $setOnInsert: s }, { upsert: true });
  }
  console.log('✅ Semesters seeded');
  process.exit(0);
})();