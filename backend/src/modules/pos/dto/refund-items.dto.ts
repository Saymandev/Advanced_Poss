import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class RefundItem {
  @ApiProperty({ description: 'ID of the item being refunded' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ description: 'Quantity being refunded' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'If true, the item is damaged/wasted and will NOT be restored to stock' })
  @IsBoolean()
  @IsOptional()
  isWastage?: boolean;
}

export class RefundItemsDto {
  @ApiProperty({ description: 'List of items to refund' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItem)
  items: RefundItem[];

  @ApiProperty({ description: 'Reason for the refund' })
  @IsString()
  @IsOptional()
  reason?: string;
}
