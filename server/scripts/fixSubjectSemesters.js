require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('subjects');

  const all = await coll.find({}).toArray();
  let fixed = 0;

  for (const s of all) {
    const year = Number(s.year);
    if (![2, 3, 4].includes(year)) continue;

    // Valid semesters for this year: e.g. Year 2 → 3 or 4
    const validSems = [2 * year - 1, 2 * year];

    let sem = Number(s.semester);
    if (!validSems.includes(sem)) {
      // Default: assign to the 1st semester of that year
      sem = validSems[0];
    }

    await coll.updateOne(
      { _id: s._id },
      { $set: { semester: sem } }
    );
    fixed++;
  }

  console.log(`✅ Fixed ${fixed} subjects (out of ${all.length})`);
  process.exit(0);
})();