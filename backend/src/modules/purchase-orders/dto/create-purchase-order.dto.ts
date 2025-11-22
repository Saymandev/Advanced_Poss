import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

class PurchaseOrderItemDto {
  @ApiProperty({ example: '507f191e810c19729de860ea' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 'Needs refrigeration' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: '507f191e810c19729de860ea' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ example: '507f191e810c19729de860eb' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: '507f191e810c19729de860ec' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ example: '2025-11-17T00:00:00.000Z' })
  @IsDateString()
  expectedDeliveryDate: string;

  @ApiPropertyOptional({ example: 'Please deliver before noon' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
