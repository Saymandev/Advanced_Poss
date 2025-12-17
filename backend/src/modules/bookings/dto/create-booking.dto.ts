import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class AdditionalChargeDto {
  @ApiProperty({ example: 'breakfast' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'Breakfast for 2 guests' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateBookingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  guestPhone: string;

  @ApiPropertyOptional({ example: 'P1234567' })
  @IsOptional()
  @IsString()
  guestIdNumber?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  numberOfGuests: number;

  @ApiProperty({ example: '2024-12-25' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  checkInDate: Date;

  @ApiProperty({ example: '2024-12-27' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  checkOutDate: Date;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  roomRate: number;

  @ApiPropertyOptional({
    type: [AdditionalChargeDto],
    example: [
      {
        type: 'breakfast',
        description: 'Breakfast for 2 guests',
        amount: 500,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceChargeRate?: number;

  @ApiPropertyOptional({ example: 'Late checkout requested' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ example: '2024-12-25T14:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  arrivalTime?: Date;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  lateCheckout?: boolean;

  @ApiPropertyOptional({ example: 'VIP guest' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'pending',
    enum: ['pending', 'partial', 'paid'],
  })
  @IsOptional()
  @IsEnum(['pending', 'partial', 'paid'])
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({
    example: 'pending',
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    description: 'Booking status (used mainly for updates; create uses payment status to derive this)',
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'])
  status?: string;
}

