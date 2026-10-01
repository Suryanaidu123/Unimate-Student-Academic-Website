require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const Section = require('../models/Section.model');

const SECTIONS = [
  { name: 'A', year: 2 },
  { name: 'A', year: 3 },
  { name: 'A', year: 4 },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const s of SECTIONS) {
    await Section.updateOne(
      { name: s.name, year: s.year },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
  console.log('✅ Sections seeded');
  process.exit(0);
})();