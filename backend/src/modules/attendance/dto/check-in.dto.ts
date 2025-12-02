import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: 'Checked in from home office' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    example: { latitude: 40.7128, longitude: -74.006 },
  })
  @IsOptional()
  @IsObject()
  location?: {
    latitude: number;
    longitude: number;
  };
}

