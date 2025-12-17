import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  checkedInBy?: string;

  @ApiPropertyOptional({ example: 'Guest arrived early' })
  @IsOptional()
  @IsString()
  notes?: string;
}

