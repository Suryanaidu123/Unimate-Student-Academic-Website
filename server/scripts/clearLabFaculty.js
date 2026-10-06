require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Subject = require('../models/Subject.model');
    const result  = await Subject.updateMany(
      { type: 'LAB', facultyId: { $exists: true, $ne: null } },
      { $unset: { facultyId: '' } }
    );
    console.log(`Done. Labs with faculty cleared: ${result.modifiedCount}`);
    await mongoose.disconnect();
  })
  .catch((e) => { console.error('Error:', e.message); process.exit(1); });
