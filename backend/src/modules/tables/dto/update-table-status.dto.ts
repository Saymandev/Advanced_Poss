import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    example: 'occupied',
  })
  @IsEnum(['available', 'occupied', 'reserved', 'cleaning'])
  status: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  occupiedBy?: string;
}

