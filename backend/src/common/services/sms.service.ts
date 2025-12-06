import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let twilio: any;
try {
  twilio = require('twilio');
} catch (error) {
  // Twilio not installed - will be handled gracefully
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;
  private isEnabled = false;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const smsConfig = this.configService.get('sms');
    const systemSettings = this.configService.get('systemSettings');

    // Check if SMS is enabled in system settings
    const smsEnabled = systemSettings?.sms?.enabled || smsConfig?.enabled || false;
    
    if (!smsEnabled) {
      this.logger.warn('SMS service is disabled in system settings');
      return;
    }

    const provider = systemSettings?.sms?.provider || smsConfig?.provider || 'twilio';
    const accountSid = systemSettings?.sms?.accountSid || smsConfig?.accountSid;
    const authToken = systemSettings?.sms?.authToken || smsConfig?.authToken;
    const fromNumber = systemSettings?.sms?.fromNumber || smsConfig?.fromNumber;

    if (provider === 'twilio') {
      if (!twilio) {
        this.logger.warn('Twilio package not installed. Run: npm install twilio');
        return;
      }
      if (accountSid && authToken) {
        try {
          this.twilioClient = twilio(accountSid, authToken);
          this.isEnabled = true;
          this.logger.log('SMS service initialized with Twilio');
        } catch (error) {
          this.logger.error('Failed to initialize Twilio client:', error);
        }
      } else {
        this.logger.warn('Twilio credentials not found. SMS service disabled.');
      }
    } else if (provider === 'aws-sns') {
      // AWS SNS implementation would go here
      this.logger.warn('AWS SNS provider not yet implemented');
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.isEnabled || !this.twilioClient) {
      this.logger.warn('SMS service not configured. SMS not sent.');
      this.logger.log(`Would send SMS to ${to}: ${message.substring(0, 50)}...`);
      return false;
    }

    const smsConfig = this.configService.get('sms');
    const systemSettings = this.configService.get('systemSettings');
    const fromNumber = systemSettings?.sms?.fromNumber || smsConfig?.fromNumber;

    if (!fromNumber) {
      this.logger.error('SMS from number not configured');
      return false;
    }

    try {
      // Validate phone number format (basic check)
      const cleanedNumber = this.cleanPhoneNumber(to);
      if (!cleanedNumber) {
        this.logger.error(`Invalid phone number format: ${to}`);
        return false;
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: cleanedNumber,
      });

      this.logger.log(`SMS sent successfully to ${cleanedNumber} (SID: ${result.sid})`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${to}:`, error.message || error);
      return false;
    }
  }

  async sendBulkSms(recipients: string[], message: string): Promise<{
    sent: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    // Rate limiting: Send max 10 SMS per second to avoid Twilio rate limits
    const batchSize = 10;
    const delayBetweenBatches = 1100; // 1.1 seconds

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (phone) => {
        try {
          const success = await this.sendSms(phone, message);
          if (success) {
            sent++;
          } else {
            failed++;
          }
          results.push({ phone, success });
        } catch (error: any) {
          failed++;
          results.push({ phone, success: false, error: error.message || 'Unknown error' });
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

  private cleanPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it doesn't start with +, assume it's a local number and add country code
    // Default to +1 (US/Canada) if no country code detected
    if (!cleaned.startsWith('+')) {
      // You might want to make this configurable per company
      cleaned = '+1' + cleaned;
    }

    // Basic validation: should be between 10-15 digits after +
    const digitsOnly = cleaned.replace('+', '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return null;
    }

    return cleaned;
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}

