import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SmsDigitalReceiptDto {
  @ApiProperty({ description: 'Customer phone number to send the SMS to' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
