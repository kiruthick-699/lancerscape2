import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Check if email configuration is available
const isEmailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!isEmailConfigured || !transporter) {
      // Demo mode - just log the email
      logger.info(`[DEMO MODE] Email would be sent to ${to}: ${subject}`);
      logger.info(`[DEMO MODE] Email content: ${html.substring(0, 200)}...`);
      return { messageId: 'demo-' + Date.now() };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@lancerscape2.com',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    // In demo mode, don't throw error
    if (!isEmailConfigured) {
      logger.info(`[DEMO MODE] Email sending failed but continuing: ${error}`);
      return { messageId: 'demo-error-' + Date.now() };
    }
    throw error;
  }
}; 