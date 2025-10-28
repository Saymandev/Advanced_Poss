import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailConfig = this.configService.get('email');
    
    if (emailConfig?.host && emailConfig?.user && emailConfig?.password) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port || 587,
        secure: emailConfig.port === 465,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });

      this.logger.log('Email service initialized');
    } else {
      this.logger.warn('Email configuration not found. Email service disabled.');
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Email not sent.');
      this.logger.log(`Would send email to ${to}: ${subject}`);
      return false;
    }

    try {
      const emailConfig = this.configService.get('email');
      await this.transporter.sendMail({
        from: emailConfig?.from || 'noreply@restaurantpos.com',
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendTrialExpiryReminder(
    email: string,
    ownerName: string,
    companyName: string,
    timeLeft: string,
    planName: string,
  ): Promise<boolean> {
    const timeLeftText = timeLeft === '24h' ? '24 hours' : '1 hour';
    const subject = `⚠️ Trial Expiring Soon - ${companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Trial Expiring Soon</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p>Dear ${ownerName}},</p>
          
          <p>Your <strong>${planName}</strong> trial period for <strong>${companyName}</strong> will expire in <strong style="color: #e74c3c;">${timeLeftText}</strong>.</p>
          
          <div style="background: #fff; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>What happens next?</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Your account will be locked after trial expires</li>
              <li>All data will be preserved</li>
              <li>You can upgrade anytime to continue</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('frontend.url')}/dashboard/subscriptions" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Upgrade Now
            </a>
          </div>
          
          <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Upgrade Options:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Premium Plan:</strong> ৳2,500/month - Full features, 10 users, 5 branches</li>
              <li><strong>Enterprise Plan:</strong> ৳5,000/month - All features, unlimited users/branches</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br><strong>RestaurantPOS Team</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  async sendAccountExpiredNotification(
    email: string,
    ownerName: string,
    companyName: string,
  ): Promise<boolean> {
    const subject = `❌ Account Expired - ${companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Account Expired</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p>Dear ${ownerName},</p>
          
          <p>Your trial period for <strong>${companyName}</strong> has expired, and your account has been temporarily locked.</p>
          
          <div style="background: #fff; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Don't worry!</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>All your data is safe and preserved</li>
              <li>Simply upgrade to reactivate your account</li>
              <li>No setup required - instant activation</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('frontend.url')}/dashboard/subscriptions" 
               style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reactivate Account
            </a>
          </div>
          
          <div style="background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Choose a Plan:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Premium Plan:</strong> ৳2,500/month - Full features</li>
              <li><strong>Enterprise Plan:</strong> ৳5,000/month - All features, unlimited</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">If you need assistance, our support team is here to help.</p>
          
          <p>Best regards,<br><strong>RestaurantPOS Team</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}

