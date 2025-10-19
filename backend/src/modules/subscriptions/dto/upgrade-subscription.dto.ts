import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { BillingCycle, SubscriptionPlan } from '../schemas/subscription.schema';

export class UpgradeSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  newPlan: SubscriptionPlan;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;
}

