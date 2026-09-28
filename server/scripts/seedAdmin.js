require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const env = require('../config/env');
const User = require('../models/User.model');
const Admin = require('../models/Admin.model');

(async () => {
  await connectDB();
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD are required in .env');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('ℹ️  Admin already exists:', email);
    process.exit(0);
  }

  const admin = await Admin.create({ name: env.ADMIN_NAME, email });
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email, passwordHash, role: 'ADMIN', adminId: admin._id });
  console.log('✅ Admin created:', email);
  process.exit(0);
})();