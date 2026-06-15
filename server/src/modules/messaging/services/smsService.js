// Africa's Talking SMS Integration Service for Ndugu Portal

const sendSMS = async (to, message) => {
  const apiKey = process.env.AT_API_KEY || 'sandbox';
  const username = process.env.AT_USERNAME || 'sandbox';

  // Format phone number (ensure +256 prefix for Uganda if starts with 0)
  let formattedPhone = to.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+256' + formattedPhone.substring(1);
  }

  console.log(`[SMS-SERVICE] Sending SMS to ${formattedPhone} via Africa's Talking...`);
  console.log(`[SMS-SERVICE] Message: "${message}"`);

  // In development / sandbox mode, we log to console.
  // If API credentials are set, we execute a POST request to Africa's Talking API.
  if (apiKey === 'sandbox' || username === 'sandbox') {
    return { success: true, status: 'sandbox-logged', info: 'Simulated Africa\'s Talking SMS delivery success.' };
  }

  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': apiKey
      },
      body: new URLSearchParams({
        username: username,
        to: formattedPhone,
        message: message
      })
    });

    const data = await response.json();
    console.log('[SMS-SERVICE] Africa\'s Talking API Response:', data);
    return data;
  } catch (err) {
    console.error('[SMS-SERVICE] Failed to send SMS:', err.message);
    throw err;
  }
};

module.exports = { sendSMS };
