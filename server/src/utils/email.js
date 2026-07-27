// utils/email.js
// Simple email service using Nodemailer. Configuration via environment variables.
// Expected env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

const nodemailer = require('nodemailer');

// Create transporter once; reuse for all sends.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML body of the email.
 * @returns {Promise} resolves when email is sent.
 */
function sendMail(to, subject, html) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Send a risk alert email to a parent.
 * @param {string} parentEmail - Parent's email address.
 * @param {string} studentName - Name of the student.
 * @param {number} riskScore - Calculated risk score.
 */
async function sendRiskAlert(parentEmail, studentName, riskScore) {
  const subject = `Risk Alert: ${studentName}`;
  const html = `<p>Dear Parent,</p>
    <p>We have detected a <strong>critical</strong> risk level for your child <strong>${studentName}</strong> with a score of <strong>${riskScore}</strong>.</p>
    <p>Please contact the school administration for further details.</p>
    <p>Regards,<br/>School Management System</p>`;
  await sendMail(parentEmail, subject, html);
}

module.exports = {
  sendMail,
  sendRiskAlert,
};
