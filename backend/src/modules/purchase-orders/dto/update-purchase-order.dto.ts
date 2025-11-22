import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

class UpdatePurchaseOrderItemDto {
  @ApiPropertyOptional({ example: 'item-id-123' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: '507f191e810c19729de860ea' })
  @IsOptional()
  @IsString()
  ingredientId?: string;

  @ApiPropertyOptional({ example: 10 })
  quantity?: number;

  @ApiPropertyOptional({ example: 5.5 })
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['items'] as const),
) {
  @ApiPropertyOptional({ type: [UpdatePurchaseOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseOrderItemDto)
  items?: UpdatePurchaseOrderItemDto[];
}


