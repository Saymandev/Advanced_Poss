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
}

