import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'premium' })
  @IsString()
  @IsNotEmpty()
  planName: string;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'premium' })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty({ example: 'https://yourapp.com/payment/success', required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ example: 'https://yourapp.com/payment/cancel', required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'pi_1234567890' })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
