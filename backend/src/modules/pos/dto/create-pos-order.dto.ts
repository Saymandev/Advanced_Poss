import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

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

export class CreatePOSOrderDto {
  @IsNotEmpty()
  @IsString()
  tableId: string;

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
}

