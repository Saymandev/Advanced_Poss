import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CheckOutDto {
  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  checkedOutBy?: string;

  @ApiPropertyOptional({ example: 'Guest checked out early' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCharges?: number;
}

