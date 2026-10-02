const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');

// Force Node to use public DNS for SRV lookups (fixes Windows/Render SRV issues)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 30000,   // wait up to 30s for a server
  socketTimeoutMS: 60000,            // kill sockets idle >60s
  heartbeatFrequencyMS: 10000,       // ping server every 10s
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 270000,             // recycle idle sockets after 4.5 min
  retryWrites: true,
};

let isConnected = false;

async function connectDB(retries = 5, delayMs = 5000) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
      isConnected = true;
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`   Retrying in ${delayMs / 1000}s…`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error('❌ All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
}

// ---------- Connection lifecycle events ----------
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('🔌 Mongoose connected');
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  Mongoose disconnected — will auto-reconnect');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🔁 Mongoose reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

// ---------- Health-check ping every 5 minutes ----------
// This (a) keeps the connection alive through Render's idle periods,
// and (b) counts as "activity" against Atlas's 60-day inactivity timer.
setInterval(async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  Connection not ready — attempting to reconnect…');
      await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
    } else {
      await mongoose.connection.db.admin().ping();
      // Silent success — no log spam
    }
  } catch (err) {
    console.error('⚠️  Health ping failed:', err.message);
    // Force a full reconnect attempt
    try {
      await mongoose.connection.close();
      await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
      console.log('🔁 Reconnected after failed ping');
    } catch (e2) {
      console.error('❌ Reconnect after failed ping failed:', e2.message);
    }
  }
}, 5 * 60 * 1000);  // every 5 minutes

// ---------- Graceful shutdown ----------
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Closing MongoDB connection…`);
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  } catch (e) {
    console.error('Error during shutdown:', e.message);
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;