const nodemailer = require('nodemailer');

// Load SMTP config from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email alert for a critical risk student to the parent's email.
 * @param {Object} parent - Parent user object (must contain email).
 * @param {Object} student - Student object (used for name in email).
 * @param {Object} riskProfile - RiskProfile document.
 */
async function sendCriticalRiskEmail(parent, student, riskProfile) {
  const recipient = parent?.email || student?.email;
  if (!recipient) {
    console.warn('No email found for parent or student, cannot send alert');
    return;
  }
  const mailOptions = {
    from: process.env.ALERT_FROM || 'alerts@ndugu.academy',
    to: recipient,
    subject: '⚠️ Critical Risk Alert for Your Child',
    text: `Dear ${parent?.name || 'Parent'},\n\n` +
      `Our system has identified that ${student?.name || 'your child'} is at *critical* risk of academic difficulty.\n` +
      `Risk Score: ${riskProfile.riskScore}\n` +
      `Factors: Attendance Drop ${riskProfile.factors.attendanceDrop}%, ` +
      `Missing Assignments ${riskProfile.factors.missingAssignments}, ` +
      `Low Quiz Scores ${riskProfile.factors.lowQuizScores}.\n\n` +
      `Please log into the Ndugu Academy portal to review details and schedule an intervention meeting.\n\n` +
      `Thank you,\nNdugu Academy Team`,
    html: `<p>Dear ${parent?.name || 'Parent'},</p>` +
      `<p>Our system has identified that ${student?.name || 'your child'} is at <strong>critical</strong> risk of academic difficulty.</p>` +
      `<ul>` +
      `<li>Risk Score: ${riskProfile.riskScore}</li>` +
      `<li>Attendance Drop: ${riskProfile.factors.attendanceDrop}%</li>` +
      `<li>Missing Assignments: ${riskProfile.factors.missingAssignments}</li>` +
      `<li>Low Quiz Scores: ${riskProfile.factors.lowQuizScores}</li>` +
      `</ul>` +
      `<p>Please <a href="${process.env.FRONTEND_URL || 'https://ndugu.academy'}">log into the portal</a> to review details and schedule an intervention meeting.</p>` +
      `<p>Thank you,<br/>Ndugu Academy Team</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Critical risk email sent to ${recipient}`);
  } catch (err) {
    console.error('Failed to send critical risk email:', err);
  }
}

module.exports = { sendCriticalRiskEmail };
