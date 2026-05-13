import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StockAdjustmentDto {
  @ApiProperty({
    enum: ['add', 'remove', 'set', 'wastage'],
    example: 'add',
  })
  @IsEnum(['add', 'remove', 'set', 'wastage'])
  type: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'Purchase from supplier' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: '60f1a2b3c4d5e6f7a8b9c0d1' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

