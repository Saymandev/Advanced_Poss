import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

@Schema({ timestamps: true })
export class SystemSettings {
  @Prop({ default: false })
  maintenanceMode: boolean;

  @Prop({ default: 'System is under maintenance. Please try again later.' })
  maintenanceMessage: string;

  @Prop({
    type: {
      currency: { type: String, default: 'BDT' },
      timezone: { type: String, default: 'Asia/Dhaka' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
      language: { type: String, default: 'en' },
    },
    default: {
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      language: 'en',
    },
  })
  defaultCompanySettings: {
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
  };

  @Prop({
    type: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: false },
      maxAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 30 }, // minutes
    },
    default: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAttempts: 5,
      lockoutDuration: 30,
    },
  })
  security: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAttempts: number;
    lockoutDuration: number;
  };

  @Prop({ default: 60 }) // minutes
  sessionTimeout: number;

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      windowMs: { type: Number, default: 60000 }, // 1 minute
      max: { type: Number, default: 100 }, // requests per window
    },
    default: {
      enabled: true,
      windowMs: 60000,
      max: 100,
    },
  })
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ['smtp', 'sendgrid', 'ses'], default: 'smtp' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: 'Restaurant POS' },
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPassword: { type: String, default: '' },
      apiKey: { type: String, default: '' },
    },
    default: {
      enabled: false,
      provider: 'smtp',
      fromEmail: '',
      fromName: 'Restaurant POS',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      apiKey: '',
    },
  })
  email: {
    enabled: boolean;
    provider: 'smtp' | 'sendgrid' | 'ses';
    fromEmail: string;
    fromName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    apiKey: string;
  };

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ['twilio', 'aws-sns'], default: 'twilio' },
      accountSid: { type: String, default: '' },
      authToken: { type: String, default: '' },
      fromNumber: { type: String, default: '' },
      apiKey: { type: String, default: '' },
    },
    default: {
      enabled: false,
      provider: 'twilio',
      accountSid: '',
      authToken: '',
      fromNumber: '',
      apiKey: '',
    },
  })
  sms: {
    enabled: boolean;
    provider: 'twilio' | 'aws-sns';
    accountSid: string;
    authToken: string;
    fromNumber: string;
    apiKey: string;
  };

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
      retentionDays: { type: Number, default: 30 },
      autoCleanup: { type: Boolean, default: true },
    },
    default: {
      enabled: true,
      frequency: 'daily',
      retentionDays: 30,
      autoCleanup: true,
    },
  })
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    autoCleanup: boolean;
  };

  @Prop({
    type: {
      enableNewRegistrations: { type: Boolean, default: true },
      requireEmailVerification: { type: Boolean, default: true },
      enableTwoFactor: { type: Boolean, default: false },
    },
    default: {
      enableNewRegistrations: true,
      requireEmailVerification: true,
      enableTwoFactor: false,
    },
  })
  features: {
    enableNewRegistrations: boolean;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
  };
}

export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);

// Remove MongoDB internal fields when converting to JSON
SystemSettingsSchema.set('toJSON', {
  virtuals: false,
  transform: (_, ret) => {
    const result = ret as any;
    // Remove MongoDB internal fields
    delete result._id;
    delete result.__v;
    delete result.createdAt;
    delete result.updatedAt;
    return result;
  },
});

