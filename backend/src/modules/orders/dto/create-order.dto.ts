import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: { name: 'Large', priceModifier: 2 },
  })
  @IsOptional()
  @IsObject()
  selectedVariant?: {
    name: string;
    priceModifier: number;
  };

  @ApiPropertyOptional({
    example: [{ name: 'Extra Cheese', price: 1.5 }],
  })
  @IsOptional()
  @IsArray()
  selectedAddons?: {
    name: string;
    price: number;
  }[];

  @ApiPropertyOptional({ example: 'No onions please' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    enum: ['dine-in', 'takeaway', 'delivery'],
    example: 'dine-in',
  })
  @IsEnum(['dine-in', 'takeaway', 'delivery'])
  type: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439014' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439015' })
  @IsString()
  @IsNotEmpty()
  waiterId: string;

  @ApiProperty({
    type: [OrderItemDto],
    example: [
      {
        menuItemId: '507f1f77bcf86cd799439016',
        quantity: 2,
        selectedVariant: { name: 'Large', priceModifier: 2 },
        selectedAddons: [{ name: 'Extra Cheese', price: 1.5 }],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

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

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'Birthday discount' })
  @IsOptional()
  @IsString()
  discountReason?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({
    example: {
      name: 'John Doe',
      phone: '+1234567890',
      address: '123 Main St',
      instructions: 'Ring the bell',
    },
  })
  @IsOptional()
  @IsObject()
  deliveryInfo?: {
    name: string;
    phone: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    instructions?: string;
  };

  @ApiPropertyOptional({ example: 'Please deliver quickly' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ example: 'VIP customer' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCount?: number;
}

