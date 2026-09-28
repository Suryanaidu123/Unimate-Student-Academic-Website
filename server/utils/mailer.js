const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      const t = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
      logger.info('✉️  Mailer: using SMTP', env.SMTP_HOST);
      return t;
    }

    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info('✉️  Mailer: using Ethereal test inbox');
    logger.info('    Ethereal user:', testAccount.user);
    return t;
  })();

  return transporterPromise;
}

async function sendMail({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) logger.info('📬 Preview email:', preview);
  return info;
}

module.exports = { sendMail };