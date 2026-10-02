require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const countBefore = await db.collection('timetables').countDocuments();
  const r = await db.collection('timetables').deleteMany({});
  console.log(`✅ Deleted ${r.deletedCount} of ${countBefore} timetable slots`);

  process.exit(0);
})();