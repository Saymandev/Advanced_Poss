import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
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
}

