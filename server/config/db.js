const dns = require('dns');
// Force Node.js to use public DNS servers to resolve MongoDB SRV records
dns.setServers(['8.8.8.8', '1.1.1.1']); 

const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;