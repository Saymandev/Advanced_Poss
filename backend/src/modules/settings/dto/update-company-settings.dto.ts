import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString, IsNumber, Min, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderTypeSettingDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsBoolean()
  enabled: boolean;
}

class PosSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showStock?: boolean;

  @ApiPropertyOptional({ example: [{ type: 'dine-in', enabled: true }] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderTypeSettingDto)
  orderTypes?: OrderTypeSettingDto[];
}

class NotificationsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

class FeaturesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inventory?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  kitchen?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reports?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  analytics?: boolean;
}

class ReceiptSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fontSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paperWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wifiPassword?: string;
}

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'MM/DD/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: '12h', enum: ['12h', '24h'] })
  @IsOptional()
  @IsEnum(['12h', '24h'])
  timeFormat?: '12h' | '24h';

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'auto', enum: ['light', 'dark', 'auto'] })
  @IsOptional()
  @IsEnum(['light', 'dark', 'auto'])
  theme?: 'light' | 'dark' | 'auto';

  @ApiPropertyOptional({
    example: { email: true, sms: false, push: true },
    description: 'Notification preferences',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;

  @ApiPropertyOptional({
    example: { inventory: true, kitchen: true, reports: true, analytics: false },
    description: 'Feature toggles',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeaturesDto)
  features?: FeaturesDto;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  loyaltyPointsPerCurrency?: number;

  @ApiPropertyOptional({
    example: {
      header: 'Welcome to Our Restaurant',
      footer: 'Thank you for your visit!',
      showLogo: true,
      logoUrl: '',
      fontSize: 12,
      paperWidth: 80,
      wifi: '',
      wifiPassword: '',
    },
    description: 'Company-wide receipt settings (fallback for branches)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptSettingsDto)
  receiptSettings?: ReceiptSettingsDto;

  @ApiPropertyOptional({
    example: {
      showStock: true,
    },
    description: 'POS Settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosSettingsDto)
  posSettings?: PosSettingsDto;
}

export class UpdateCompanySettingsRequestDto extends UpdateCompanySettingsDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;
}

