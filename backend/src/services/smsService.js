const axios = require('axios');
require('dotenv').config();

class SMSService {
  // Send SMS via AfrikasTalking
  static async sendSMS(phoneNumbers, message) {
    const apiKey = process.env.AT_API_KEY || process.env.AFRIKAS_TALKING_API_KEY;
    const username = process.env.AT_USERNAME || process.env.AFRIKAS_TALKING_USERNAME;
    const environment = process.env.AT_ENVIRONMENT || 'sandbox';
    if (!apiKey || !username) {
      throw new Error('Africa’s Talking SMS credentials are not configured');
    }
    if (!['sandbox', 'production'].includes(environment)) throw new Error('AT_ENVIRONMENT must be sandbox or production');
    if (environment === 'sandbox') {
      console.info('[SMS-SERVICE] Sandbox mode; message was not delivered.');
      return { success: false, status: 'sandbox-not-delivered' };
    }

    const phones = (Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers])
      .map(phone => phone.trim().startsWith('0') ? `+256${phone.trim().slice(1)}` : phone.trim());
    const response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      new URLSearchParams({ username, to: phones.join(','), message }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          apikey: apiKey,
        },
      }
    );
    const recipients = response.data.SMSMessageData?.Recipients || [];
    if (!recipients.some(recipient => recipient.statusCode === 101 || recipient.status === 'Success')) {
      throw new Error('Africa’s Talking did not accept the SMS for delivery');
    }
    return { success: true, status: 'accepted', data: response.data };
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
