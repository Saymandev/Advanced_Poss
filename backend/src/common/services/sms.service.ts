import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { URLSearchParams } from 'url';
import { SystemSettings, SystemSettingsDocument } from '../../modules/settings/schemas/system-settings.schema';

let twilio: any;
try {
  twilio = require('twilio');
} catch (error) {
  // Twilio not installed - will be handled gracefully
}

type SmsProvider = 'twilio' | 'bulksmsbd' | 'aws-sns';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;
  private isEnabled = false;
  private provider: SmsProvider = 'twilio';

  constructor(
    private configService: ConfigService,
    @InjectModel(SystemSettings.name)
    private systemSettingsModel: Model<SystemSettingsDocument>,
  ) {
    this.initialize();
  }

  private initialize() {
    const smsConfig = this.configService.get('sms');
    const systemSettings = this.configService.get('systemSettings');

    // Check if SMS is enabled in system settings or config
    const smsEnabled = systemSettings?.sms?.enabled ?? smsConfig?.enabled ?? false;
    if (!smsEnabled) {
      this.logger.warn('SMS service is disabled in system settings');
      return;
    }

    this.provider = (systemSettings?.sms?.provider || smsConfig?.provider || 'twilio') as SmsProvider;

    if (this.provider === 'twilio') {
      const accountSid = systemSettings?.sms?.accountSid || smsConfig?.accountSid;
      const authToken = systemSettings?.sms?.authToken || smsConfig?.authToken;
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
    } else if (this.provider === 'bulksmsbd') {
      const apiKey = systemSettings?.sms?.apiKey || smsConfig?.apiKey;
      const senderId = systemSettings?.sms?.senderId || smsConfig?.senderId;
      if (!apiKey || !senderId) {
        this.logger.warn('BulkSMSBD credentials not found. SMS service disabled.');
        return;
      }
      this.isEnabled = true; // We validate on send
      this.logger.log('SMS service configured for bulksmsbd.net');
    } else if (this.provider === 'aws-sns') {
      // Not implemented yet; keep disabled but log
      this.logger.warn('AWS SNS provider not yet implemented');
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    // Check if SMS is enabled dynamically from database
    const smsEnabled = await this.isServiceEnabled();
    if (!smsEnabled) {
      this.logger.warn('SMS service not enabled. SMS not sent.');
      this.logger.log(`Would send SMS to ${to}: ${message.substring(0, 120)}...`);
      return false;
    }

    // Basic phone validation
    const cleanedNumber = this.cleanPhoneNumber(to);
    if (!cleanedNumber) {
      this.logger.error(`Invalid phone number format: ${to}`);
      return false;
    }

    // Get system settings from database dynamically
    const settings = await this.systemSettingsModel.findOne().lean().exec();
    const smsConfig = this.configService.get('sms');
    const systemSettings = settings?.sms || smsConfig;
    const provider = (settings?.sms?.provider || smsConfig?.provider || 'twilio') as SmsProvider;

    if (provider === 'twilio') {
      const fromNumber = systemSettings?.fromNumber || smsConfig?.fromNumber;
      if (!fromNumber) {
        this.logger.error('SMS from number not configured for Twilio');
        return false;
      }
      if (!this.twilioClient) {
        this.logger.warn('Twilio client not initialized');
        return false;
      }
      try {
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

    if (provider === 'bulksmsbd') {
      const apiKey = systemSettings?.apiKey || smsConfig?.apiKey;
      const senderId = systemSettings?.senderId || smsConfig?.senderId;
      const endpoint = systemSettings?.endpoint || smsConfig?.endpoint || 'https://bulksmsbd.net/api/smsapi';
      if (!apiKey || !senderId) {
        this.logger.error('BulkSMSBD apiKey or senderId missing');
        return false;
      }

      try {
        const body = new URLSearchParams();
        body.append('api_key', apiKey);
        body.append('senderid', senderId);
        body.append('number', cleanedNumber);
        body.append('message', message);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(`BulkSMSBD request failed (${response.status}): ${text}`);
          return false;
        }

        const data = await response.json().catch(() => ({}));
        const status = data?.response_code || data?.status || response.status;
        if (status === 200 || status === '200' || status === 'SUCCESS' || data?.success) {
          this.logger.log(`SMS sent successfully to ${cleanedNumber} via bulksmsbd`);
          return true;
        }

        this.logger.error(`BulkSMSBD error for ${cleanedNumber}: ${JSON.stringify(data)}`);
        return false;
      } catch (error: any) {
        this.logger.error(`Failed to send SMS to ${to} via bulksmsbd:`, error.message || error);
        return false;
      }
    }

    // Fallback for unsupported provider
    this.logger.warn(`SMS provider "${provider}" not supported. SMS not sent.`);
    return false;
  }

  async sendBulkSms(recipients: string[], message: string): Promise<{
    sent: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    // Rate limiting: Send max 10 SMS per second to avoid provider rate limits
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

    // If it doesn't start with +, assume local number. Default to +880 (BD) if configured, else +1.
    if (!cleaned.startsWith('+')) {
      const defaultCountry = this.configService.get('sms.defaultCountry') || 'BD';
      if (defaultCountry === 'BD') {
        // Normalize Bangladeshi numbers
        if (cleaned.startsWith('0')) {
          cleaned = cleaned.slice(1);
        }
        cleaned = '+880' + cleaned;
      } else {
        cleaned = '+1' + cleaned;
      }
    }

    // Basic validation: should be between 10-15 digits after +
    const digitsOnly = cleaned.replace('+', '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return null;
    }

    return cleaned;
  }

  /**
   * Check if SMS service is enabled by checking system settings dynamically
   */
  async isServiceEnabled(): Promise<boolean> {
    try {
      const settings = await this.systemSettingsModel.findOne().lean().exec();
      if (!settings || !settings.sms?.enabled) {
        return false;
      }

      // Check if provider has required credentials
      const provider = settings.sms?.provider || 'twilio';
      if (provider === 'bulksmsbd') {
        return !!(settings.sms?.apiKey && settings.sms?.senderId);
      } else if (provider === 'twilio') {
        return !!(settings.sms?.accountSid && settings.sms?.authToken);
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error checking SMS service status:', error);
      // Fallback to initialization status
      return this.isEnabled;
    }
  }

  /**
   * Synchronous check (uses cached initialization status)
   * For backward compatibility
   */
  isServiceEnabledSync(): boolean {
    return this.isEnabled;
  }
}

