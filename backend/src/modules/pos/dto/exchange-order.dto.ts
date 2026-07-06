import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class ExchangeReturnedItem {
  @ApiProperty({ description: 'ID of the item being returned' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ description: 'Quantity being returned' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'If true, the item is damaged/wasted and will NOT be restored to stock' })
  @IsBoolean()
  @IsOptional()
  isWastage?: boolean;
}

class ExchangeNewItem {
  @ApiProperty({ description: 'ID of the new item' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ description: 'Quantity of the new item' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class ExchangeOrderDto {
  @ApiProperty({ description: 'List of items being returned' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeReturnedItem)
  returnedItems: ExchangeReturnedItem[];

  @ApiProperty({ description: 'List of new items being taken' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeNewItem)
  newItems: ExchangeNewItem[];

  @ApiProperty({ description: 'Payment method for any balance due from customer' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: 'Reason for the exchange' })
  @IsString()
  @IsOptional()
  reason?: string;
}
