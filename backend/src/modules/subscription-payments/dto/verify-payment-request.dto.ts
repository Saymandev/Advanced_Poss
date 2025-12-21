import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentRequestStatus } from '../schemas/subscription-payment-request.schema';

export class VerifyPaymentRequestDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsEnum(PaymentRequestStatus)
  status: PaymentRequestStatus; // 'verified' or 'rejected'

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string; // Required if status is 'rejected'
}

