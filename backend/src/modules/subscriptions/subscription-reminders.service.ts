import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class SubscriptionRemindersService {
  private readonly logger = new Logger(SubscriptionRemindersService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Run every hour to check for expiring subscriptions
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringSubscriptions() {
    this.logger.log('Checking for expiring subscriptions...');

    try {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Find companies with trials expiring in 24 hours
      const companiesExpiringIn24h = await this.companyModel.find({
        subscriptionStatus: 'trial',
        trialEndDate: {
          $gte: now,
          $lte: oneDayFromNow,
        },
      }).populate('ownerId', 'email firstName lastName');

      // Find companies with trials expiring in 1 hour
      const companiesExpiringIn1h = await this.companyModel.find({
        subscriptionStatus: 'trial',
        trialEndDate: {
          $gte: now,
          $lte: oneHourFromNow,
        },
      }).populate('ownerId', 'email firstName lastName');

      // Send 24-hour reminders
      for (const company of companiesExpiringIn24h) {
        await this.sendTrialExpiryReminder(company, '24h');
      }

      // Send 1-hour reminders
      for (const company of companiesExpiringIn1h) {
        await this.sendTrialExpiryReminder(company, '1h');
      }

      this.logger.log(`Processed ${companiesExpiringIn24h.length} 24h reminders and ${companiesExpiringIn1h.length} 1h reminders`);
    } catch (error) {
      this.logger.error('Error checking expiring subscriptions:', error);
    }
  }

  // Run every 5 minutes to check for expired subscriptions
  @Cron('*/5 * * * *')
  async checkExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');

    try {
      const now = new Date();

      // Find companies with expired trials
      const expiredCompanies = await this.companyModel.find({
        subscriptionStatus: 'trial',
        trialEndDate: {
          $lt: now,
        },
      });

      // Lock expired accounts
      for (const company of expiredCompanies) {
        await this.lockExpiredAccount(company);
      }

      if (expiredCompanies.length > 0) {
        this.logger.log(`Locked ${expiredCompanies.length} expired accounts`);
      }
    } catch (error) {
      this.logger.error('Error checking expired subscriptions:', error);
    }
  }

  private async sendTrialExpiryReminder(company: any, timeLeft: string) {
    try {
      const owner = company.ownerId;
      if (!owner || !owner.email) {
        this.logger.warn(`No owner email found for company ${company._id}`);
        return;
      }

      const timeLeftText = timeLeft === '24h' ? '24 hours' : '1 hour';
      const subject = `Trial Expiring Soon - ${company.name}`;
      
      const message = `
        Dear ${owner.firstName} ${owner.lastName},
        
        Your trial period for ${company.name} will expire in ${timeLeftText}.
        
        To continue using our services, please upgrade to a paid plan:
        - Premium Plan: ৳2,500/month
        - Enterprise Plan: ৳5,000/month
        
        Upgrade now to avoid service interruption.
        
        Best regards,
        RestaurantPOS Team
      `;

      // TODO: Implement actual email sending
      // For now, just log the reminder
      this.logger.log(`Trial expiry reminder sent to ${owner.email} for company ${company.name} (${timeLeft} left)`);
      
      // In production, you would use an email service like SendGrid, AWS SES, etc.
      // await this.emailService.sendEmail(owner.email, subject, message);

    } catch (error) {
      this.logger.error(`Error sending trial expiry reminder for company ${company._id}:`, error);
    }
  }

  private async lockExpiredAccount(company: any) {
    try {
      // Update company status to expired
      await this.companyModel.findByIdAndUpdate(company._id, {
        subscriptionStatus: 'expired',
      });

      // Lock all users in this company
      await this.userModel.updateMany(
        { companyId: company._id },
        { isActive: false }
      );

      this.logger.log(`Account locked for company ${company.name} (${company._id})`);

      // Send expiry notification
      const owner = await this.userModel.findById(company.ownerId);
      if (owner && owner.email) {
        await this.sendAccountExpiredNotification(owner.email, company.name);
      }

    } catch (error) {
      this.logger.error(`Error locking expired account for company ${company._id}:`, error);
    }
  }

  private async sendAccountExpiredNotification(email: string, companyName: string) {
    try {
      const subject = `Account Expired - ${companyName}`;
      const message = `
        Dear Customer,
        
        Your trial period for ${companyName} has expired.
        
        Your account has been temporarily locked. To reactivate your account, please:
        1. Upgrade to a paid plan
        2. Complete the payment process
        3. Your account will be automatically reactivated
        
        Available plans:
        - Premium Plan: ৳2,500/month
        - Enterprise Plan: ৳5,000/month
        
        If you have any questions, please contact our support team.
        
        Best regards,
        RestaurantPOS Team
      `;

      // TODO: Implement actual email sending
      this.logger.log(`Account expired notification sent to ${email} for company ${companyName}`);

    } catch (error) {
      this.logger.error(`Error sending account expired notification to ${email}:`, error);
    }
  }

  // Manual method to check specific company
  async checkCompanySubscription(companyId: string) {
    try {
      const company = await this.companyModel.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const now = new Date();
      const isExpired = company.trialEndDate && company.trialEndDate < now;
      const isExpiringSoon = company.trialEndDate && 
        company.trialEndDate > now && 
        company.trialEndDate < new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return {
        companyId: company._id,
        companyName: company.name,
        subscriptionStatus: company.subscriptionStatus,
        trialEndDate: company.trialEndDate,
        isExpired,
        isExpiringSoon,
        timeLeft: company.trialEndDate ? 
          Math.max(0, company.trialEndDate.getTime() - now.getTime()) : 0,
      };
    } catch (error) {
      this.logger.error(`Error checking company subscription ${companyId}:`, error);
      throw error;
    }
  }
}
