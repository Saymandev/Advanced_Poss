import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePurchaseOrderDto {
  @ApiProperty({ example: '507f191e810c19729de860ea' })
  @IsString()
  approvedBy: string;

  @ApiPropertyOptional({ example: 'Looks good' })
  @IsOptional()
  @IsString()
  notes?: string;
}


