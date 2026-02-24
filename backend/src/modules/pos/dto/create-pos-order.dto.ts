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
  @IsEnum(['dine-in', 'delivery', 'takeaway', 'room_service'])
  orderType: 'dine-in' | 'delivery' | 'takeaway' | 'room_service';

  @ValidateIf((o) => o.orderType === 'dine-in')
  @IsNotEmpty()
  @IsString()
  tableId?: string;

  @ValidateIf((o) => o.orderType === 'dine-in')
  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCount?: number;

  // Room service: attach order to a specific booking/room
  @ValidateIf((o) => o.orderType === 'room_service')
  @IsNotEmpty()
  @IsString()
  bookingId?: string;

  @ValidateIf((o) => o.orderType === 'room_service')
  @IsNotEmpty()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

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
  @IsString()
  paymentMethod?: string; // Method code or "split"

  @IsOptional()
  @IsString()
  transactionId?: string; // Carry split breakdown string or card auth code

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  waiterId?: string; // Optional waiter/user ID to assign the order to

  @IsOptional()
  @IsString()
  customerId?: string; // Customer ID for loyalty points

  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyPointsRedeemed?: number; // Loyalty points redeemed for this order

  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyDiscount?: number; // Discount amount from loyalty points

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  changeDue?: number;
}

