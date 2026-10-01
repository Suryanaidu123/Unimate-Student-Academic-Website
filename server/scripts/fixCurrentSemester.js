require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student.model');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('students');

  const all = await coll.find({}).toArray();
  let fixed = 0;
  for (const s of all) {
    const year = Number(s.year);
    const firstSem = 2 * year - 1;

    // If currentSemester is missing OR is a value that doesn't match any valid semester for that year,
    // reset it to the first semester of that year.
    const validSems = [firstSem, firstSem + 1];
    const cs = Number(s.currentSemester);
    const sems = Number(s.semester);

    if (!validSems.includes(cs)) {
      // Try to preserve the legacy semester field if it's valid
      const useSem = validSems.includes(sems) ? sems : firstSem;
      await coll.updateOne(
        { _id: s._id },
        { $set: { currentSemester: useSem, semester: useSem } }
      );
      fixed++;
    } else if (sems !== cs) {
      await coll.updateOne({ _id: s._id }, { $set: { semester: cs } });
    }
  }

  console.log(`✅ Fixed ${fixed} students (out of ${all.length})`);
  process.exit(0);
})();