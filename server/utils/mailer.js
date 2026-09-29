const env = require('../config/env');
const logger = require('./logger');

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing in .env');
  }

  // Extract the email address from "Name <email>" format
  const senderEmail = env.SMTP_FROM.match(/<(.+)>/)?.[1] || env.SMTP_FROM;
  const senderName = env.SMTP_FROM.split('<')[0].trim() || 'UniMate';

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Brevo API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Email sent via Brevo API:', data.messageId);
    return data;
  } catch (error) {
    logger.error('Brevo API error:', error.message);
    throw error;
  }
}

module.exports = { sendMail };