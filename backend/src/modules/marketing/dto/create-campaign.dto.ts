import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(['email', 'sms', 'push', 'loyalty', 'coupon'])
  type: 'email' | 'sms' | 'push' | 'loyalty' | 'coupon';

  @IsNotEmpty()
  @IsEnum(['all', 'loyalty', 'new', 'inactive', 'segment'])
  target: 'all' | 'loyalty' | 'new' | 'inactive' | 'segment';

  @ValidateIf((o) => o.target === 'segment')
  @IsNotEmpty()
  @IsString()
  segment?: string;

  @ValidateIf((o) => o.type === 'email')
  @IsNotEmpty()
  @IsString()
  subject?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  scheduledDate?: string;
}

