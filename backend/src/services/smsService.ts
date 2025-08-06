import twilio from 'twilio';
import { logger } from '../utils/logger';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to: string, message: string) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    logger.info(`SMS sent: ${result.sid}`);
    return result;
  } catch (error) {
    logger.error('SMS sending failed:', error);
    throw error;
  }
}; 