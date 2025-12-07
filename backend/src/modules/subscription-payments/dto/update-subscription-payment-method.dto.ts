import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionPaymentMethodDto } from './create-subscription-payment-method.dto';

export class UpdateSubscriptionPaymentMethodDto extends PartialType(CreateSubscriptionPaymentMethodDto) {}

