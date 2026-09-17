const axios = require('axios');
require('dotenv').config();

const AFRIKAS_TALKING_API_KEY = process.env.AFRIKAS_TALKING_API_KEY || '';
const AFRIKAS_TALKING_USERNAME = process.env.AFRIKAS_TALKING_USERNAME || 'sandbox';

class SMSService {
  // Send SMS via AfrikasTalking
  static async sendSMS(phoneNumbers, message) {
    if (!AFRIKAS_TALKING_API_KEY) {
      console.warn('⚠️ AfrikasTalking API key not configured. SMS not sent.');
      return { success: false, error: 'API key not configured' };
    }

    try {
      const phones = Array.isArray(phoneNumbers) ? phoneNumbers.join(',') : phoneNumbers;
      
      const response = await axios.post(
        'https://api.sandbox.africastalking.com/version1/messaging',
        {
          username: AFRIKAS_TALKING_USERNAME,
          message: message,
          recipients: phones
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'apiKey': AFRIKAS_TALKING_API_KEY
          }
        }
      );

      console.log(`✅ SMS sent to ${phones}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ SMS send error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Send payment reminder SMS
  static async sendPaymentReminder(phoneNumber, studentName, dueDate, amount) {
    const formattedDate = new Date(dueDate).toLocaleDateString();
    const formattedAmount = amount.toLocaleString();
    
    const message = `Hi, this is a reminder: ${studentName}'s school fees (UGX ${formattedAmount}) are due on ${formattedDate}. Please arrange payment. Contact the school for more details.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  // Send payment confirmation SMS
  static async sendPaymentConfirmation(phoneNumber, studentName, receiptNumber, amount) {
    const formattedAmount = amount.toLocaleString();
    
    const message = `Payment received! Receipt: ${receiptNumber}. Amount: UGX ${formattedAmount}. Thank you for paying ${studentName}'s school fees.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  // Send payment plan notification
  static async sendPaymentPlanNotification(phoneNumber, studentName, installments) {
    const message = `Hi, ${studentName}'s fees have been split into ${installments} payments. You'll receive reminders before each due date.`;
    
    return this.sendSMS(phoneNumber, message);
  }
}

module.exports = SMSService;
