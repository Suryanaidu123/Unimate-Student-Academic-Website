const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
required.forEach((k) => {
  if (!process.env[k]) {
    console.error(`❌ Missing env: ${k}`);
    process.exit(1);
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME || 'Administrator',

  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  SMTP_FROM: process.env.SMTP_FROM || 'UniMate <no-reply@unimate.local>',

  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES || 10),
  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),

  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || 'materials',
};