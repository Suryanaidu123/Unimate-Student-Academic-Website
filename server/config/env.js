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

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'UniMate <no-reply@unimate.local>',

  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES || 10),
  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),
};