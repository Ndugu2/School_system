// Africa's Talking SMS Integration Service for Ndugu Portal

const sendSMS = async (to, message) => {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  const environment = process.env.AT_ENVIRONMENT || 'sandbox';

  // Format phone number (ensure +256 prefix for Uganda if starts with 0)
  let formattedPhone = to.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+256' + formattedPhone.substring(1);
  }

  if (!/^\+256\d{9}$/.test(formattedPhone)) {
    throw new Error('SMS recipient must be a valid Ugandan phone number');
  }
  if (!apiKey || !username) {
    throw new Error('Africa’s Talking SMS credentials are not configured');
  }
  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('AT_ENVIRONMENT must be sandbox or production');
  }

  if (environment === 'sandbox') {
    console.info(`[SMS-SERVICE] Sandbox mode; message to ${formattedPhone} was not delivered.`);
    return { success: false, status: 'sandbox-not-delivered' };
  }

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: apiKey,
    },
    body: new URLSearchParams({ username, to: formattedPhone, message }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Africa’s Talking rejected the SMS request (${response.status})`);
  }
  const recipients = data.SMSMessageData?.Recipients || [];
  if (!recipients.some(recipient => recipient.statusCode === 101 || recipient.status === 'Success')) {
    throw new Error('Africa’s Talking did not accept the SMS for delivery');
  }
  return { success: true, status: 'accepted', data };
};

module.exports = { sendSMS };
