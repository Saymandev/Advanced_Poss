import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ example: 'System is under maintenance' })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  defaultCompanySettings?: {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    language?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  security?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    maxAttempts?: number;
    lockoutDuration?: number;
  };

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rateLimiting?: {
    enabled?: boolean;
    windowMs?: number;
    max?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  email?: {
    enabled?: boolean;
    provider?: 'smtp' | 'sendgrid' | 'ses';
    fromEmail?: string;
    fromName?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    apiKey?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sms?: {
    enabled?: boolean;
    provider?: 'twilio' | 'aws-sns';
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    apiKey?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  backup?: {
    enabled?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    retentionDays?: number;
    autoCleanup?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: {
    enableNewRegistrations?: boolean;
    requireEmailVerification?: boolean;
    enableTwoFactor?: boolean;
  };
}

