import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'T-05' })
  @IsString()
  @IsNotEmpty()
  tableNumber: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: 'Indoor' })
  @IsOptional()
  @IsString()
  location?: string;
}

