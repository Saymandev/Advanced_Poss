import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { SubscriptionLimits } from '../schemas/subscription.schema';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  nextBillingDate?: Date;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  // Feature-based subscription update
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledFeatures?: string[];

  // Manual limit overrides (superadmin only)
  @IsObject()
  @IsOptional()
  limits?: Partial<SubscriptionLimits>;
}

