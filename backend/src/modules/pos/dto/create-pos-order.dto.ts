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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class POSOrderItemDto {
  @IsNotEmpty()
  @IsString()
  menuItemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class DeliveryDetailsDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  assignedDriver?: string;

  @IsOptional()
  @IsString()
  zoneId?: string; // Delivery zone ID
}

export class CreatePOSOrderDto {
  @IsNotEmpty()
  @IsEnum(['dine-in', 'delivery', 'takeaway'])
  orderType: 'dine-in' | 'delivery' | 'takeaway';

  @ValidateIf((o) => o.orderType === 'dine-in')
  @IsNotEmpty()
  @IsString()
  tableId?: string;

  @ValidateIf((o) => o.orderType === 'dine-in')
  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCount?: number;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  deliveryDetails?: DeliveryDetailsDto;

  @ValidateIf((o) => o.orderType === 'takeaway')
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  takeawayDetails?: DeliveryDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POSOrderItemDto)
  items: POSOrderItemDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNotEmpty()
  @IsEnum(['pending', 'paid', 'cancelled'])
  status: string;

  @IsOptional()
  @IsEnum(['cash', 'card', 'split'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  waiterId?: string; // Optional waiter/user ID to assign the order to
}

