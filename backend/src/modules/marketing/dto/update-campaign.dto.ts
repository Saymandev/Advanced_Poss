import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['email', 'sms', 'push', 'loyalty', 'coupon'])
  type?: 'email' | 'sms' | 'push' | 'loyalty' | 'coupon';

  @IsOptional()
  @IsEnum(['all', 'loyalty', 'new', 'inactive', 'segment'])
  target?: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment';

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  scheduledDate?: string;

  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'active', 'completed', 'paused'])
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
}

