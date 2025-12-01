import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

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
  @IsObject()
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };

  @ApiPropertyOptional({
    example: { inventory: true, kitchen: true, reports: true, analytics: false },
    description: 'Feature toggles',
  })
  @IsOptional()
  @IsObject()
  features?: {
    inventory?: boolean;
    kitchen?: boolean;
    reports?: boolean;
    analytics?: boolean;
  };
}

export class UpdateCompanySettingsRequestDto extends UpdateCompanySettingsDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;
}

