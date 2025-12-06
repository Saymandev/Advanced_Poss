import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../../modules/subscriptions/schemas/subscription-plan.schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(SubscriptionPlan.name)
    private subscriptionPlanModel?: Model<SubscriptionPlanDocument>,
  ) {
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
    
    // Fetch actual subscription plans for pricing
    let upgradeOptionsHtml = '';
    try {
      if (this.subscriptionPlanModel) {
        const plans = await this.subscriptionPlanModel
          .find({ isActive: true, price: { $gt: 0 } })
          .sort({ sortOrder: 1 })
          .limit(3)
          .lean()
          .exec();

        if (plans.length > 0) {
          upgradeOptionsHtml = plans.map((plan: any) => {
            const currency = plan.currency || 'BDT';
            const currencySymbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : currency;
            const price = plan.price.toLocaleString();
            const billingCycle = plan.billingCycle === 'monthly' ? '/month' : '/year';
            const maxUsers = plan.features?.maxUsers === -1 ? 'unlimited' : plan.features?.maxUsers || 'N/A';
            const maxBranches = plan.features?.maxBranches === -1 ? 'unlimited' : plan.features?.maxBranches || 'N/A';
            
            return `<li><strong>${plan.displayName || plan.name}:</strong> ${currencySymbol}${price}${billingCycle} - ${plan.description || ''} (${maxUsers} users, ${maxBranches} branches)</li>`;
          }).join('');
        }
      }
    } catch (error) {
      this.logger.warn('Failed to fetch subscription plans for email template:', error);
      // Fallback to default options
      upgradeOptionsHtml = `
        <li><strong>Premium Plan:</strong> Contact us for pricing - Full features, 10 users, 5 branches</li>
        <li><strong>Enterprise Plan:</strong> Contact us for pricing - All features, unlimited users/branches</li>
      `;
    }

    if (!upgradeOptionsHtml) {
      upgradeOptionsHtml = `
        <li><strong>Premium Plan:</strong> Contact us for pricing - Full features, 10 users, 5 branches</li>
        <li><strong>Enterprise Plan:</strong> Contact us for pricing - All features, unlimited users/branches</li>
      `;
    }
    
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
          <p>Dear ${ownerName},</p>
          
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
              ${upgradeOptionsHtml}
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
    
    // Fetch actual subscription plans for pricing
    let upgradeOptionsHtml = '';
    try {
      if (this.subscriptionPlanModel) {
        const plans = await this.subscriptionPlanModel
          .find({ isActive: true, price: { $gt: 0 } })
          .sort({ sortOrder: 1 })
          .limit(3)
          .lean()
          .exec();

        if (plans.length > 0) {
          upgradeOptionsHtml = plans.map((plan: any) => {
            const currency = plan.currency || 'BDT';
            const currencySymbol = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : currency;
            const price = plan.price.toLocaleString();
            const billingCycle = plan.billingCycle === 'monthly' ? '/month' : '/year';
            const maxUsers = plan.features?.maxUsers === -1 ? 'unlimited' : plan.features?.maxUsers || 'N/A';
            const maxBranches = plan.features?.maxBranches === -1 ? 'unlimited' : plan.features?.maxBranches || 'N/A';
            
            return `<li><strong>${plan.displayName || plan.name}:</strong> ${currencySymbol}${price}${billingCycle} - ${plan.description || ''} (${maxUsers} users, ${maxBranches} branches)</li>`;
          }).join('');
        }
      }
    } catch (error) {
      this.logger.warn('Failed to fetch subscription plans for email template:', error);
      // Fallback to default options
      upgradeOptionsHtml = `
        <li><strong>Premium Plan:</strong> Contact us for pricing - Full features</li>
        <li><strong>Enterprise Plan:</strong> Contact us for pricing - All features, unlimited</li>
      `;
    }

    if (!upgradeOptionsHtml) {
      upgradeOptionsHtml = `
        <li><strong>Premium Plan:</strong> Contact us for pricing - Full features</li>
        <li><strong>Enterprise Plan:</strong> Contact us for pricing - All features, unlimited</li>
      `;
    }
    
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
              ${upgradeOptionsHtml}
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

  async sendMarketingEmail(
    to: string,
    subject: string,
    message: string,
    companyName?: string,
    unsubscribeUrl?: string,
  ): Promise<boolean> {
    const html = this.generateMarketingEmailTemplate(
      message,
      companyName,
      unsubscribeUrl,
    );
    return await this.sendEmail(to, subject, html);
  }

  async sendBulkMarketingEmails(
    recipients: Array<{ email: string; name?: string }>,
    subject: string,
    message: string,
    companyName?: string,
    unsubscribeUrl?: string,
  ): Promise<{
    sent: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    // Rate limiting: Send max 5 emails per second to avoid being marked as spam
    const batchSize = 5;
    const delayBetweenBatches = 1200; // 1.2 seconds

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const personalizedMessage = recipient.name
            ? message.replace(/\{name\}/g, recipient.name)
            : message;
          const success = await this.sendMarketingEmail(
            recipient.email,
            subject,
            personalizedMessage,
            companyName,
            unsubscribeUrl,
          );
          if (success) {
            sent++;
          } else {
            failed++;
          }
          results.push({ email: recipient.email, success });
        } catch (error: any) {
          failed++;
          results.push({
            email: recipient.email,
            success: false,
            error: error.message || 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);

      // Wait before next batch (except for the last batch)
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return { sent, failed, results };
  }

  private generateMarketingEmailTemplate(
    message: string,
    companyName?: string,
    unsubscribeUrl?: string,
  ): string {
    const frontendUrl = this.configService.get('frontend.url');
    const appName = companyName || 'Restaurant POS';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marketing Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${appName}</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <!-- Footer -->
          <div style="background: #f9f9f9; padding: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0 0 10px 0;">
              This email was sent by ${appName}
            </p>
            ${unsubscribeUrl ? `
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            ` : ''}
            <p style="margin: 10px 0 0 0; color: #999;">
              © ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    firstName?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get('frontend.url');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const name = firstName || 'User';

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
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <p>Dear ${name},</p>
          
          <p>Thank you for registering with RestaurantPOS! Please verify your email address to complete your registration.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #667eea; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
          
          <div style="background: #fff; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          </div>
          
          <p style="margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
          
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

