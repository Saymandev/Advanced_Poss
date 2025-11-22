import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelPurchaseOrderDto {
  @ApiPropertyOptional({ example: 'Supplier delayed shipment' })
  @IsOptional()
  @IsString()
  reason?: string;
}


